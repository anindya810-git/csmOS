import supabase from '../_utils/supabase.js';
import { verifyToken, generateApiKey, hashApiKey } from '../_utils/auth.js';
import { setCors } from '../_utils/cors.js';
import bcrypt from 'bcryptjs';

const ALLOWED_ROLES = ['admin', 'csm', 'sales', 'product', 'cx_strategy', 'ps'];

// API key management for the open REST API. Session-JWT + admin only
// (an API key can never create or revoke keys).
async function handleApiKeys(req, res, caller) {
  const { id } = req.query;

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, label, key_prefix, created_by, created_at, revoked_at, last_used_at')
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
      .insert({ label, key_hash: hashApiKey(key), key_prefix: key.slice(0, 12) + '…', created_by: caller.name || null })
      .select('id, label, key_prefix, created_by, created_at, revoked_at, last_used_at')
      .single();
    if (error) return res.status(500).json({ error: error.message });
    // The raw key is returned exactly once and never stored.
    return res.status(201).json({ ...data, key });
  }

  if (req.method === 'PUT') {
    if (!id) return res.status(400).json({ error: 'id required' });
    const revoked_at = req.body?.revoke ? new Date().toISOString() : null;
    const { data, error } = await supabase
      .from('api_keys')
      .update({ revoked_at })
      .eq('id', id)
      .select('id, label, key_prefix, created_by, created_at, revoked_at, last_used_at')
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'id required' });
    const { error } = await supabase.from('api_keys').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  let caller;
  try { caller = verifyToken(req); } catch { return res.status(401).json({ error: 'Unauthorized' }); }
  if (caller.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  if (req.query.resource === 'api_keys' || req.body?.resource === 'api_keys') {
    return handleApiKeys(req, res, caller);
  }

  const { id } = req.query;

  if (req.method === 'GET') {
    // Try to include the newer columns; fall back if they aren't migrated.
    let { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, csm_name, csm_lead, team, last_active_at')
      .order('name');
    if (error) {
      ({ data, error } = await supabase
        .from('users')
        .select('id, name, email, role, csm_name, csm_lead')
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
      .insert({ name, email: email.toLowerCase().trim(), password_hash, role: role || 'csm', csm_name: csm_name || null, csm_lead: csm_lead || null, team: team || null })
      .select('id, name, email, role, csm_name, csm_lead, team')
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  if (req.method === 'PUT') {
    if (!id) return res.status(400).json({ error: 'id required' });
    const { name, email, role, csm_name, csm_lead, team, password } = req.body;
    if (role && !ALLOWED_ROLES.includes(role))
      return res.status(400).json({ error: `Invalid role. Must be one of: ${ALLOWED_ROLES.join(', ')}` });
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email.toLowerCase().trim();
    if (role !== undefined) updates.role = role;
    if (csm_name !== undefined) updates.csm_name = csm_name || null;
    if (csm_lead !== undefined) updates.csm_lead = csm_lead || null;
    if (team !== undefined) updates.team = team || null;
    if (password) updates.password_hash = bcrypt.hashSync(password, 10);

    let oldCsmName = null;
    if (csm_name !== undefined) {
      const { data: existing } = await supabase.from('users').select('csm_name').eq('id', id).single();
      oldCsmName = existing?.csm_name || null;
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select('id, name, email, role, csm_name, csm_lead, team')
      .single();
    if (error) return res.status(500).json({ error: error.message });

    const newCsmName = csm_name || null;
    if (oldCsmName && newCsmName && oldCsmName !== newCsmName) {
      await Promise.all([
        supabase.from('accounts').update({ csm: newCsmName }).eq('csm', oldCsmName),
        supabase.from('accounts').update({ csm_lead: newCsmName }).eq('csm_lead', oldCsmName),
        supabase.from('escalations').update({ csm: newCsmName }).eq('csm', oldCsmName),
        supabase.from('issues').update({ csm: newCsmName }).eq('csm', oldCsmName),
        supabase.from('issues').update({ csm_lead: newCsmName }).eq('csm_lead', oldCsmName),
      ]);
    }
    return res.json(data);
  }

  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'id required' });
    if (String(id) === String(caller.id))
      return res.status(400).json({ error: 'Cannot delete your own account' });
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
