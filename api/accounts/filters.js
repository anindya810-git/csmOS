import supabase from '../_utils/supabase.js';
import { verifyToken } from '../_utils/auth.js';
import { setCors } from '../_utils/cors.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  let user;
  try { user = verifyToken(req); } catch { return res.status(401).json({ error: 'Unauthorized' }); }

  let filtersQuery = supabase.from('accounts').select('csm, csm_lead, industry, region, mrr_tier');
  if (user.role === 'csm') filtersQuery = filtersQuery.eq('csm', user.csm_name);
  const { data, error } = await filtersQuery;
  if (error) return res.status(500).json({ error: error.message });

  const csms      = [...new Set(data.map(a => a.csm).filter(Boolean))].sort();
  const csmLeads  = [...new Set(data.map(a => a.csm_lead).filter(Boolean))].sort();
  const industries = [...new Set(data.map(a => a.industry).filter(Boolean))].sort();
  const regions   = [...new Set(data.map(a => a.region).filter(Boolean))].sort();
  const tiers     = [...new Set(data.map(a => a.mrr_tier).filter(Boolean))].sort();

  const csmLeadMap = {};
  data.forEach(a => {
    if (a.csm && a.csm_lead && !csmLeadMap[a.csm]) csmLeadMap[a.csm] = a.csm_lead;
  });

  res.json({ csms, csmLeads, csmLeadMap, industries, regions, tiers });
}
