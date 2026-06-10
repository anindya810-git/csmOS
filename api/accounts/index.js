import supabase from '../_utils/supabase.js';
import { verifyToken } from '../_utils/auth.js';
import { setCors } from '../_utils/cors.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  let user;
  try { user = verifyToken(req); } catch { return res.status(401).json({ error: 'Unauthorized' }); }

  if (req.method === 'GET') {
    const { csm, industry, region, rag_status, churn_status, mrr_tier, search } = req.query;

    let query = supabase.from('accounts').select('*').order('account_name');

    if (user.role === 'csm') query = query.eq('csm', user.csm_name);
    else if (csm) query = query.eq('csm', csm);
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
      'issue_mapping_sheet_updated','review_cadence_alignment',
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
