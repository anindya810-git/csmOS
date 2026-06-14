import supabase from './_utils/supabase.js';
import { verifyToken } from './_utils/auth.js';
import { setCors } from './_utils/cors.js';
import { callAI, callAIWithTools, AI_SECTIONS, DEFAULT_MODELS, PROVIDERS } from './_utils/ai.js';
import { getOrgFeatures, featureEnabled } from './_utils/features.js';
import { FIELD_CATALOG } from '../src/fieldCatalog.js';

const PROMPT_KEYS = Object.keys(AI_SECTIONS); // account_summary, account_escalations, account_issues, ...

// The assistant agent loop makes several sequential LLM + DB round-trips, so
// give this function more headroom than the default 10s.
export const config = { maxDuration: 60 };

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
  return {
    provider, enabled: !!providers[provider], providers, models, prompts,
    assistant: {
      // The conversational assistant is on by default once a provider is set.
      enabled: map.assistant_enabled !== 'false',
      name: map.assistant_name || 'Custally Assistant',
      greeting: map.assistant_greeting || '',
    },
  };
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
    // org-scope every read so a guessed id can't surface another tenant's data.
    const { data: fr } = await supabase.from('feature_requests').select('*, feature_request_links(*)').eq('id', frId).eq('org_id', orgId).maybeSingle();
    if (!fr) throw new Error('Feature request not found');
    const links = fr.feature_request_links || [];
    const escIds = links.filter(l => l.link_type === 'escalation').map(l => l.linked_id);
    const issIds = links.filter(l => l.link_type === 'issue').map(l => l.linked_id);
    const acctIds = [...new Set(links.map(l => l.account_id).filter(Boolean))];
    const [{ data: escs }, { data: isss }, { data: accts }] = await Promise.all([
      escIds.length ? supabase.from('escalations').select('*').in('id', escIds).eq('org_id', orgId) : Promise.resolve({ data: [] }),
      issIds.length ? supabase.from('issues').select('*').in('id', issIds).eq('org_id', orgId) : Promise.resolve({ data: [] }),
      acctIds.length ? supabase.from('accounts').select('account_name, mrr, rag_status, region, industry').in('id', acctIds).eq('org_id', orgId) : Promise.resolve({ data: [] }),
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
  accounts: new Set(['id','account_name','tenant_id','csm','csm_lead','rag_status','rag_reason','region','industry','mrr','mrr_tier','renewal_date','renewal_status','churn_status','churn_risk','golive_date','adoption_score','stickiness_score','nps','implementation_status']),
  issues: new Set(['id','account_name','tenant_id','priority','issue_type','issue_sub_type','owner_team','status','reported_date','closure_date','csm','csm_lead','description','next_steps']),
  escalations: new Set(['id','account_name','tenant_id','date_of_escalation','month','status','csm','ownership','trigger_reason','issue_type','issue_sub_type','escalated_by','ps_leader','eta','description','action_taken','source_of_escalation']),
  tasks: new Set(['id','task_subject','task_description','nature_of_task','account_name','assigned_to','assigned_by','due_date','status']),
  feature_requests: new Set(['id','title','description','related_to','priority','status','expected_rollout_date','created_by','approved_by']),
};

// Numeric / date typed fields per entity, so the assistant query layer casts
// comparison values correctly for gt/gte/lt/lte operators.
const NUMERIC_FIELDS = new Set(['mrr','adoption_score','stickiness_score','nps','support_ticket','dev_ticket']);

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

// ──────────────────────────────────────────────────────────────────────────
// Conversational Assistant — an agentic chat that can query org data, respecting
// the asking user's role and per-object view permissions.
// ──────────────────────────────────────────────────────────────────────────

const ASSISTANT_ENTITIES = ['accounts', 'issues', 'escalations', 'tasks', 'feature_requests'];

// The single data-access tool the assistant uses. One flexible query covers
// look-ups, filtered lists and simple grouped reports.
const QUERY_TOOL = {
  name: 'query_data',
  description: 'Query the organization\'s CRM data to answer questions or build simple reports. Always use this to fetch real numbers and records — never guess. Returns JSON: a list of rows, or aggregated groups when group_by is set.',
  parameters: {
    type: 'object',
    properties: {
      entity: { type: 'string', enum: ASSISTANT_ENTITIES, description: 'Which dataset to query.' },
      filters: {
        type: 'array',
        description: 'Conditions ANDed together to narrow rows.',
        items: {
          type: 'object',
          properties: {
            field: { type: 'string', description: 'A field key from this entity\'s schema.' },
            op: { type: 'string', enum: ['eq', 'neq', 'in', 'gt', 'gte', 'lt', 'lte', 'contains', 'is_empty', 'not_empty'], description: 'Comparison operator. Use "contains" for partial text, "in" with an array of values.' },
            value: { description: 'Value to compare. String or number; array of strings for "in". Dates as YYYY-MM-DD. Omit for is_empty/not_empty.' },
          },
          required: ['field', 'op'],
        },
      },
      group_by: { type: 'string', description: 'Field key to group by for a count/sum report (e.g. group accounts by rag_status).' },
      metric: { type: 'string', enum: ['count', 'sum', 'avg'], description: 'Aggregation to compute per group (default count).' },
      metric_field: { type: 'string', description: 'Numeric field for sum/avg (e.g. mrr).' },
      sort_by: { type: 'string', description: 'Field to sort rows by.' },
      sort_dir: { type: 'string', enum: ['asc', 'desc'] },
      limit: { type: 'number', description: 'Max rows to return (default 50, max 200).' },
    },
    required: ['entity'],
  },
};

function canViewEntity(role, entity, rolePerms) {
  if (role === 'admin') return true;
  const stored = rolePerms?.[role];
  // Default-on: only an explicit false blocks access.
  return stored?.[entity]?.view !== false;
}

// Run one assistant data query with full access control. Returns a JS object
// (serialized by the caller into the tool result).
async function runAssistantQuery(input, ctx) {
  const { user, orgId, csmName, rolePerms } = ctx;
  const entity = input.entity;
  if (!ALLOWED_FIELDS[entity]) return { error: `Unknown entity "${entity}". Valid: ${ASSISTANT_ENTITIES.join(', ')}` };
  if (!canViewEntity(user.role, entity, rolePerms)) return { error: `You do not have permission to view ${entity}.` };

  const allowed = ALLOWED_FIELDS[entity];
  const cols = [...allowed].join(',');
  let q = supabase.from(entity).select(cols).eq('org_id', orgId);

  // Role scoping: a CSM only sees their own book of business.
  if (user.role === 'csm' && csmName) {
    if (entity === 'tasks') q = q.eq('assigned_to', csmName);
    else if (allowed.has('csm')) q = q.eq('csm', csmName);
  }

  // Apply filters (only on whitelisted fields).
  for (const f of (input.filters || [])) {
    if (!f || !allowed.has(f.field)) continue;
    const cast = (v) => NUMERIC_FIELDS.has(f.field) ? Number(v) : v;
    switch (f.op) {
      case 'eq':        q = q.eq(f.field, cast(f.value)); break;
      case 'neq':       q = q.neq(f.field, cast(f.value)); break;
      case 'in':        q = q.in(f.field, (Array.isArray(f.value) ? f.value : [f.value]).map(cast)); break;
      case 'gt':        q = q.gt(f.field, cast(f.value)); break;
      case 'gte':       q = q.gte(f.field, cast(f.value)); break;
      case 'lt':        q = q.lt(f.field, cast(f.value)); break;
      case 'lte':       q = q.lte(f.field, cast(f.value)); break;
      case 'contains':  q = q.ilike(f.field, `%${f.value}%`); break;
      case 'is_empty':  q = q.is(f.field, null); break;
      case 'not_empty': q = q.not(f.field, 'is', null); break;
      default: break;
    }
  }

  const grouping = input.group_by && allowed.has(input.group_by);
  const metric = ['count', 'sum', 'avg'].includes(input.metric) ? input.metric : 'count';
  const metricField = input.metric_field && allowed.has(input.metric_field) ? input.metric_field : null;

  if (input.sort_by && allowed.has(input.sort_by) && !grouping) {
    q = q.order(input.sort_by, { ascending: input.sort_dir !== 'desc' });
  }
  // Grouped reports scan more rows; plain lists are capped tighter.
  q = q.limit(grouping ? 2000 : Math.min(Math.max(Number(input.limit) || 50, 1), 200));

  const { data, error } = await q;
  if (error) return { error: error.message };
  const rows = data || [];

  if (grouping) {
    const groups = {};
    for (const r of rows) {
      const key = r[input.group_by] == null || r[input.group_by] === '' ? '(blank)' : String(r[input.group_by]);
      if (!groups[key]) groups[key] = { group: key, count: 0, _sum: 0, _n: 0 };
      groups[key].count++;
      if (metricField) { const n = Number(r[metricField]); if (!isNaN(n)) { groups[key]._sum += n; groups[key]._n++; } }
    }
    const out = Object.values(groups).map(g => ({
      group: g.group,
      value: metric === 'sum' ? g._sum
        : metric === 'avg' ? (g._n ? Math.round((g._sum / g._n) * 100) / 100 : 0)
        : g.count,
    })).sort((a, b) => b.value - a.value).slice(0, 50);
    return { entity, report: { group_by: input.group_by, metric, metric_field: metricField }, groups: out, scanned: rows.length };
  }

  // Plain list — clip long text fields to keep the tool payload compact.
  const clipped = rows.map(r => {
    const o = {};
    for (const k of Object.keys(r)) {
      const v = r[k];
      o[k] = (typeof v === 'string' && v.length > 240) ? v.slice(0, 240) + '…' : v;
    }
    return o;
  });
  return { entity, count: clipped.length, rows: clipped };
}

// Build a compact field glossary for the system prompt so the model knows
// which fields exist, their meaning (admin-authored descriptions) and labels.
function buildSchemaGlossary(labels, descs) {
  const lines = [];
  for (const entity of ASSISTANT_ENTITIES) {
    const allowed = ALLOWED_FIELDS[entity];
    const cat = FIELD_CATALOG[entity];
    const fieldDefs = cat ? cat.fields : [];
    const byKey = {};
    fieldDefs.forEach(f => { byKey[f.key] = f; });
    const parts = [];
    for (const key of allowed) {
      if (key === 'id') continue;
      const def = byKey[key];
      const label = labels[`${entity}.${key}`] || def?.label || key;
      const desc = descs[`${entity}.${key}`];
      parts.push(`${key} (${label}${def?.type ? ', ' + def.type : ''}${desc ? ' — ' + desc : ''})`);
    }
    lines.push(`${entity}: ${parts.join('; ')}`);
  }
  return lines.join('\n');
}

async function handleChat(req, res, user) {
  const orgId = user.org_id || 1;
  const cfg = await loadAiConfig(orgId);
  const provider = cfg.provider;
  if (!provider || !PROVIDERS.includes(provider)) return res.status(400).json({ error: 'No AI provider configured. An admin can set one in Settings → AI.' });
  const key = cfg[`key_${provider}`];
  if (!key) return res.status(400).json({ error: `No API key set for ${provider}.` });
  if (cfg.assistant_enabled === 'false') return res.status(403).json({ error: 'The assistant is turned off for your organisation.' });
  const model = cfg[`model_${provider}`] || DEFAULT_MODELS[provider];

  const incoming = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const history = incoming
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-12)
    .map(m => ({ role: m.role, text: m.content }));
  if (!history.length || history[history.length - 1].role !== 'user')
    return res.status(400).json({ error: 'A user message is required.' });

  // Resolve the CSM display name for role scoping.
  let csmName = null;
  if (user.role === 'csm') {
    const { data: u } = await supabase.from('users').select('csm_name, name').eq('id', user.id).maybeSingle();
    csmName = u?.csm_name || u?.name || null;
  }

  // Load role permissions + field labels/descriptions in one round-trip.
  const { data: cfgRows } = await supabase
    .from('dropdown_config')
    .select('field_name, value, parent_value')
    .eq('org_id', orgId)
    .in('field_name', ['role_permissions', 'field_label', 'field_description']);
  const rolePerms = {}; const labels = {}; const descs = {};
  (cfgRows || []).forEach(r => {
    if (r.field_name === 'role_permissions') { try { rolePerms[r.value] = JSON.parse(r.parent_value); } catch {} }
    else if (r.field_name === 'field_label') labels[r.value] = r.parent_value;
    else if (r.field_name === 'field_description') descs[r.value] = r.parent_value;
  });

  const assistantName = cfg.assistant_name || 'Custally Assistant';
  const orgName = (await supabase.from('organizations').select('name').eq('id', orgId).maybeSingle()).data?.name || 'this organization';
  const today = new Date().toISOString().slice(0, 10);
  const scope = user.role === 'admin'
    ? 'You can see all data across the organization.'
    : user.role === 'csm'
      ? `You can only see data for the CSM "${csmName}" (their own accounts, issues, escalations and tasks). Never imply data exists beyond their book.`
      : 'You can see organization-wide data permitted to this user\'s role.';

  const system = [
    `You are ${assistantName}, a helpful Customer Success analyst assistant embedded inside Custally (a CSM platform) for ${orgName}.`,
    `The person chatting with you is ${user.name || 'a user'} (role: ${user.role}${csmName ? `, CSM name: ${csmName}` : ''}). ${scope}`,
    `Today's date is ${today}.`,
    '',
    'You can answer questions and produce simple reports about the org\'s CRM data using the query_data tool. Rules:',
    '- For ANY question about counts, lists, specific records, or metrics, call query_data to get real data. Never invent numbers or names.',
    '- For "how many / breakdown / by X" questions, use group_by (+ metric/metric_field) to build a grouped report.',
    '- You may call query_data multiple times to gather what you need before answering.',
    '- Present results clearly and concisely. Use Markdown tables for tabular data and Markdown bullets/bold for summaries. Keep answers focused.',
    '- Respect the user\'s access scope above; the tool already enforces it, so just answer with what it returns.',
    '- If the data is empty, say so plainly. If a question is outside the CRM data, answer from general CS knowledge but say it is general guidance.',
    '',
    'DATA SCHEMA (entity: field (Label, type — description); only these fields are queryable):',
    buildSchemaGlossary(labels, descs),
  ].join('\n');

  const ctx = { user, orgId, csmName, rolePerms };
  const deadline = Date.now() + 50000;
  const MAX_STEPS = 4;
  let turns = history.slice();
  let finalText = '';

  try {
    for (let step = 0; step < MAX_STEPS; step++) {
      const budget = deadline - Date.now();
      if (budget < 4000) break;
      const lastStep = step === MAX_STEPS - 1;
      const resp = await callAIWithTools({
        provider, key, model, system, turns,
        tools: lastStep ? [] : [QUERY_TOOL],
        maxTokens: 1400,
        timeoutMs: Math.min(22000, budget - 1000),
      });
      if (!resp.toolUses?.length) { finalText = resp.text || ''; break; }
      turns.push({ role: 'assistant', text: resp.text || '', toolUses: resp.toolUses });
      const results = [];
      for (const tu of resp.toolUses) {
        let out;
        try { out = (tu.name === 'query_data') ? await runAssistantQuery(tu.input || {}, ctx) : { error: `Unknown tool ${tu.name}` }; }
        catch (e) { out = { error: e.message || 'Tool failed' }; }
        let content = JSON.stringify(out);
        if (content.length > 8000) content = content.slice(0, 8000) + '…(truncated)';
        results.push({ id: tu.id, name: tu.name, content });
      }
      turns.push({ role: 'tool', results });
      finalText = resp.text || finalText;
    }
  } catch (e) {
    const msg = /aborted/i.test(e.message || '') ? 'The assistant timed out. Try a more specific question or a faster model.' : (e.message || 'Assistant request failed');
    return res.status(502).json({ error: msg });
  }

  if (!finalText) finalText = 'I wasn\'t able to put together an answer for that. Could you rephrase or narrow it down?';
  return res.json({ text: finalText });
}

