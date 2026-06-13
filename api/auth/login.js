import bcrypt from 'bcryptjs';
import supabase from '../_utils/supabase.js';
import { signToken } from '../_utils/auth.js';
import { setCors } from '../_utils/cors.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
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

  const orgId = user.org_id || 1;
  let orgName = null;
  let features = {};

  // organizations table may not exist yet (pre-migration) — when it does,
  // check for suspension and read feature entitlements. maybeSingle returns
  // data:null on error, which is safe.
  const { data: org } = await supabase
    .from('organizations')
    .select('billing_status, name, features')
    .eq('id', orgId)
    .maybeSingle();

  if (org?.billing_status === 'suspended') {
    return res.status(403).json({ error: 'Account suspended. Contact your administrator.' });
  }
  orgName = org?.name || null;
  features = org?.features || {};

  const token = signToken({
    id: user.id, email: user.email, role: user.role,
    name: user.name, csm_name: user.csm_name, org_id: orgId,
  });
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, csm_name: user.csm_name, org_id: orgId, org_name: orgName, features },
  });
}
