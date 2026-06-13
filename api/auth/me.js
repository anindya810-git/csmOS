import supabase from '../_utils/supabase.js';
import { verifyToken } from '../_utils/auth.js';
import { setCors } from '../_utils/cors.js';
import { getOrgFeatures } from '../_utils/features.js';

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
      features: await getOrgFeatures(decoded.org_id),
    });
  }

  // Stamp activity and read the profile in one round-trip.
  // Falls back progressively when columns aren't migrated yet.
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
    // org_id or last_active_at may not be migrated yet — try progressively simpler selects
    const { data: withOrgId } = await supabase
      .from('users')
      .select('id, name, email, role, csm_name, org_id')
      .eq('id', decoded.id)
      .limit(1);
    if (withOrgId?.length) {
      user = withOrgId[0];
    } else {
      const { data: plain } = await supabase
        .from('users')
        .select('id, name, email, role, csm_name')
        .eq('id', decoded.id)
        .limit(1);
      user = plain?.[0] || null;
    }
  }

  if (!user) return res.status(401).json({ error: 'User not found' });
  user.features = await getOrgFeatures(user.org_id);
  res.json(user);
}
