import supabase from '../../_utils/supabase.js';
import { verifyToken } from '../../_utils/auth.js';
import { setCors } from '../../_utils/cors.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  let user;
  try { user = verifyToken(req); } catch { return res.status(401).json({ error: 'Unauthorized' }); }
  if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  const { id } = req.query;

  if (req.method === 'PUT') {
    const { value, parent_value, sort_order } = req.body;
    const updates = {};
    if (value !== undefined) updates.value = value;
    if (parent_value !== undefined) updates.parent_value = parent_value || null;
    if (sort_order !== undefined) updates.sort_order = sort_order;

    const { data, error } = await supabase
      .from('dropdown_config')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase.from('dropdown_config').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
