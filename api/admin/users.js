import supabase from '../_utils/supabase.js';
import { verifyToken, generateApiKey, hashApiKey } from '../_utils/auth.js';
import { setCors } from '../_utils/cors.js';
import { getOrgFeatures, featureEnabled } from '../_utils/features.js';
import bcrypt from 'bcryptjs';

const ALLOWED_ROLES = ['admin', 'csm', 'sales', 'product', 'cx_strategy', 'ps'];

// API key management for the open REST API. Session-JWT + admin only
// (an API key can never create or revoke keys).
async function handleApiKeys(req, res, caller) {
  const { id } = req.query;
  const orgId = caller.org_id || 1;

  const features = await getOrgFeatures(orgId);
  if (!featureEnabled(features, 'api_access'))
    return res.status(403).json({ error: 'API Access is disabled for your organisation.' });

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, label, key_prefix, created_by, created_at, revoked_at, last_used_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  }

  if (req.method === 'POST') {
    const label = (req.body?.label || '').trim();
    if (!label) return res.status(400).json({ error: 'label required' });
    const key = generateApiKey();
    const { data, error } = await supabase
      .from('api_keys')
      .insert({ org_id: orgId, label, key_hash: hashApiKey(key), key_prefix: key.slice(0, 12) + '…', created_by: caller.name || null })
      .select('id, label, key_prefix, created_by, created_at, revoked_at, last_used_at')
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ ...data, key });
  }

  if (req.method === 'PUT') {
    if (!id) return res.status(400).json({ error: 'id required' });
    const revoked_at = req.body?.revoke ? new Date().toISOString() : null;
    const { data, error } = await supabase
      .from('api_keys')
      .update({ revoked_at })
      .eq('id', id)
      .eq('org_id', orgId)
      .select('id, label, key_prefix, created_by, created_at, revoked_at, last_used_at')
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'id required' });
    const { error } = await supabase.from('api_keys').delete().eq('id', id).eq('org_id', orgId);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// Reassign every object owned by / tagged with `old_user_id` to `new_user_id`,
