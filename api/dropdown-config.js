import supabase from './_utils/supabase.js';
import { verifyToken } from './_utils/auth.js';
import { setCors } from './_utils/cors.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try { verifyToken(req); } catch { return res.status(401).json({ error: 'Unauthorized' }); }

  const { data, error } = await supabase
    .from('dropdown_config')
    .select('*')
    .order('sort_order')
    .order('value');

  if (error) return res.status(500).json({ error: error.message });

  const grouped = {};
  data.forEach(row => {
    if (!grouped[row.field_name]) grouped[row.field_name] = [];
    grouped[row.field_name].push(row);
  });

  return res.json(grouped);
}