async function handleAiSave(req, res, user) {
  const orgId = user.org_id || 1;
  const { provider, keys, clear, models, prompts, assistant } = req.body || {};
  const rows = [];
  if (provider !== undefined) rows.push({ org_id: orgId, key: 'provider', value: provider || '' });
  if (assistant && typeof assistant === 'object') {
    if (assistant.name !== undefined)     rows.push({ org_id: orgId, key: 'assistant_name', value: String(assistant.name || '').slice(0, 60) });
    if (assistant.greeting !== undefined) rows.push({ org_id: orgId, key: 'assistant_greeting', value: String(assistant.greeting || '').slice(0, 300) });
    if (assistant.enabled !== undefined)  rows.push({ org_id: orgId, key: 'assistant_enabled', value: assistant.enabled ? 'true' : 'false' });
  }
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

  // Custom reports CRUD + run — available to any authenticated user.
  // Must be routed BEFORE the generic GET handler below, otherwise a
  // GET ?resource=custom_reports falls into the dropdown_config branch and
  // returns the wrong payload (so saved reports never show up).
  if (req.query.resource === 'custom_reports') {
    const features = await getOrgFeatures(orgId);
    if (!featureEnabled(features, 'custom_reports'))
      return res.status(403).json({ error: 'Custom Reports is disabled for your organisation.' });
    return handleCustomReports(req, res, user);
  }

  // AI generation is available to any authenticated user (they can already
  // see the underlying data); it runs before the admin gate.
  if (req.method === 'POST' && req.body?.action === 'ai_generate') {
    const features = await getOrgFeatures(orgId);
    if (!featureEnabled(features, 'ai'))
      return res.status(403).json({ error: 'AI is disabled for your organisation.' });
    return handleGenerate(req, res, user);
  }

  // Conversational assistant — available to any authenticated user; the query
  // layer scopes data to their role/permissions.
  if (req.method === 'POST' && req.body?.action === 'ai_chat') {
    const features = await getOrgFeatures(orgId);
    if (!featureEnabled(features, 'ai'))
      return res.status(403).json({ error: 'AI is disabled for your organisation.' });
    if (!featureEnabled(features, 'assistant'))
      return res.status(403).json({ error: 'The Assistant is disabled for your organisation.' });
    return handleChat(req, res, user);
  }

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
