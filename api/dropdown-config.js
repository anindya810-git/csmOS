import supabase from './_utils/supabase.js';
import { verifyToken } from './_utils/auth.js';
import { setCors } from './_utils/cors.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  let user;
  try { user = verifyToken(req); } catch { return res.status(401).json({ error: 'Unauthorized' }); }

  if (req.method === 'GET') {
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

  const isAdmin = user.role === 'admin';
  const isCxStrategy = user.role === 'cx_strategy';
  if (!isAdmin && !isCxStrategy) return res.status(403).json({ error: 'Admin only' });

  const CX_ALLOWED = new Set([
    'escalation_status','ownership','escalated_by','ps_leader','trigger_reason',
    'source_of_escalation','issue_type','issue_sub_type','mrr_tier','rag_status',
    'billing_frequency','renewal_status','churn_status','contraction_risk','churn_risk',
    'implementation_status','nature_of_task','fr_related_to',
  ]);

  if (req.method === 'POST') {
    const { field_name, value, parent_value, sort_order } = req.body;
    if (!field_name || !value) return res.status(400).json({ error: 'field_name and value are required' });
    if (isCxStrategy && !CX_ALLOWED.has(field_name)) return res.status(403).json({ error: 'Not permitted' });
    const { data, error } = await supabase
      .from('dropdown_config')
      .insert({ field_name, value, parent_value: parent_value || null, sort_order: sort_order || 0 })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id required' });

  if (isCxStrategy) {
    const { data: row } = await supabase
      .from('dropdown_config').select('field_name').eq('id', id).maybeSingle();
    if (!row || !CX_ALLOWED.has(row.field_name))
      return res.status(403).json({ error: 'Not permitted' });
  }

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
