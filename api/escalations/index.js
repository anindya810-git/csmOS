import supabase from '../_utils/supabase.js';
import { verifyToken } from '../_utils/auth.js';
import { setCors } from '../_utils/cors.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  let user;
  try { user = verifyToken(req); } catch { return res.status(401).json({ error: 'Unauthorized' }); }

  if (req.method === 'GET') {
    const { account_id, status, csm, month } = req.query;

    let query = supabase
      .from('escalations')
      .select('*')
      .order('date_of_escalation', { ascending: false });

    if (user.role === 'csm') {
      query = query.eq('csm', user.csm_name);
    } else if (csm) {
      query = query.eq('csm', csm);
    }

    if (account_id) query = query.eq('account_id', account_id);
    if (status) query = query.eq('status', status);
    if (month) query = query.eq('month', month);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  if (req.method === 'POST') {
    const {
      account_id, tenant_id, account_name, date_of_escalation, month,
      description, action_taken, ownership, status, csm, eta,
      email_subject, ps_leader, escalated_by
    } = req.body;

    if (!description) return res.status(400).json({ error: 'description required' });

    if (user.role === 'csm' && account_id) {
      const { data: acct } = await supabase.from('accounts').select('csm').eq('id', account_id).single();
      if (acct && acct.csm !== user.csm_name) return res.status(403).json({ error: 'Access denied' });
    }

    const { data, error } = await supabase.from('escalations').insert({
      account_id: account_id || null,
      tenant_id: tenant_id || null,
      account_name: account_name || null,
      date_of_escalation: date_of_escalation || null,
      month: month || null,
      description,
      action_taken: action_taken || null,
      ownership: ownership || null,
      status: status || 'Open',
      csm: csm || null,
      eta: eta || null,
      email_subject: email_subject || null,
      ps_leader: ps_leader || null,
      escalated_by: escalated_by || null,
    }).select().single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  res.status(405).json({ error: 'Method not allowed' });
}
