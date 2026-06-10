import supabase from '../_utils/supabase.js';
import { verifyToken } from '../_utils/auth.js';
import { setCors } from '../_utils/cors.js';

const EDITABLE_FIELDS = [
  'account_name','tenant_id','industry','mrr_tier','mrr','region','csm_lead','csm',
  'closure_eta','cp','tam_assigned','billing_frequency','renewal_date','renewal_status',
  'churn_status','churn_reason','renewal_comments','implementation_status','implementation_type',
  'ps_engagement','ps_solutioning','account_understanding_session','new_csm_intro_done',
  'csm_escalation_matrix_shared','ring_fence_meeting_initiated','meeting_planned_date',
  'meeting_done','issue_mapping_sheet_updated','review_cadence_alignment',
  'adoption_score','stickiness_score','rag_status','rag_reason','actions_taken',
  'contraction_risk','churn_risk','grr','nps','adoption_rate','sa_status',
  'poc1_name','poc1_email','poc1_phone','poc1_designation',
  'poc2_name','poc2_email','poc2_phone','poc2_designation',
  'poc3_name','poc3_email','poc3_phone','poc3_designation',
];

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  let user;
  try { user = verifyToken(req); } catch { return res.status(401).json({ error: 'Unauthorized' }); }

  const { id } = req.query;

  if (req.method === 'GET') {
    const { data: account, error } = await supabase
      .from('accounts').select('*').eq('id', id).single();

    if (error || !account) return res.status(404).json({ error: 'Not found' });
    if (user.role === 'csm' && account.csm !== user.csm_name) return res.status(403).json({ error: 'Access denied' });

    const { data: logs } = await supabase
      .from('activity_log')
      .select('*, users(name)')
      .eq('account_id', id)
      .order('created_at', { ascending: false })
      .limit(20);

    return res.json({
      ...account,
      activity_log: (logs || []).map(l => ({ ...l, user_name: l.users?.name, users: undefined }))
    });
  }

  if (req.method === 'PUT') {
    const { data: current, error: fetchErr } = await supabase
      .from('accounts').select('*').eq('id', id).single();

    if (fetchErr || !current) return res.status(404).json({ error: 'Not found' });
    if (user.role === 'csm' && current.csm !== user.csm_name) return res.status(403).json({ error: 'Access denied' });

    const updates = {};
    const changes = {};

    for (const field of EDITABLE_FIELDS) {
      const newVal = req.body[field];
      if (newVal !== undefined && String(newVal ?? '') !== String(current[field] ?? '')) {
        updates[field] = newVal === '' ? null : newVal;
        changes[field] = { from: current[field], to: newVal };
      }
    }

    if (Object.keys(updates).length === 0) return res.json(current);

    updates.updated_at = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from('accounts').update(updates).eq('id', id).select().single();

    if (error) return res.status(500).json({ error: error.message });

    await supabase.from('activity_log').insert({
      account_id: Number(id),
      user_id: user.id,
      action: 'update',
      changes
    });

    return res.json(updated);
  }

  res.status(405).json({ error: 'Method not allowed' });
}
