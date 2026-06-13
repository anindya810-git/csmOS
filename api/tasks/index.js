import supabase from '../_utils/supabase.js';
import { verifyAuth } from '../_utils/auth.js';
import { setCors } from '../_utils/cors.js';

function deriveStatus(task) {
  if (task.status === 'Completed') return 'Completed';
  if (task.due_date && new Date(task.due_date) < new Date()) return 'Overdue';
  return 'Open';
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  let user;
  try { user = await verifyAuth(req); } catch { return res.status(401).json({ error: 'Unauthorized' }); }

  const orgId = user.org_id || 1;

  // Resolve fresh identity for CSMs
  let freshUser = null;
  if (user.role === 'csm') {
    const { data } = await supabase.from('users').select('id, name, csm_name').eq('id', user.id).single();
    freshUser = data;
  }
  const myName = freshUser?.csm_name || freshUser?.name || null;

  const { id } = req.query;

  // ── GET — list tasks ─────────────────────────────────────────
  if (req.method === 'GET') {
    const { account_id } = req.query;
    let query = supabase.from('tasks').select('*').eq('org_id', orgId).order('due_date', { ascending: true });

    if (user.role === 'csm') {
      if (!myName) return res.json([]);
      query = query.eq('assigned_to', myName);
    }
    if (account_id) query = query.eq('account_id', account_id);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json((data || []).map(t => ({ ...t, derived_status: deriveStatus(t) })));
  }

  // ── POST — create task ───────────────────────────────────────
  if (req.method === 'POST') {
    const { task_subject, task_description, nature_of_task, due_date,
            account_id, account_name, assigned_to_id, assigned_to } = req.body;

    if (!task_subject?.trim()) return res.status(400).json({ error: 'task_subject required' });
    if (!due_date) return res.status(400).json({ error: 'due_date required' });

    const finalTo   = user.role === 'csm' ? myName : (assigned_to || null);
    const finalToId = user.role === 'csm' ? user.id : (assigned_to_id || null);

    const { data, error } = await supabase.from('tasks').insert({
      org_id: orgId,
      task_subject: task_subject.trim(),
      task_description: task_description || null,
      nature_of_task:   nature_of_task   || null,
      due_date,
      account_id:    account_id  || null,
      account_name:  account_name || null,
      assigned_to_id: finalToId,
      assigned_to:    finalTo,
      assigned_by_id: user.id,
      assigned_by:    user.name,
      status: 'Open',
    }).select().single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ ...data, derived_status: deriveStatus(data) });
  }

  // ── PUT — update single task ─────────────────────────────────
  if (req.method === 'PUT') {
    if (!id) return res.status(400).json({ error: 'id required' });

    const { data: existing } = await supabase.from('tasks').select('*').eq('id', id).eq('org_id', orgId).single();
    if (!existing) return res.status(404).json({ error: 'Not found' });

    if (user.role === 'csm' && existing.assigned_to !== myName) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const body = req.body;
    const updates = { updated_at: new Date().toISOString() };
    const ALLOWED = ['task_subject','task_description','nature_of_task','due_date',
                     'account_id','account_name','assigned_to_id','assigned_to','status'];
    for (const f of ALLOWED) {
      if (body[f] !== undefined) updates[f] = body[f] === '' ? null : body[f];
    }

    if (updates.status === 'Completed' && existing.status !== 'Completed') {
      updates.completed_at = new Date().toISOString();
    } else if (updates.status === 'Open') {
      updates.completed_at = null;
    }

    const { data, error } = await supabase.from('tasks').update(updates).eq('id', id).eq('org_id', orgId).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ...data, derived_status: deriveStatus(data) });
  }

  // ── PATCH — bulk update (admin only) ─────────────────────────
  if (req.method === 'PATCH') {
    if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { ids, field, value } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'ids required' });
    const ALLOWED = ['status','assigned_to','assigned_to_id','nature_of_task'];
    if (!ALLOWED.includes(field)) return res.status(400).json({ error: 'invalid field' });

    const updateObj = { [field]: value, updated_at: new Date().toISOString() };
    if (field === 'status' && value === 'Completed') {
      updateObj.completed_at = new Date().toISOString();
    } else if (field === 'status' && value === 'Open') {
      updateObj.completed_at = null;
    }

    const { error } = await supabase.from('tasks').update(updateObj).in('id', ids).eq('org_id', orgId);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ updated: ids.length });
  }

  // ── DELETE — admin only ──────────────────────────────────────
  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'id required' });
    if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { error } = await supabase.from('tasks').delete().eq('id', id).eq('org_id', orgId);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ deleted: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
