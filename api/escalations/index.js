import supabase from '../_utils/supabase.js';
import { verifyAuth } from '../_utils/auth.js';
import { setCors } from '../_utils/cors.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  let user;
  try { user = await verifyAuth(req); } catch { return res.status(401).json({ error: 'Unauthorized' }); }

  const orgId = user.org_id || 1;

  let csmName = null;
  if (user.role === 'csm') {
    const { data: u } = await supabase.from('users').select('csm_name').eq('id', user.id).single();
    csmName = u?.csm_name ?? null;
  }

  if (req.method === 'GET') {
    const { account_id, status, csm, month } = req.query;

    let query = supabase
      .from('escalations')
      .select('*, accounts(id, account_name, tenant_id, csm, rag_status)')
      .eq('org_id', orgId)
      .order('date_of_escalation', { ascending: false });

    if (user.role === 'csm') {
      if (!csmName) return res.json([]);
      query = query.eq('csm', csmName);
    } else if (csm) {
      query = query.eq('csm', csm);
    }

    if (account_id) query = query.eq('account_id', account_id);
    if (status) query = query.eq('status', status);
    if (month) query = query.eq('month', month);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    // Account is the source of truth: when an escalation is linked to an
    // account, its CSM / Tenant ID / Account name / RAG always reflect the
    // account, never whatever was typed into the escalation. (RAG was already
    // read from the join; this also corrects CSM, Tenant ID and Account name.)
    const rows = (data || []).map(e => {
      const a = e.accounts;
      if (!a) return e;
      return {
        ...e,
        account_name: a.account_name ?? e.account_name,
        tenant_id:    a.tenant_id   ?? e.tenant_id,
        csm:          a.csm         ?? e.csm,
      };
    });
    return res.json(rows);
  }

  if (req.method === 'POST') {
    const {
      account_id, tenant_id, account_name, date_of_escalation, month,
      description, action_taken, ownership, status, csm, eta,
      email_subject, ps_leader, escalated_by,
      trigger_reason, source_of_escalation, issue_type, issue_sub_type
    } = req.body;

    if (!description) return res.status(400).json({ error: 'description required' });

    if (user.role === 'csm' && account_id) {
      const { data: acct } = await supabase.from('accounts').select('csm').eq('id', account_id).eq('org_id', orgId).single();
      if (acct && acct.csm !== csmName) return res.status(403).json({ error: 'Access denied' });
    }

    const { data, error } = await supabase.from('escalations').insert({
      org_id: orgId,
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
      trigger_reason: trigger_reason || null,
      source_of_escalation: source_of_escalation || null,
      issue_type: issue_type || null,
      issue_sub_type: issue_sub_type || null,
      updated_by: user.name || null,
      updated_at: new Date().toISOString(),
    }).select().single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  if (req.method === 'PATCH') {
    if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { ids, field, value } = req.body;
    const ALLOWED = [
      'status', 'ownership', 'ps_leader', 'escalated_by',
      'trigger_reason', 'source_of_escalation', 'issue_type', 'issue_sub_type',
      'action_taken', 'eta', 'month',
    ];
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids required' });
    if (!field || !ALLOWED.includes(field)) return res.status(400).json({ error: 'invalid field' });
    const coerced = value === '' || value === null || value === undefined ? null : value;
    const { error } = await supabase
      .from('escalations')
      .update({ [field]: coerced, updated_at: new Date().toISOString(), updated_by: user.name || null })
      .in('id', ids)
      .eq('org_id', orgId);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ updated: ids.length });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
