import supabase from '../_utils/supabase.js';
import { verifyAuth } from '../_utils/auth.js';
import { setCors } from '../_utils/cors.js';
import { ACCOUNT_EDITABLE_FIELDS as EDITABLE_FIELDS } from '../_utils/accountFields.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  let user;
  try { user = await verifyAuth(req); } catch { return res.status(401).json({ error: 'Unauthorized' }); }

  const { id } = req.query;

  // Resolve fresh csm_name so stale JWTs don't block access
  let csmName = null;
  if (user.role === 'csm') {
    const { data: u } = await supabase.from('users').select('csm_name').eq('id', user.id).single();
    csmName = u?.csm_name ?? null;
  }

  if (req.method === 'GET') {
    const { data: account, error } = await supabase
      .from('accounts').select('*').eq('id', id).single();

    if (error || !account) return res.status(404).json({ error: 'Not found' });
    if (user.role === 'csm' && account.csm !== csmName) return res.status(403).json({ error: 'Access denied' });

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
    if (user.role === 'csm' && current.csm !== csmName) return res.status(403).json({ error: 'Access denied' });

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
    updates.updated_by = user.name || null;

    const { data: updated, error } = await supabase
      .from('accounts').update(updates).eq('id', id).select().single();

    if (error) return res.status(500).json({ error: error.message });

    // API-key callers have no user row; skip the FK-backed activity log.
    if (user.id != null) {
      await supabase.from('activity_log').insert({
        account_id: Number(id),
        user_id: user.id,
        action: 'update',
        changes
      });
    }

    return res.json(updated);
  }

  res.status(405).json({ error: 'Method not allowed' });
}
