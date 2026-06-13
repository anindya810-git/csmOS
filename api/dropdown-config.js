import supabase from './_utils/supabase.js';
import { verifyToken } from './_utils/auth.js';
import { setCors } from './_utils/cors.js';
import { callAI, AI_SECTIONS, DEFAULT_MODELS, PROVIDERS } from './_utils/ai.js';

const PROMPT_KEYS = Object.keys(AI_SECTIONS); // account_summary, account_escalations, account_issues, ...

// ai_config is a flat key/value table: provider, key_<p>, model_<p>, prompt_<section>.
async function loadAiConfig() {
  const { data } = await supabase.from('ai_config').select('key, value');
  const map = {};
  (data || []).forEach(r => { map[r.key] = r.value; });
  return map;
}

// Frontend-safe view of the AI config — never includes raw keys.
function publicAiConfig(map) {
  const providers = {};
  const models = {};
  for (const p of PROVIDERS) {
    providers[p] = !!(map[`key_${p}`] && map[`key_${p}`].trim());
    models[p] = map[`model_${p}`] || DEFAULT_MODELS[p];
  }
  const prompts = {};
  for (const k of PROMPT_KEYS) prompts[k] = map[`prompt_${k}`] || '';
  const provider = map.provider || '';
  return { provider, enabled: !!providers[provider], providers, models, prompts };
}

function fmtDate(s) {
  if (!s) return '';
  try { const d = new Date(s); return isNaN(d) ? String(s) : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return String(s); }
}

function clip(s, n = 400) {
  if (s == null) return '';
  const t = String(s).replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n) + '…' : t;
}

function issueLine(i) {
  return `- [${i.priority || '–'}] ${clip(i.description, 200)} | type: ${i.issue_type || '–'}${i.issue_sub_type ? '/' + i.issue_sub_type : ''} | status: ${i.status || '–'} | owner: ${i.owner_team || '–'} | CSM: ${i.csm || '–'}${i.reported_date ? ' | reported ' + fmtDate(i.reported_date) : ''}${i.next_steps ? ' | next: ' + clip(i.next_steps, 120) : ''}`;
}

function escLine(e) {
  return `- ${clip(e.description, 200)} | status: ${e.status || '–'} | ownership: ${e.ownership || '–'} | CSM: ${e.csm || '–'}${e.date_of_escalation ? ' | on ' + fmtDate(e.date_of_escalation) : ''}${e.eta ? ' | ETA ' + fmtDate(e.eta) : ''}${e.action_taken ? ' | action: ' + clip(e.action_taken, 120) : ''}`;
}

function accountHeader(a) {
  return [
    `Account: ${a.account_name || '–'} (tenant ${a.tenant_id || '–'})`,
    `Industry: ${a.industry || '–'} | Region: ${a.region || '–'}`,
    `MRR: ${a.mrr != null ? a.mrr : '–'} (${a.mrr_tier || '–'}) | Renewal: ${fmtDate(a.renewal_date)} (${a.renewal_status || '–'})`,
    `RAG: ${a.rag_status || '–'}${a.rag_reason ? ' — ' + clip(a.rag_reason, 200) : ''}`,
    `Adoption: ${a.adoption_score ?? '–'} | Stickiness: ${a.stickiness_score ?? '–'} | Churn risk: ${a.churn_risk || '–'} | Churn status: ${a.churn_status || '–'}`,
    `CSM: ${a.csm || '–'} | CSM Lead: ${a.csm_lead || '–'} | Go-live: ${fmtDate(a.golive_date)}`,
    a.actions_taken ? `Actions taken: ${clip(a.actions_taken, 300)}` : '',
  ].filter(Boolean).join('\n');
}

