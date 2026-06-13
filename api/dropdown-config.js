import supabase from './_utils/supabase.js';
import { verifyToken } from './_utils/auth.js';
import { setCors } from './_utils/cors.js';
import { callAI, AI_SECTIONS, DEFAULT_MODELS, PROVIDERS } from './_utils/ai.js';

const PROMPT_KEYS = Object.keys(AI_SECTIONS); // account_summary, account_escalations, account_issues, ...

// ai_config is a flat key/value table: provider, key_<p>, model_<p>, prompt_<section>.
async function loadAiConfig(orgId = 1) {
  const { data } = await supabase.from('ai_config').select('key, value').eq('org_id', orgId);
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
  const orgId = user.org_id || 1;
  if (section === 'account_summary' || section === 'account_escalations' || section === 'account_issues') {
    const accountId = body.account_id;
    if (!accountId) throw new Error('account_id required');
    const { data: account } = await supabase.from('accounts').select('*').eq('id', accountId).eq('org_id', orgId).maybeSingle();
    if (!account) throw new Error('Account not found');
    if (user.role === 'csm' && account.csm !== csmName) { const e = new Error('Access denied'); e.code = 403; throw e; }

    if (section === 'account_escalations') {
      const { data: escalations } = await supabase.from('escalations').select('*').eq('account_id', accountId).eq('org_id', orgId).order('date_of_escalation', { ascending: false }).limit(60);
      const escTxt = (escalations || []).length ? (escalations || []).map(escLine).join('\n') : '(none)';
      return {
        user: `Account: ${account.account_name || '–'}\n\nESCALATIONS (${(escalations || []).length}):\n${escTxt}`,
        persist: { table: 'accounts', id: accountId, col: 'ai_escalations_summary' },
      };
    }

    if (section === 'account_issues') {
      const { data: issues } = await supabase.from('issues').select('*').eq('account_id', accountId).eq('org_id', orgId).order('reported_date', { ascending: false }).limit(60);
      const issTxt = (issues || []).length ? (issues || []).map(issueLine).join('\n') : '(none)';
      return {
        user: `Account: ${account.account_name || '–'}\n\nISSUES (${(issues || []).length}):\n${issTxt}`,
        persist: { table: 'accounts', id: accountId, col: 'ai_issues_summary' },
      };
    }

    // account_summary — needs the full picture
    const [{ data: issues }, { data: escalations }, { data: tasks }] = await Promise.all([
      supabase.from('issues').select('*').eq('account_id', accountId).eq('org_id', orgId).order('reported_date', { ascending: false }).limit(40),
      supabase.from('escalations').select('*').eq('account_id', accountId).eq('org_id', orgId).order('date_of_escalation', { ascending: false }).limit(40),
      supabase.from('tasks').select('task_subject, status, due_date, nature_of_task').eq('account_id', accountId).eq('org_id', orgId).order('due_date', { ascending: false }).limit(20),
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
    let q = supabase.from('accounts').select('account_name, mrr, region, industry, csm, rag_reason, renewal_date, renewal_status, churn_risk').eq('rag_status', band).eq('org_id', orgId).limit(80);
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

  const orgId = user.org_id || 1;
  const cfg = await loadAiConfig(orgId);
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

// Whitelisted fields per entity — prevents arbitrary column selection (security).
const ALLOWED_FIELDS = {
  accounts: new Set(['id','account_name','tenant_id','csm','csm_lead','rag_status','region','industry','mrr','mrr_tier','renewal_date','golive_date','adoption_score','stickiness_score']),
  issues: new Set(['id','account_name','priority','issue_type','issue_sub_type','owner_team','status','reported_date','closure_date','csm','csm_lead','description']),
  escalations: new Set(['id','account_name','date_of_escalation','month','status','csm','ownership','trigger_reason','issue_type','escalated_by','description','source_of_escalation']),
  tasks: new Set(['id','task_subject','nature_of_task','account_name','assigned_to','assigned_by','due_date','status']),
};

async function handleRunReport(req, res, user) {
  const cfg = req.body?.run_config || {};
  const { primaryEntity, columns = [], filters = [], groupBy, aggregation, sortBy, sortDir, limit } = cfg;
  const orgId = user.org_id || 1;

  const TABLE_MAP = { accounts: 'accounts', issues: 'issues', escalations: 'escalations', tasks: 'tasks' };
  if (!TABLE_MAP[primaryEntity]) return res.status(400).json({ error: 'Invalid entity' });

  const primaryAllowed = ALLOWED_FIELDS[primaryEntity];
  const accountAllowed = ALLOWED_FIELDS.accounts;

  // Partition columns by source
  const primaryCols     = columns.filter(c => c.entity === primaryEntity && primaryAllowed.has(c.field));
  const accountJoinCols = primaryEntity !== 'accounts'
    ? columns.filter(c => c.entity === 'accounts' && accountAllowed.has(c.field))
    : [];
  const computedCols    = primaryEntity === 'accounts'
    ? columns.filter(c => c.entity === 'accounts_computed')
    : [];

  if (!primaryCols.length && !accountJoinCols.length && !computedCols.length && !groupBy)
    return res.status(400).json({ error: 'No valid columns selected' });

  // Build Supabase select string (always include id for computed-field lookup)
  const primarySelect = [...new Set(['id', ...primaryCols.map(c => c.field)])].join(',');
  let selectStr = primarySelect;
  if (accountJoinCols.length > 0) {
    const accSelect = [...new Set(['id', ...accountJoinCols.map(c => c.field)])].join(',');
    selectStr += `,accounts(${accSelect})`;
  }
  // For chart groupBy on a primary field, ensure it's fetched
  if (groupBy && groupBy.entity === primaryEntity && primaryAllowed.has(groupBy.field)) {
    selectStr = [...new Set([...selectStr.split(','), groupBy.field])].join(',');
  }

  let q = supabase.from(primaryEntity).select(selectStr).eq('org_id', orgId);

  // Apply primary-entity filters server-side
  const serverFilters = filters.filter(f => f.entity === primaryEntity && primaryAllowed.has(f.field));
  for (const f of serverFilters) {
    if (f.values?.length > 0) q = q.in(f.field, f.values.map(String));
  }

  // CSM role: restrict to own data
  if (user.role === 'csm' && primaryAllowed.has('csm')) {
    const { data: u } = await supabase.from('users').select('csm_name').eq('id', user.id).maybeSingle();
    if (u?.csm_name) q = q.eq('csm', u.csm_name);
  }

  // Sort (primary-entity fields only — joined fields can't be sorted server-side here)
  if (sortBy?.entity === primaryEntity && primaryAllowed.has(sortBy?.field)) {
    q = q.order(sortBy.field, { ascending: sortDir !== 'desc' });
  }
  q = q.limit(Math.min(Number(limit) || 500, 1000));

  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });

  // Flatten: primary fields + joined account fields (keyed as account__field)
  let rows = (data || []).map(row => {
    const flat = {};
    primaryCols.forEach(c => { flat[c.field] = row[c.field] ?? null; });
    if (accountJoinCols.length > 0) {
      const acct = row.accounts;
      const isObj = acct && typeof acct === 'object' && !Array.isArray(acct);
      accountJoinCols.forEach(c => {
        const fk = c.flatKey || ('account__' + c.field);
        flat[fk] = isObj ? (acct[c.field] ?? null) : null;
      });
    }
    return flat;
  });

  // Account-side filters applied client-side after flatten (only when primary ≠ accounts)
  if (primaryEntity !== 'accounts') {
    const clientFilters = filters.filter(f => f.entity === 'accounts' && accountAllowed.has(f.field));
    for (const f of clientFilters) {
      if (f.values?.length > 0) {
        const fk = f.flatKey || ('account__' + f.field);
        rows = rows.filter(r => f.values.map(String).includes(String(r[fk] ?? '')));
      }
    }
  }

  // Computed metrics (accounts primary only) — parallel count queries
  if (computedCols.length > 0 && (data || []).length > 0) {
    const accountIds = (data || []).map(r => r.id).filter(Boolean);
    const cd = {};
    const needs = key => computedCols.some(c => c.field === key);
    const countQueries = [];

    if (needs('issues_count') || needs('open_issues_count')) {
      countQueries.push(supabase.from('issues').select('account_id,status').eq('org_id', orgId).in('account_id', accountIds).then(({ data: d }) => {
        (d||[]).forEach(r => {
          if (!cd[r.account_id]) cd[r.account_id] = {};
          cd[r.account_id].issues_count = (cd[r.account_id].issues_count || 0) + 1;
          if (r.status === 'Open') cd[r.account_id].open_issues_count = (cd[r.account_id].open_issues_count || 0) + 1;
        });
      }));
    }
    if (needs('escalations_count') || needs('open_escalations_count')) {
      countQueries.push(supabase.from('escalations').select('account_id,status').eq('org_id', orgId).in('account_id', accountIds).then(({ data: d }) => {
        (d||[]).forEach(r => {
          if (!cd[r.account_id]) cd[r.account_id] = {};
          cd[r.account_id].escalations_count = (cd[r.account_id].escalations_count || 0) + 1;
          if (r.status === 'Open') cd[r.account_id].open_escalations_count = (cd[r.account_id].open_escalations_count || 0) + 1;
        });
      }));
    }
    if (needs('tasks_count') || needs('open_tasks_count')) {
      countQueries.push(supabase.from('tasks').select('account_id,status').eq('org_id', orgId).in('account_id', accountIds).then(({ data: d }) => {
        (d||[]).forEach(r => {
          if (!cd[r.account_id]) cd[r.account_id] = {};
          cd[r.account_id].tasks_count = (cd[r.account_id].tasks_count || 0) + 1;
          if (r.status === 'Open') cd[r.account_id].open_tasks_count = (cd[r.account_id].open_tasks_count || 0) + 1;
        });
      }));
    }
    await Promise.all(countQueries);

    rows = rows.map((row, i) => {
      const accId = (data || [])[i]?.id;
      const extra = (accId && cd[accId]) || {};
      const result = { ...row };
      computedCols.forEach(c => { result[c.field] = extra[c.field] ?? 0; });
      return result;
    });
  }

  // Chart / KPI aggregation
  const groupByFlatKey = groupBy
    ? (groupBy.flatKey || (groupBy.entity === primaryEntity ? groupBy.field : 'account__' + groupBy.field))
    : null;

  if (groupByFlatKey && aggregation?.type) {
    const aggFlatKey = aggregation.type !== 'count' && aggregation.field
      ? (aggregation.flatKey || (aggregation.entity === primaryEntity ? aggregation.field : 'account__' + aggregation.field))
      : null;
    const groups = {};
    for (const row of rows) {
      const key = String(row[groupByFlatKey] ?? '(blank)');
      if (!groups[key]) groups[key] = { label: key, count: 0, sum: 0, vals: [] };
      groups[key].count++;
      if (aggFlatKey) { const n = Number(row[aggFlatKey]); if (!isNaN(n)) { groups[key].sum += n; groups[key].vals.push(n); } }
    }
    rows = Object.values(groups).map(g => ({
      [groupByFlatKey]: g.label,
      value: aggregation.type === 'sum' ? g.sum
        : aggregation.type === 'avg' ? (g.vals.length ? Math.round(g.sum / g.vals.length * 100) / 100 : 0)
        : g.count,
    })).sort((a, b) => b.value - a.value);
  }

  return res.json({ rows, total: (data || []).length });
}

async function handleCustomReports(req, res, user) {
  const orgId = user.org_id || 1;

  if (req.method === 'GET') {
    let q = supabase.from('custom_reports').select('*').eq('org_id', orgId).order('updated_at', { ascending: false });
    if (user.role !== 'admin') q = q.or(`created_by_id.eq.${user.id},is_public.eq.true`);
    let { data, error } = await q;
    // Pre-migration fallback: org_id column not yet added
    if (error?.code === '42703') {
      let q2 = supabase.from('custom_reports').select('*').order('updated_at', { ascending: false });
      if (user.role !== 'admin') q2 = q2.or(`created_by_id.eq.${user.id},is_public.eq.true`);
      ({ data, error } = await q2);
    }
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  }

  if (req.method === 'POST' && req.body?.run_config) {
    return handleRunReport(req, res, user);
  }

  if (req.method === 'POST') {
    const { name, description, config, is_public } = req.body || {};
    if (!name || !config) return res.status(400).json({ error: 'name and config required' });
    let { data, error } = await supabase
      .from('custom_reports')
      .insert({ org_id: orgId, name, description: description || '', config, is_public: !!is_public, created_by: user.name || user.email || '', created_by_id: user.id || null })
      .select().single();
    // Pre-migration fallback
    if (error?.code === '42703') {
      ({ data, error } = await supabase
        .from('custom_reports')
        .insert({ name, description: description || '', config, is_public: !!is_public, created_by: user.name || user.email || '', created_by_id: user.id || null })
        .select().single());
    }
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  const id = req.query.id || req.body?.id;
  if (!id) return res.status(400).json({ error: 'id required' });

  const { data: existing } = await supabase.from('custom_reports').select('created_by_id').eq('id', id).eq('org_id', orgId).maybeSingle();
  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (user.role !== 'admin' && existing.created_by_id !== user.id) return res.status(403).json({ error: 'Forbidden' });

  if (req.method === 'PUT') {
    const { name, description, config, is_public } = req.body || {};
    const updates = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (config !== undefined) updates.config = config;
    if (is_public !== undefined) updates.is_public = !!is_public;
    const { data, error } = await supabase.from('custom_reports').update(updates).eq('id', id).eq('org_id', orgId).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase.from('custom_reports').delete().eq('id', id).eq('org_id', orgId);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleAiSave(req, res, user) {
  const orgId = user.org_id || 1;
  const { provider, keys, clear, models, prompts } = req.body || {};
  const rows = [];
  if (provider !== undefined) rows.push({ org_id: orgId, key: 'provider', value: provider || '' });
  if (keys && typeof keys === 'object') {
    for (const p of PROVIDERS) if (keys[p]) rows.push({ org_id: orgId, key: `key_${p}`, value: String(keys[p]) });
  }
  if (models && typeof models === 'object') {
    for (const p of PROVIDERS) if (models[p] !== undefined) rows.push({ org_id: orgId, key: `model_${p}`, value: String(models[p] || '') });
  }
  if (prompts && typeof prompts === 'object') {
    for (const k of PROMPT_KEYS) if (prompts[k] !== undefined) rows.push({ org_id: orgId, key: `prompt_${k}`, value: String(prompts[k] || '') });
  }
  if (rows.length) {
    const { error } = await supabase.from('ai_config').upsert(rows, { onConflict: 'org_id,key' });
    if (error) return res.status(500).json({ error: error.message });
  }
  // Explicitly clear listed provider keys.
  if (Array.isArray(clear) && clear.length) {
    const keysToClear = clear.filter(p => PROVIDERS.includes(p)).map(p => `key_${p}`);
    if (keysToClear.length) await supabase.from('ai_config').delete().in('key', keysToClear).eq('org_id', orgId);
  }
  const map = await loadAiConfig(orgId);
  return res.json({ ai: publicAiConfig(map) });
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  let user;
  try { user = verifyToken(req); } catch { return res.status(401).json({ error: 'Unauthorized' }); }

  const orgId = user.org_id || 1;

  if (req.method === 'GET') {
    let { data, error } = await supabase
      .from('dropdown_config')
      .select('*')
      .eq('org_id', orgId)
      .order('sort_order')
      .order('value');
    // Pre-migration: org_id column doesn't exist yet — fall back to unscoped query
    if (error?.code === '42703') {
      ({ data, error } = await supabase
        .from('dropdown_config')
        .select('*')
        .order('sort_order')
        .order('value'));
    }
    if (error) return res.status(500).json({ error: error.message });
    const grouped = {};
    data.forEach(row => {
      if (!grouped[row.field_name]) grouped[row.field_name] = [];
      grouped[row.field_name].push(row);
    });
    // Attach sanitized AI config (no raw keys) so the UI can enable/grey AI.
    try { grouped.__ai = publicAiConfig(await loadAiConfig(orgId)); } catch { grouped.__ai = publicAiConfig({}); }
    return res.json(grouped);
  }

  // AI generation is available to any authenticated user (they can already
  // see the underlying data); it runs before the admin gate.
  if (req.method === 'POST' && req.body?.action === 'ai_generate') {
    return handleGenerate(req, res, user);
  }

  // Custom reports CRUD + run — available to any authenticated user.
  if (req.query.resource === 'custom_reports') {
    return handleCustomReports(req, res, user);
  }

  const isAdmin = user.role === 'admin';
  const isCxStrategy = user.role === 'cx_strategy';
  if (!isAdmin && !isCxStrategy) return res.status(403).json({ error: 'Admin only' });

  // Saving AI provider/keys/prompts is admin-only.
  if (req.method === 'POST' && req.body?.action === 'ai_save') {
    if (!isAdmin) return res.status(403).json({ error: 'Admin only' });
    return handleAiSave(req, res, user);
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
      .insert({ org_id: orgId, field_name, value, parent_value: parent_value || null, sort_order: sort_order || 0 })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id required' });

  if (isCxStrategy) {
    const { data: row } = await supabase
      .from('dropdown_config').select('field_name').eq('id', id).eq('org_id', orgId).maybeSingle();
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
      .eq('org_id', orgId)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase.from('dropdown_config').delete().eq('id', id).eq('org_id', orgId);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
