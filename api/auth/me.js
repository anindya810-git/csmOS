import supabase from '../_utils/supabase.js';
import { verifyToken } from '../_utils/auth.js';
import { setCors } from '../_utils/cors.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  let decoded;
  try { decoded = verifyToken(req); } catch { return res.status(401).json({ error: 'Invalid token' }); }

  // Impersonation tokens are fully self-contained — no DB lookup needed.
  if (decoded.impersonated) {
    return res.json({
      id: decoded.id, name: decoded.name, email: decoded.email,
      role: decoded.role, csm_name: decoded.csm_name,
      org_id: decoded.org_id, impersonated_by: decoded.impersonated_by,
    });
  }

  // Stamp activity and read the profile in one round-trip. If last_active_at
  // hasn't been migrated yet, fall back to a plain select so auth keeps working.
  let user = null;
  const { data: stamped } = await supabase
    .from('users')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', decoded.id)
    .select('id, name, email, role, csm_name, org_id')
    .maybeSingle();
  if (stamped) {
    user = stamped;
  } else {
    const { data: rows } = await supabase
      .from('users')
      .select('id, name, email, role, csm_name, org_id')
      .eq('id', decoded.id)
      .limit(1);
    user = rows?.[0] || null;
  }

  if (!user) return res.status(401).json({ error: 'User not found' });
  res.json(user);
}