// then (optionally) deactivate the old user. Accounts/issues/escalations
// reference a CSM by display name (csm_name); tasks/feature_requests also carry
// a stable *_id we can match on. We update both so legacy rows are covered.
async function handleReplaceUser(req, res, caller, orgId) {
  const { old_user_id, new_user_id, deactivate_old = true } = req.body || {};
  if (!old_user_id || !new_user_id) return res.status(400).json({ error: 'old_user_id and new_user_id required' });
  if (String(old_user_id) === String(new_user_id)) return res.status(400).json({ error: 'Pick two different users' });

  const { data: pair } = await supabase
    .from('users').select('id, name, csm_name').in('id', [old_user_id, new_user_id]).eq('org_id', orgId);
  const oldU = (pair || []).find(u => String(u.id) === String(old_user_id));
  const newU = (pair || []).find(u => String(u.id) === String(new_user_id));
  if (!oldU || !newU) return res.status(404).json({ error: 'User not found in this organisation' });

  const oldName = oldU.name;
  const newName = newU.name;
  const oldCsm  = oldU.csm_name;
  // If the new user has no CSM display name, fall back to their plain name so
  // the objects still point at a real person.
  const newCsm  = newU.csm_name || newU.name;

  const ops = [];

  // CSM-name keyed objects (no stable user_id column on these tables).
  if (oldCsm) {
    ops.push(supabase.from('accounts').update({ csm: newCsm }).eq('csm', oldCsm).eq('org_id', orgId));
    ops.push(supabase.from('accounts').update({ csm_lead: newCsm }).eq('csm_lead', oldCsm).eq('org_id', orgId));
    ops.push(supabase.from('escalations').update({ csm: newCsm }).eq('csm', oldCsm).eq('org_id', orgId));
    ops.push(supabase.from('issues').update({ csm: newCsm }).eq('csm', oldCsm).eq('org_id', orgId));
    ops.push(supabase.from('issues').update({ csm_lead: newCsm }).eq('csm_lead', oldCsm).eq('org_id', orgId));
    ops.push(supabase.from('tasks').update({ assigned_to: newCsm }).eq('assigned_to', oldCsm).eq('org_id', orgId));
  }

  // id-keyed objects — the reliable path.
  ops.push(supabase.from('tasks').update({ assigned_to_id: new_user_id, assigned_to: newCsm }).eq('assigned_to_id', old_user_id).eq('org_id', orgId));
  ops.push(supabase.from('tasks').update({ assigned_by_id: new_user_id, assigned_by: newName }).eq('assigned_by_id', old_user_id).eq('org_id', orgId));
  ops.push(supabase.from('feature_requests').update({ created_by_id: new_user_id, created_by: newName }).eq('created_by_id', old_user_id).eq('org_id', orgId));
  ops.push(supabase.from('feature_requests').update({ approved_by_id: new_user_id, approved_by: newName }).eq('approved_by_id', old_user_id).eq('org_id', orgId));

  // Supabase returns { error } rather than throwing, so a table that doesn't
  // exist yet (pre-migration) is skipped without aborting the rest.
  await Promise.all(ops);

  if (deactivate_old) {
    await supabase.from('users').update({ is_active: false }).eq('id', old_user_id).eq('org_id', orgId);
  }

  return res.json({ success: true, from: oldName, to: newName, deactivated: !!deactivate_old });
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  let caller;
  try { caller = verifyToken(req); } catch { return res.status(401).json({ error: 'Unauthorized' }); }
  if (caller.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  const orgId = caller.org_id || 1;

  if (req.query.resource === 'api_keys' || req.body?.resource === 'api_keys') {
    return handleApiKeys(req, res, caller);
  }

  // Replace one user with another across every object they own/are tagged on.
  if (req.query.resource === 'replace' && req.method === 'POST') {
    return handleReplaceUser(req, res, caller, orgId);
  }

  const { id } = req.query;

  if (req.method === 'GET') {
    let { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, csm_name, csm_lead, team, last_active_at, is_active')
      .eq('org_id', orgId)
      .order('name');
    if (error) {
      ({ data, error } = await supabase
        .from('users')
        .select('id, name, email, role, csm_name, csm_lead')
        .eq('org_id', orgId)
        .order('name'));
    }
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  if (req.method === 'POST') {
    const { name, email, password, role, csm_name, csm_lead, team } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'name, email and password are required' });
    if (role && !ALLOWED_ROLES.includes(role))
      return res.status(400).json({ error: `Invalid role. Must be one of: ${ALLOWED_ROLES.join(', ')}` });
    const password_hash = bcrypt.hashSync(password, 10);
    const { data, error } = await supabase
      .from('users')
      .insert({ org_id: orgId, name, email: email.toLowerCase().trim(), password_hash, role: role || 'csm', csm_name: csm_name || null, csm_lead: csm_lead || null, team: team || null })
      .select('id, name, email, role, csm_name, csm_lead, team')
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  if (req.method === 'PUT') {
    if (!id) return res.status(400).json({ error: 'id required' });
    const { name, email, role, csm_name, csm_lead, team, password, is_active } = req.body;
    if (role && !ALLOWED_ROLES.includes(role))
      return res.status(400).json({ error: `Invalid role. Must be one of: ${ALLOWED_ROLES.join(', ')}` });
    if (is_active === false && String(id) === String(caller.id))
      return res.status(400).json({ error: 'You cannot deactivate your own account' });
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email.toLowerCase().trim();
    if (role !== undefined) updates.role = role;
    if (csm_name !== undefined) updates.csm_name = csm_name || null;
    if (csm_lead !== undefined) updates.csm_lead = csm_lead || null;
    if (team !== undefined) updates.team = team || null;
    if (is_active !== undefined) updates.is_active = !!is_active;
    if (password) updates.password_hash = bcrypt.hashSync(password, 10);

    let oldCsmName = null;
    if (csm_name !== undefined) {
      const { data: existing } = await supabase.from('users').select('csm_name').eq('id', id).eq('org_id', orgId).single();
      oldCsmName = existing?.csm_name || null;
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .eq('org_id', orgId)
      .select('id, name, email, role, csm_name, csm_lead, team, is_active')
      .single();
    if (error) return res.status(500).json({ error: error.message });

    const newCsmName = csm_name || null;
    if (oldCsmName && newCsmName && oldCsmName !== newCsmName) {
      await Promise.all([
        supabase.from('accounts').update({ csm: newCsmName }).eq('csm', oldCsmName).eq('org_id', orgId),
        supabase.from('accounts').update({ csm_lead: newCsmName }).eq('csm_lead', oldCsmName).eq('org_id', orgId),
        supabase.from('escalations').update({ csm: newCsmName }).eq('csm', oldCsmName).eq('org_id', orgId),
        supabase.from('issues').update({ csm: newCsmName }).eq('csm', oldCsmName).eq('org_id', orgId),
        supabase.from('issues').update({ csm_lead: newCsmName }).eq('csm_lead', oldCsmName).eq('org_id', orgId),
      ]);
    }
    return res.json(data);
  }

  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'id required' });
    if (String(id) === String(caller.id))
      return res.status(400).json({ error: 'Cannot delete your own account' });
    const { error } = await supabase.from('users').delete().eq('id', id).eq('org_id', orgId);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
