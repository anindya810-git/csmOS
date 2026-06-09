import supabase from '../_utils/supabase.js';
import { verifyToken } from '../_utils/auth.js';
import { setCors } from '../_utils/cors.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  let decoded;
  try { decoded = verifyToken(req); } catch { return res.status(401).json({ error: 'Invalid token' }); }

  const { data: users } = await supabase
    .from('users')
    .select('id, name, email, role, csm_name')
    .eq('id', decoded.id)
    .limit(1);

  if (!users?.[0]) return res.status(401).json({ error: 'User not found' });
  res.json(users[0]);
}
