import supabase from '../_utils/supabase.js';
import { verifyToken } from '../_utils/auth.js';
import { setCors } from '../_utils/cors.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  let user;
  try { user = verifyToken(req); } catch { return res.status(401).json({ error: 'Unauthorized' }); }

  // Always resolve csm_name fresh from DB so stale JWTs don't cause empty results
  let csmName = null;
  if (user.role === 'csm') {
    const { data: u } = await supabase.from('users').select('csm_name').eq('id', user.id).single();
    csmName = u?.csm_name ?? null;
  }

  if (req.method === 'GET' && req.query.stats) {
    let statsQuery = supabase.from('accounts').select('id, rag_status, industry, csm, mrr, churn_status, churn_risk, renewal_status');
    if (user.role === 'csm') {
      if (!csmName) return res.json({ total: { count: 0, total_mrr: 0 }, byRag: [], byIndustry: [], byChurn: [], byCsm: [], renewalPending: { count: 0 }, churnRisk: { count: 0 } });
      statsQuery = statsQuery.eq('csm', csmName);
    }
    const { data: accts, error: sErr } = await statsQuery;
    if (sErr) return res.status(500).json({ error: sErr.message });

    const total = { count: accts.length, total_mrr: accts.reduce((s, a) => s + (a.mrr || 0), 0) };
    const ragCounts = {};
    accts.forEach(a => { if (a.rag_status) ragCounts[a.rag_status] = (ragCounts[a.rag_status] || 0) + 1; });
    const byRag = Object.entries(ragCounts).map(([rag_status, count]) => ({ rag_status, count }));
    const industryMap = {};
    accts.forEach(a => {
      if (!a.industry) return;
      if (!industryMap[a.industry]) industryMap[a.industry] = { count: 0, mrr: 0 };
      industryMap[a.industry].count++; industryMap[a.industry].mrr += (a.mrr || 0);
    });
    const byIndustry = Object.entries(industryMap).map(([industry, v]) => ({ industry, ...v })).sort((a, b) => b.mrr - a.mrr);
    const csmMap = {};
    accts.forEach(a => {
      if (!a.csm) return;
      if (!csmMap[a.csm]) csmMap[a.csm] = { count: 0, mrr: 0 };
      csmMap[a.csm].count++; csmMap[a.csm].mrr += (a.mrr || 0);
    });
    const byCsm = Object.entries(csmMap).map(([csm, v]) => ({ csm, ...v })).sort((a, b) => b.mrr - a.mrr);
    const churnMap = {};
    accts.forEach(a => { if (a.churn_status) churnMap[a.churn_status] = (churnMap[a.churn_status] || 0) + 1; });
    const byChurn = Object.entries(churnMap).map(([churn_status, count]) => ({ churn_status, count }));
    const renewalPending = { count: accts.filter(a => a.renewal_status === 'Renewal Pending').length };
    const churnRisk = { count: accts.filter(a => a.churn_risk === 'Yes' || ['Churn Activated', 'Churn Predicted'].includes(a.churn_status)).length };
    return res.json({ total, byRag, byIndustry, byChurn, byCsm, renewalPending, churnRisk });
  }

  if (req.method === 'GET') {
    const { csm, industry, region, rag_status, churn_status, mrr_tier, search } = req.query;

    let query = supabase.from('accounts').select('*').order('account_name');

    if (user.role === 'csm') {
      if (!csmName) return res.json([]);
      query = query.eq('csm', csmName);
    } else if (csm) query = query.eq('csm', csm);
    if (industry) query = query.eq('industry', industry);
    if (region) query = query.eq('region', region);
    if (rag_status) query = query.eq('rag_status', rag_status);
    if (churn_status) query = query.eq('churn_status', churn_status);
    if (mrr_tier) query = query.eq('mrr_tier', mrr_tier);
    if (search) query = query.ilike('account_name', `%${search}%`);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  if (req.method === 'POST') {
    const { account_name, tenant_id, industry, mrr_tier, mrr, region, csm_lead, csm, rag_status } = req.body;
    if (!account_name) return res.status(400).json({ error: 'account_name required' });

    const { data, error } = await supabase
      .from('accounts')
      .insert({ account_name, tenant_id, industry, mrr_tier, mrr: mrr || 0, region, csm_lead, csm, rag_status: rag_status || 'Green' })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  if (req.method === 'PATCH') {
    if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { ids, field, value } = req.body;
    const ALLOWED = [
      'csm','csm_lead','cp','tam_assigned','sa_status',
      'industry','region','mrr_tier','mrr',
      'billing_frequency','renewal_date','renewal_status','closure_eta',
      'churn_status','churn_reason','contraction_risk','churn_risk','grr','nps','renewal_comments',
      'rag_status','adoption_score','stickiness_score','adoption_rate','rag_reason','actions_taken',
      'implementation_status','implementation_type','ps_engagement','ps_solutioning',
      'account_understanding_session','new_csm_intro_done','csm_escalation_matrix_shared',
      'ring_fence_meeting_initiated','meeting_planned_date','meeting_done',
      'issue_mapping_sheet_updated','review_cadence_alignment','golive_date',
    ];
    const NUMERIC = ['mrr','grr','nps','adoption_score','stickiness_score','adoption_rate'];
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids required' });
    if (!field || !ALLOWED.includes(field)) return res.status(400).json({ error: 'invalid field' });
    const coerced = value === '' || value === null || value === undefined
      ? null
      : NUMERIC.includes(field) ? parseFloat(value) : value;
    const { error } = await supabase
      .from('accounts')
      .update({ [field]: coerced, updated_at: new Date().toISOString() })
      .in('id', ids);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ updated: ids.length });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