// Gather authoritative context for a section and return the user-prompt text.
// Returns { user, persist? } where persist describes the write-back target.
async function buildContext(section, body, user, csmName) {
  if (section === 'account_summary' || section === 'account_escalations' || section === 'account_issues') {
    const accountId = body.account_id;
    if (!accountId) throw new Error('account_id required');
    const { data: account } = await supabase.from('accounts').select('*').eq('id', accountId).maybeSingle();
    if (!account) throw new Error('Account not found');
    if (user.role === 'csm' && account.csm !== csmName) { const e = new Error('Access denied'); e.code = 403; throw e; }

    if (section === 'account_escalations') {
      const { data: escalations } = await supabase.from('escalations').select('*').eq('account_id', accountId).order('date_of_escalation', { ascending: false }).limit(60);
      const escTxt = (escalations || []).length ? (escalations || []).map(escLine).join('\n') : '(none)';
      return {
        user: `Account: ${account.account_name || '–'}\n\nESCALATIONS (${(escalations || []).length}):\n${escTxt}`,
        persist: { table: 'accounts', id: accountId, col: 'ai_escalations_summary' },
      };
    }

    if (section === 'account_issues') {
      const { data: issues } = await supabase.from('issues').select('*').eq('account_id', accountId).order('reported_date', { ascending: false }).limit(60);
      const issTxt = (issues || []).length ? (issues || []).map(issueLine).join('\n') : '(none)';
      return {
        user: `Account: ${account.account_name || '–'}\n\nISSUES (${(issues || []).length}):\n${issTxt}`,
        persist: { table: 'accounts', id: accountId, col: 'ai_issues_summary' },
      };
    }

    // account_summary — needs the full picture
    const [{ data: issues }, { data: escalations }, { data: tasks }] = await Promise.all([
      supabase.from('issues').select('*').eq('account_id', accountId).order('reported_date', { ascending: false }).limit(40),
      supabase.from('escalations').select('*').eq('account_id', accountId).order('date_of_escalation', { ascending: false }).limit(40),
      supabase.from('tasks').select('task_subject, status, due_date, nature_of_task').eq('account_id', accountId).order('due_date', { ascending: false }).limit(20),
    ]);
    const escTxt = (escalations || []).length ? (escalations || []).map(escLine).join('\n') : '(none)';
    const issTxt = (issues || []).length ? (issues || []).map(issueLine).join('\n') : '(none)';
    const openTasks = (tasks || []).filter(t => t.status !== 'Completed');
    const taskTxt = openTasks.length ? openTasks.map(t => `- ${t.task_subject} (${t.status}${t.due_date ? ', due ' + fmtDate(t.due_date) : ''})`).join('\n') : '(none open)';
    return {
      user: `${accountHeader(account)}\n\nESCALATIONS (${(escalations || []).length}):\n${escTxt}\n\nISSUES (${(issues || []).length}):\n${issTxt}\n\nOPEN TASKS:\n${taskTxt}`,
      persist: { table: 'accounts', id: accountId, col: 'ai_summary' },
    };
  }

  if (section === 'feature_request') {
    const frId = body.feature_request_id;
    if (!frId) throw new Error('feature_request_id required');
    const { data: fr } = await supabase.from('feature_requests').select('*, feature_request_links(*)').eq('id', frId).maybeSingle();
    if (!fr) throw new Error('Feature request not found');
    const links = fr.feature_request_links || [];
    const escIds = links.filter(l => l.link_type === 'escalation').map(l => l.linked_id);
    const issIds = links.filter(l => l.link_type === 'issue').map(l => l.linked_id);
    const acctIds = [...new Set(links.map(l => l.account_id).filter(Boolean))];
    const [{ data: escs }, { data: isss }, { data: accts }] = await Promise.all([
      escIds.length ? supabase.from('escalations').select('*').in('id', escIds) : Promise.resolve({ data: [] }),
      issIds.length ? supabase.from('issues').select('*').in('id', issIds) : Promise.resolve({ data: [] }),
      acctIds.length ? supabase.from('accounts').select('account_name, mrr, rag_status, region, industry').in('id', acctIds) : Promise.resolve({ data: [] }),
    ]);
    const acctTxt = (accts || []).length ? (accts || []).map(a => `- ${a.account_name} | MRR ${a.mrr ?? '–'} | RAG ${a.rag_status || '–'} | ${a.region || '–'}`).join('\n') : '(none)';
    return {
      user: `FEATURE REQUEST: ${fr.title}\nPriority (current): ${fr.priority || '–'} | Related to: ${fr.related_to || '–'}\nDescription: ${clip(fr.description, 500)}\n\nLINKED ACCOUNTS (${(accts || []).length}):\n${acctTxt}\n\nLINKED ESCALATIONS (${(escs || []).length}):\n${(escs || []).map(escLine).join('\n') || '(none)'}\n\nLINKED ISSUES (${(isss || []).length}):\n${(isss || []).map(issueLine).join('\n') || '(none)'}`,
      persist: { table: 'feature_requests', id: frId, col: 'ai_recommendation' },
    };
  }

  if (section === 'rag') {
    const band = body.rag;
    if (!['Red', 'Amber', 'Green'].includes(band)) throw new Error('rag band required (Red/Amber/Green)');
    let q = supabase.from('accounts').select('account_name, mrr, region, industry, csm, rag_reason, renewal_date, renewal_status, churn_risk').eq('rag_status', band).limit(80);
    if (user.role === 'csm') q = q.eq('csm', csmName);
    const { data: accts } = await q;
    const total = (accts || []).reduce((s, a) => s + (a.mrr || 0), 0);
    const lines = (accts || []).map(a => `- ${a.account_name} | MRR ${a.mrr ?? '–'} | ${a.region || '–'} | CSM ${a.csm || '–'} | renewal ${fmtDate(a.renewal_date)} (${a.renewal_status || '–'})${a.rag_reason ? ' | reason: ' + clip(a.rag_reason, 160) : ''}`).join('\n');
    return { user: `RAG BAND: ${band}\nAccounts: ${(accts || []).length} | Combined MRR: ${total}\n\n${lines || '(no accounts)'}` };
  }

  if (section === 'issues_overview') {
    const issues = Array.isArray(body.issues) ? body.issues.slice(0, 80) : [];
    if (!issues.length) throw new Error('No issues in view');
    return { user: `ISSUES IN VIEW (${issues.length}):\n${issues.map(issueLine).join('\n')}` };
  }

  if (section === 'escalations_overview') {
    const escalations = Array.isArray(body.escalations) ? body.escalations.slice(0, 80) : [];
    if (!escalations.length) throw new Error('No escalations in view');
    return { user: `ESCALATIONS IN VIEW (${escalations.length}):\n${escalations.map(escLine).join('\n')}` };
  }

  if (section === 'issue_next_steps' || section === 'escalation_next_steps') {
    const isIssue = section === 'issue_next_steps';
    const item = body.item;
    if (!item) throw new Error('item required');
    if (user.role === 'csm' && item.csm && item.csm !== csmName) { const e = new Error('Access denied'); e.code = 403; throw e; }
    const text = isIssue ? issueLine(item) : escLine(item);
    const acct = item.account_name ? `Account: ${item.account_name}\n` : '';
    return {
      user: `${acct}${isIssue ? 'ISSUE' : 'ESCALATION'}:\n${text}`,
      persist: item.id ? { table: isIssue ? 'issues' : 'escalations', id: item.id, col: 'ai_next_steps' } : null,
    };
  }

  throw new Error(`Unknown AI section: ${section}`);
}

