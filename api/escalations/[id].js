import supabase from '../_utils/supabase.js';
import { verifyToken } from '../_utils/auth.js';
import { setCors } from '../_utils/cors.js';

const EDITABLE_FIELDS = [
  'account_id', 'account_name', 'tenant_id',
  'date_of_escalation', 'month', 'description', 'action_taken',
  'ownership', 'status', 'csm', 'eta', 'email_subject', 'ps_leader', 'escalated_by',
  'trigger_reason', 'source_of_escalation', 'issue_type', 'issue_sub_type',
];

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  let user;
  try { user = verifyToken(req); } catch { return res.status(401).json({ error: 'Unauthorized' }); }

  const { id } = req.query;

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('escalations').select('*').eq('id', id).single();
    if (error || !data) return res.status(404).json({ error: 'Not found' });
    if (user.role === 'csm' && data.csm !== user.csm_name) return res.status(403).json({ error: 'Access denied' });
    return res.json(data);
  }

  if (req.method === 'PUT') {
    const { data: current, error: fetchErr } = await supabase.from('escalations').select('*').eq('id', id).single();
    if (fetchErr || !current) return res.status(404).json({ error: 'Not found' });
    if (user.role === 'csm' && current.csm !== user.csm_name) return res.status(403).json({ error: 'Access denied' });

    const updates = {};
    for (const field of EDITABLE_FIELDS) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field] === '' ? null : req.body[field];
      }
    }
    updates.updated_at = new Date().toISOString();
    updates.updated_by = user.name || null;

    const { data, error } = await supabase.from('escalations').update(updates).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  if (req.method === 'DELETE') {
    if (user.role === 'csm') return res.status(403).json({ error: 'Only admins can delete escalations' });
    const { error } = await supabase.from('escalations').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
