import supabase from '../_utils/supabase.js';
import { verifyToken } from '../_utils/auth.js';
import { setCors } from '../_utils/cors.js';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  let user;
  try { user = verifyToken(req); } catch { return res.status(401).json({ error: 'Unauthorized' }); }
  if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, csm_name')
      .order('name');
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  if (req.method === 'POST') {
    const { name, email, password, role, csm_name } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'name, email and password are required' });
    const password_hash = bcrypt.hashSync(password, 10);
    const { data, error } = await supabase
      .from('users')
      .insert({ name, email: email.toLowerCase().trim(), password_hash, role: role || 'csm', csm_name: csm_name || null })
      .select('id, name, email, role, csm_name')
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  res.status(405).json({ error: 'Method not allowed' });
}
