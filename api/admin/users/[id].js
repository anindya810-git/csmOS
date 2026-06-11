import supabase from '../../_utils/supabase.js';
import { verifyToken } from '../../_utils/auth.js';
import { setCors } from '../../_utils/cors.js';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  let caller;
  try { caller = verifyToken(req); } catch { return res.status(401).json({ error: 'Unauthorized' }); }
  if (caller.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  const { id } = req.query;

  if (req.method === 'PUT') {
    const { name, email, role, csm_name, csm_lead, password } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email.toLowerCase().trim();
    if (role !== undefined) updates.role = role;
    if (csm_name !== undefined) updates.csm_name = csm_name || null;
    if (csm_lead !== undefined) updates.csm_lead = csm_lead || null;
    if (password) updates.password_hash = bcrypt.hashSync(password, 10);

    // Accounts/escalations/issues store the CSM as plain text — when the
    // display name changes, rename it everywhere or the user loses access
    // to their data and reports keep showing the old name.
    let oldCsmName = null;
    if (csm_name !== undefined) {
      const { data: existing } = await supabase.from('users').select('csm_name').eq('id', id).single();
      oldCsmName = existing?.csm_name || null;
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select('id, name, email, role, csm_name, csm_lead')
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
    if (String(id) === String(caller.id))
      return res.status(400).json({ error: 'Cannot delete your own account' });
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
