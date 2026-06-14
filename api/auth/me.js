import supabase from '../_utils/supabase.js';
import { verifyToken } from '../_utils/auth.js';
import { setCors } from '../_utils/cors.js';
import { getOrgMeta } from '../_utils/features.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  let decoded;
  try { decoded = verifyToken(req); } catch { return res.status(401).json({ error: 'Invalid token' }); }

  // Both normal and impersonation tokens carry a real user id, so the
  // impersonated session resolves to the SAME profile the org user would see
  // (features, theme, reportees, branding) — support access mirrors the org
  // member exactly, never a stripped-down view.
  const impersonated = !!decoded.impersonated;

  // Stamp activity and read the profile in one round-trip — but only for a
  // genuine session. Impersonation must not pollute the real user's
  // last_active_at with support visits, so it reads without stamping.
  let user = null;

  if (!impersonated) {
    const { data: stamped } = await supabase
      .from('users')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', decoded.id)
      .select('id, name, email, role, csm_name, org_id, is_active')
      .maybeSingle();

    if (stamped) {
      user = stamped;
    } else {
      // org_id / last_active_at / is_active may not be migrated yet — try progressively simpler selects
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
  } else {
    const { data } = await supabase
      .from('users')
      .select('id, name, email, role, csm_name, org_id, is_active')
      .eq('id', decoded.id)
      .maybeSingle();
    user = data;
  }

  if (!user) return res.status(401).json({ error: 'User not found' });
  // Deactivated mid-session → end the session (AuthContext drops the token on 403).
  // Impersonation is exempt so support can still inspect a deactivated account.
  if (!impersonated && user.is_active === false) return res.status(403).json({ error: 'Account deactivated' });

  // Attach direct reportees so the frontend can restrict CSM dropdowns to the
  // user's own team (self + people whose csm_lead = this user's csm_name).
  let reportees = [];
  if (user.csm_name && user.org_id) {
    const { data: reps } = await supabase
      .from('users')
      .select('id, name, csm_name')
      .eq('org_id', user.org_id)
      .eq('csm_lead', user.csm_name);
    reportees = (reps || []).filter(r => r.csm_name || r.name);
  }
  user.reportees = reportees;

  const meta = await getOrgMeta(user.org_id);
  user.features     = meta.features;
  user.org_logo_url = meta.logo_url;
  user.org_name     = meta.org_name;
  user.org_theme    = meta.theme_color || null;
  // Surface the support context so the UI can show an "impersonating" banner.
  if (impersonated) user.impersonated_by = decoded.impersonated_by;
  res.json(user);
}
