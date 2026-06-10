import supabase from '../_utils/supabase.js';
import { verifyToken } from '../_utils/auth.js';
import { setCors } from '../_utils/cors.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  let user;
  try { user = verifyToken(req); } catch { return res.status(401).json({ error: 'Unauthorized' }); }

  let statsQuery = supabase.from('accounts').select('id, rag_status, industry, csm, mrr, churn_status, churn_risk, renewal_status');
  if (user.role === 'csm') statsQuery = statsQuery.eq('csm', user.csm_name);
  const { data: accounts, error } = await statsQuery;

  if (error) return res.status(500).json({ error: error.message });

  const total = {
    count: accounts.length,
    total_mrr: accounts.reduce((s, a) => s + (a.mrr || 0), 0)
  };

  const ragCounts = {};
  accounts.forEach(a => { if (a.rag_status) ragCounts[a.rag_status] = (ragCounts[a.rag_status] || 0) + 1; });
  const byRag = Object.entries(ragCounts).map(([rag_status, count]) => ({ rag_status, count }));

  const industryMap = {};
  accounts.forEach(a => {
    if (!a.industry) return;
    if (!industryMap[a.industry]) industryMap[a.industry] = { count: 0, mrr: 0 };
    industryMap[a.industry].count++;
    industryMap[a.industry].mrr += (a.mrr || 0);
  });
  const byIndustry = Object.entries(industryMap)
    .map(([industry, v]) => ({ industry, ...v }))
    .sort((a, b) => b.mrr - a.mrr);

  const csmMap = {};
  accounts.forEach(a => {
    if (!a.csm) return;
    if (!csmMap[a.csm]) csmMap[a.csm] = { count: 0, mrr: 0 };
    csmMap[a.csm].count++;
    csmMap[a.csm].mrr += (a.mrr || 0);
  });
  const byCsm = Object.entries(csmMap)
    .map(([csm, v]) => ({ csm, ...v }))
    .sort((a, b) => b.mrr - a.mrr);

  const churnMap = {};
  accounts.forEach(a => { if (a.churn_status) churnMap[a.churn_status] = (churnMap[a.churn_status] || 0) + 1; });
  const byChurn = Object.entries(churnMap).map(([churn_status, count]) => ({ churn_status, count }));

  const renewalPending = { count: accounts.filter(a => a.renewal_status === 'Renewal Pending').length };
  const churnRisk = { count: accounts.filter(a => a.churn_risk === 'Yes' || ['Churn Activated', 'Churn Predicted'].includes(a.churn_status)).length };

  res.json({ total, byRag, byIndustry, byChurn, byCsm, renewalPending, churnRisk });
}
