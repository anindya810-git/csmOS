import supabase from './_utils/supabase.js';
import { verifyAuth } from './_utils/auth.js';
import { setCors } from './_utils/cors.js';

const PRIORITIES = ['P0', 'P1', 'P2', 'P3'];
// % and _ are LIKE wildcards — escape so user input is matched literally
const escapeLike = (s) => String(s).replace(/[\\%_]/g, '\\$&');

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  let user;
  try { user = await verifyAuth(req); } catch { return res.status(401).json({ error: 'Unauthorized' }); }

  const { id } = req.query;
  const orgId = user.org_id || 1;

  if (req.method === 'GET') {
    const { status, priority, related_to, search } = req.query;
    let query = supabase
      .from('feature_requests')
      .select('*, feature_request_links(*)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });
    if (status)     query = query.eq('status', status);
    if (priority)   query = query.eq('priority', priority);
    if (related_to) query = query.eq('related_to', related_to);
    if (search)     query = query.ilike('title', `%${escapeLike(search)}%`);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  }

  if (req.method === 'POST') {
    const { title, description, related_to, priority, expected_rollout_date, link_ids } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'title required' });
    if (title.trim().length > 500) return res.status(400).json({ error: 'title too long (max 500 chars)' });
    if (priority && !PRIORITIES.includes(priority)) return res.status(400).json({ error: 'invalid priority' });
    if (Array.isArray(link_ids) && link_ids.length > 200) return res.status(400).json({ error: 'too many links (max 200)' });

    const { data: fr, error: frErr } = await supabase
      .from('feature_requests')
      .insert({
        org_id: orgId,
        title: title.trim(),
        description: description || null,
        related_to: related_to || null,
        priority: priority || 'P2',
        expected_rollout_date: expected_rollout_date || null,
        status: 'pending',
        created_by_id: user.id,
        created_by: user.name,
      })
      .select()
      .single();
    if (frErr) return res.status(500).json({ error: frErr.message });

    if (Array.isArray(link_ids) && link_ids.length > 0) {
      const rows = await buildLinkRows(fr.id, link_ids, orgId);
      if (rows.length > 0) await supabase.from('feature_request_links').insert(rows);
    }

    // Create approval task for configured default approver
    const { data: config } = await supabase
      .from('dropdown_config')
      .select('value, parent_value')
      .eq('field_name', 'fr_default_approver')
      .eq('org_id', orgId)
      .limit(1)
      .maybeSingle();

    const reqId = `FR-${String(fr.id).padStart(5, '0')}`;
    let taskId = null;
    let approverId = null;
    let approverName = null;
    if (config?.value) {
      const { data: approver } = await supabase
        .from('users')
        .select('id, name')
        .eq('id', config.value)
        .eq('org_id', orgId)
        .maybeSingle();
      if (approver) {
        approverId = approver.id;
        approverName = approver.name;
        const due = new Date(); due.setDate(due.getDate() + 2);
        const { data: task } = await supabase.from('tasks').insert({
          org_id: orgId,
          task_subject: `Review Feature Request ${reqId}: ${fr.title}`,
          task_description: `Priority: ${fr.priority}${fr.related_to ? ` | Related to: ${fr.related_to}` : ''}\nApprove or reject this request from the task actions.`,
          nature_of_task: 'Feature Request',
          due_date: due.toISOString(),
          assigned_to_id: approver.id,
          assigned_to: approver.name,
          assigned_by_id: user.id,
          assigned_by: user.name,
          status: 'Open',
          feature_request_id: fr.id,
        }).select('id').single();
        taskId = task?.id || null;
      }
    }

    await supabase.from('feature_requests')
      .update({
        request_id: reqId,
        approver_id: approverId,
        approver_name: approverName,
        ...(taskId ? { approval_task_id: taskId } : {}),
      })
      .eq('id', fr.id);

    const { data: full } = await supabase
      .from('feature_requests')
      .select('*, feature_request_links(*)')
      .eq('id', fr.id)
      .single();
    return res.status(201).json(full);
  }

  if (req.method === 'PUT') {
    if (!id) return res.status(400).json({ error: 'id required' });
    const { data: existing } = await supabase
      .from('feature_requests').select('*').eq('id', id).eq('org_id', orgId).single();
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const body = req.body;

    const isApprover = existing.approver_id != null && String(existing.approver_id) === String(user.id);
    const canReview = user.role === 'admin' || isApprover;

    if (body.action === 'approve') {
      if (!canReview) return res.status(403).json({ error: 'Only an admin or the assigned approver can review this request' });
      const { data, error } = await supabase
        .from('feature_requests')
        .update({ status: 'approved', approved_by_id: user.id, approved_by: user.name, approved_at: new Date().toISOString(), rejection_reason: null })
        .eq('id', id)
        .select('*, feature_request_links(*)')
        .single();
      if (error) return res.status(500).json({ error: error.message });
      if (existing.approval_task_id) {
        await supabase.from('tasks')
          .update({ status: 'Completed', completed_at: new Date().toISOString() })
          .eq('id', existing.approval_task_id);
      }
      return res.json(data);
    }

    if (body.action === 'reject') {
      if (!canReview) return res.status(403).json({ error: 'Only an admin or the assigned approver can review this request' });
      const { data, error } = await supabase
        .from('feature_requests')
        .update({ status: 'rejected', approved_by_id: user.id, approved_by: user.name, approved_at: new Date().toISOString(), rejection_reason: body.rejection_reason || null })
        .eq('id', id)
        .select('*, feature_request_links(*)')
        .single();
      if (error) return res.status(500).json({ error: error.message });
      if (existing.approval_task_id) {
        await supabase.from('tasks')
          .update({ status: 'Completed', completed_at: new Date().toISOString() })
          .eq('id', existing.approval_task_id);
      }
      return res.json(data);
    }

    if (body.action === 'add_links') {
      if (!Array.isArray(body.link_ids) || body.link_ids.length === 0) return res.status(400).json({ error: 'link_ids required' });
      if (body.link_ids.length > 200) return res.status(400).json({ error: 'too many links (max 200)' });
      const { data: current } = await supabase
        .from('feature_request_links').select('link_type, linked_id').eq('feature_request_id', id);
      const have = new Set((current || []).map(l => `${l.link_type}:${l.linked_id}`));
      const toAdd = body.link_ids.filter(l => l && l.type && l.id != null && !have.has(`${l.type}:${l.id}`));
      if (toAdd.length > 0) {
        const rows = await buildLinkRows(parseInt(id), toAdd, orgId);
        if (rows.length > 0) await supabase.from('feature_request_links').insert(rows);
      }
      const { data } = await supabase.from('feature_requests').select('*, feature_request_links(*)').eq('id', id).single();
      return res.json(data);
    }

    if (body.action === 'remove_link') {
      const { link_type, linked_id } = body;
      if (!link_type || linked_id == null) return res.status(400).json({ error: 'link_type and linked_id required' });
      await supabase.from('feature_request_links').delete()
        .eq('feature_request_id', id).eq('link_type', link_type).eq('linked_id', linked_id);
      const { data } = await supabase.from('feature_requests').select('*, feature_request_links(*)').eq('id', id).single();
      return res.json(data);
    }

    if (user.role !== 'admin') {
      if (existing.created_by_id !== user.id) return res.status(403).json({ error: 'Access denied' });
      if (existing.status !== 'pending') return res.status(403).json({ error: 'Cannot edit non-pending requests' });
    }

    if (body.priority && !PRIORITIES.includes(body.priority)) return res.status(400).json({ error: 'invalid priority' });
    if (body.title !== undefined && (!body.title?.trim() || body.title.trim().length > 500)) {
      return res.status(400).json({ error: 'title must be 1-500 chars' });
    }
    if (Array.isArray(body.link_ids) && body.link_ids.length > 200) return res.status(400).json({ error: 'too many links (max 200)' });

    const EDITABLE = ['title', 'description', 'related_to', 'priority', 'expected_rollout_date'];
    const updates = { updated_at: new Date().toISOString() };
    for (const f of EDITABLE) {
      if (body[f] !== undefined) updates[f] = body[f] === '' ? null : body[f];
    }

    if (Array.isArray(body.link_ids)) {
      await supabase.from('feature_request_links').delete().eq('feature_request_id', id);
      if (body.link_ids.length > 0) {
        const rows = await buildLinkRows(parseInt(id), body.link_ids, orgId);
        if (rows.length > 0) await supabase.from('feature_request_links').insert(rows);
      }
    }

    const { data, error } = await supabase
      .from('feature_requests')
      .update(updates)
      .eq('id', id)
      .select('*, feature_request_links(*)')
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'id required' });
    if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { error } = await supabase.from('feature_requests').delete().eq('id', id).eq('org_id', orgId);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ deleted: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function buildLinkRows(frId, linkIds, orgId) {
  const rows = [];
  for (const link of linkIds) {
    if (link.type === 'escalation') {
      const { data } = await supabase
        .from('escalations').select('id, account_id, account_name').eq('id', link.id).eq('org_id', orgId).maybeSingle();
      if (!data) continue;
      let mrr = null;
      if (data.account_id) {
        const { data: acct } = await supabase.from('accounts').select('mrr').eq('id', data.account_id).eq('org_id', orgId).maybeSingle();
        mrr = acct?.mrr ?? null;
      }
      rows.push({ feature_request_id: frId, link_type: 'escalation', linked_id: data.id, account_id: data.account_id, account_name: data.account_name, mrr });
    } else if (link.type === 'issue') {
      const { data } = await supabase
        .from('issues').select('id, account_id, account_name').eq('id', link.id).eq('org_id', orgId).maybeSingle();
      if (!data) continue;
      let mrr = null;
      if (data.account_id) {
        const { data: acct } = await supabase.from('accounts').select('mrr').eq('id', data.account_id).eq('org_id', orgId).maybeSingle();
        mrr = acct?.mrr ?? null;
      }
      rows.push({ feature_request_id: frId, link_type: 'issue', linked_id: data.id, account_id: data.account_id, account_name: data.account_name, mrr });
    }
  }
  return rows;
}
