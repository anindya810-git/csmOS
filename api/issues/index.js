import supabase from '../_utils/supabase.js';
import { verifyToken } from '../_utils/auth.js';
import { setCors } from '../_utils/cors.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  let user;
  try { user = verifyToken(req); } catch { return res.status(401).json({ error: 'Unauthorized' }); }

  const { id } = req.query;

  // GET — list issues
  if (req.method === 'GET') {
    const { account_id, status, csm, issue_type, priority } = req.query;
    let query = supabase
      .from('issues')
      .select('*')
      .order('reported_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (user.role === 'csm') query = query.eq('csm', user.csm_name);
    else if (csm) query = query.eq('csm', csm);
    if (account_id) query = query.eq('account_id', account_id);
    if (status)     query = query.eq('status', status);
    if (issue_type) query = query.eq('issue_type', issue_type);
    if (priority)   query = query.eq('priority', priority);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  // POST — create issue
  if (req.method === 'POST') {
    const {
      account_id, account_name, tenant_id, csm_lead, csm,
      description, priority, owner_team, support_ticket, dev_ticket,
      issue_type, issue_sub_type, reported_date, closure_date, status, next_steps,
    } = req.body;
    if (!description) return res.status(400).json({ error: 'description required' });

    const { data, error } = await supabase.from('issues').insert({
      account_id: account_id || null,
      account_name: account_name || null,
      tenant_id: tenant_id || null,
      csm_lead: csm_lead || null,
      csm: csm || null,
      description,
      priority: priority || null,
      owner_team: owner_team || null,
      support_ticket: support_ticket || null,
      dev_ticket: dev_ticket || null,
      issue_type: issue_type || null,
      issue_sub_type: issue_sub_type || null,
      reported_date: reported_date || null,
      closure_date: closure_date || null,
      status: status || 'Open',
      next_steps: next_steps || null,
    }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  // PUT ?id=X — update single issue
  if (req.method === 'PUT') {
    if (!id) return res.status(400).json({ error: 'id required' });
    const {
      account_id, account_name, tenant_id, csm_lead, csm,
      description, priority, owner_team, support_ticket, dev_ticket,
      issue_type, issue_sub_type, reported_date, closure_date, status, next_steps,
    } = req.body;
    if (!description) return res.status(400).json({ error: 'description required' });

    const { data, error } = await supabase.from('issues').update({
      account_id: account_id || null,
      account_name: account_name || null,
      tenant_id: tenant_id || null,
      csm_lead: csm_lead || null,
      csm: csm || null,
      description,
      priority: priority || null,
      owner_team: owner_team || null,
      support_ticket: support_ticket || null,
      dev_ticket: dev_ticket || null,
      issue_type: issue_type || null,
      issue_sub_type: issue_sub_type || null,
      reported_date: reported_date || null,
      closure_date: closure_date || null,
      status: status || 'Open',
      next_steps: next_steps || null,
      updated_at: new Date().toISOString(),
    }).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  // DELETE ?id=X — admin only
  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'id required' });
    if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { error } = await supabase.from('issues').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ deleted: true });
  }

  // PATCH — bulk update, admin only
  if (req.method === 'PATCH') {
    if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { ids, field, value } = req.body;
    const ALLOWED = [
      'status', 'priority', 'owner_team', 'csm', 'csm_lead',
      'issue_type', 'issue_sub_type', 'next_steps', 'closure_date', 'account_id',
    ];
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids required' });
    if (!field || !ALLOWED.includes(field)) return res.status(400).json({ error: 'invalid field' });
    const coerced = value === '' || value === null || value === undefined ? null : value;

    let updateObj = { updated_at: new Date().toISOString() };
    if (field === 'account_id') {
      updateObj.account_id = coerced ? parseInt(coerced) : null;
      if (coerced) {
        const { data: acct } = await supabase.from('accounts').select('account_name').eq('id', parseInt(coerced)).single();
        if (acct) updateObj.account_name = acct.account_name;
      }
    } else {
      updateObj[field] = coerced;
    }

    const { error } = await supabase.from('issues').update(updateObj).in('id', ids);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ updated: ids.length });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