async function handleGenerate(req, res, user) {
  const body = req.body || {};
  const section = body.section;
  const def = AI_SECTIONS[section];
  if (!def) return res.status(400).json({ error: 'Unknown AI section' });

  const cfg = await loadAiConfig();
  const provider = cfg.provider;
  if (!provider || !PROVIDERS.includes(provider)) return res.status(400).json({ error: 'No AI provider configured' });
  const key = cfg[`key_${provider}`];
  if (!key) return res.status(400).json({ error: `No API key set for ${provider}` });
  const model = cfg[`model_${provider}`] || DEFAULT_MODELS[provider];

  let csmName = null;
  if (user.role === 'csm') {
    const { data: u } = await supabase.from('users').select('csm_name').eq('id', user.id).maybeSingle();
    csmName = u?.csm_name ?? null;
  }

  let ctx;
  try { ctx = await buildContext(section, body, user, csmName); }
  catch (e) { return res.status(e.code === 403 ? 403 : 400).json({ error: e.message || 'Could not build context' }); }

  const custom = (cfg[`prompt_${section}`] || '').trim();
  const system = custom ? `${def.system}\n\nAdditional instructions from the administrator:\n${custom}` : def.system;

  let text;
  try {
    text = await callAI({ provider, key, model, system, user: ctx.user, maxTokens: def.maxTokens });
  } catch (e) {
    const msg = /aborted/i.test(e.message || '') ? 'AI request timed out (try a faster model or smaller scope)' : (e.message || 'AI request failed');
    return res.status(502).json({ error: msg });
  }
  if (!text) return res.status(502).json({ error: 'AI returned an empty response' });

  const generated_at = new Date().toISOString();
  if (ctx.persist) {
    const { table, id, col } = ctx.persist;
    await supabase.from(table).update({ [col]: text, [`${col}_at`]: generated_at, [`${col}_by`]: user.name || null }).eq('id', id);
  }
  return res.json({ text, generated_at });
}

