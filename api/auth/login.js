import bcrypt from 'bcryptjs';
import supabase from '../_utils/supabase.js';
import { signToken } from '../_utils/auth.js';
import { setCors } from '../_utils/cors.js';
import { normalizeHost } from '../_utils/domain.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Public branding lookup for white-label custom domains. The login screen
  // calls this BEFORE auth to decide whether the current hostname belongs to
  // an org (→ show that org's logo, skip the Custally landing page) or not
  // (→ canonical domain, show the normal Custally landing page). Returns only
  // public branding (name + logo) for an exact custom_domain match.
  if (req.method === 'GET') {
    const host = normalizeHost(req.query.host || req.headers.host);
    if (!host) return res.json({ found: false });
    const { data } = await supabase
      .from('organizations')
      .select('id, name, logo_url, custom_domain')
      .eq('custom_domain', host)
      .maybeSingle();
    if (!data) return res.json({ found: false });
    return res.json({ found: true, org_id: data.id, org_name: data.name, logo_url: data.logo_url || null });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .limit(1);

  if (error) return res.status(500).json({ error: 'Database error' });

  const user = users?.[0];
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  // Deactivated users cannot log in. (is_active is undefined pre-migration → allowed.)
  if (user.is_active === false)
    return res.status(403).json({ error: 'Your account has been deactivated. Contact your administrator.' });

  const orgId = user.org_id || 1;

  // organizations table may not exist yet (pre-migration) — when it does, read
  // suspension, features and branding. select('*') so a not-yet-migrated column
  // never errors the query; maybeSingle returns data:null on error, which is safe.
  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .maybeSingle();

  if (org?.billing_status === 'suspended') {
    return res.status(403).json({ error: 'Account suspended. Contact your administrator.' });
  }
  const orgName = org?.name || null;
  const features = org?.features || {};
  const logoUrl = org?.logo_url || null;

  const token = signToken({
    id: user.id, email: user.email, role: user.role,
    name: user.name, csm_name: user.csm_name, org_id: orgId,
  });
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, csm_name: user.csm_name, org_id: orgId, org_name: orgName, org_logo_url: logoUrl, features },
  });
}