async function handleAiSave(req, res) {
  const { provider, keys, clear, models, prompts } = req.body || {};
  const rows = [];
  if (provider !== undefined) rows.push({ key: 'provider', value: provider || '' });
  if (keys && typeof keys === 'object') {
    for (const p of PROVIDERS) if (keys[p]) rows.push({ key: `key_${p}`, value: String(keys[p]) });
  }
  if (models && typeof models === 'object') {
    for (const p of PROVIDERS) if (models[p] !== undefined) rows.push({ key: `model_${p}`, value: String(models[p] || '') });
  }
  if (prompts && typeof prompts === 'object') {
    for (const k of PROMPT_KEYS) if (prompts[k] !== undefined) rows.push({ key: `prompt_${k}`, value: String(prompts[k] || '') });
  }
  if (rows.length) {
    const { error } = await supabase.from('ai_config').upsert(rows, { onConflict: 'key' });
    if (error) return res.status(500).json({ error: error.message });
  }
  // Explicitly clear listed provider keys.
  if (Array.isArray(clear) && clear.length) {
    const keysToClear = clear.filter(p => PROVIDERS.includes(p)).map(p => `key_${p}`);
    if (keysToClear.length) await supabase.from('ai_config').delete().in('key', keysToClear);
  }
  const map = await loadAiConfig();
  return res.json({ ai: publicAiConfig(map) });
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  let user;
  try { user = verifyToken(req); } catch { return res.status(401).json({ error: 'Unauthorized' }); }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('dropdown_config')
      .select('*')
      .order('sort_order')
      .order('value');
    if (error) return res.status(500).json({ error: error.message });
    const grouped = {};
    data.forEach(row => {
      if (!grouped[row.field_name]) grouped[row.field_name] = [];
      grouped[row.field_name].push(row);
    });
    // Attach sanitized AI config (no raw keys) so the UI can enable/grey AI.
    try { grouped.__ai = publicAiConfig(await loadAiConfig()); } catch { grouped.__ai = publicAiConfig({}); }
    return res.json(grouped);
  }

  // AI generation is available to any authenticated user (they can already
  // see the underlying data); it runs before the admin gate.
  if (req.method === 'POST' && req.body?.action === 'ai_generate') {
    return handleGenerate(req, res, user);
  }

  const isAdmin = user.role === 'admin';
  const isCxStrategy = user.role === 'cx_strategy';
  if (!isAdmin && !isCxStrategy) return res.status(403).json({ error: 'Admin only' });

  // Saving AI provider/keys/prompts is admin-only.
  if (req.method === 'POST' && req.body?.action === 'ai_save') {
    if (!isAdmin) return res.status(403).json({ error: 'Admin only' });
    return handleAiSave(req, res);
  }

  const CX_ALLOWED = new Set([
    'escalation_status','ownership','escalated_by','ps_leader','trigger_reason',
    'source_of_escalation','issue_type','issue_sub_type','mrr_tier','rag_status',
    'billing_frequency','renewal_status','churn_status','contraction_risk','churn_risk',
    'implementation_status','nature_of_task','fr_related_to',
  ]);

  if (req.method === 'POST') {
    const { field_name, value, parent_value, sort_order } = req.body;
    if (!field_name || !value) return res.status(400).json({ error: 'field_name and value are required' });
    if (isCxStrategy && !CX_ALLOWED.has(field_name)) return res.status(403).json({ error: 'Not permitted' });
    const { data, error } = await supabase
      .from('dropdown_config')
      .insert({ field_name, value, parent_value: parent_value || null, sort_order: sort_order || 0 })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id required' });

  if (isCxStrategy) {
    const { data: row } = await supabase
      .from('dropdown_config').select('field_name').eq('id', id).maybeSingle();
    if (!row || !CX_ALLOWED.has(row.field_name))
      return res.status(403).json({ error: 'Not permitted' });
  }

  if (req.method === 'PUT') {
    const { value, parent_value, sort_order } = req.body;
    const updates = {};
    if (value !== undefined) updates.value = value;
    if (parent_value !== undefined) updates.parent_value = parent_value || null;
    if (sort_order !== undefined) updates.sort_order = sort_order;
    const { data, error } = await supabase
      .from('dropdown_config')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase.from('dropdown_config').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
