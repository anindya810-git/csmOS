import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

const RAG_COLORS = { Green: '#22c55e', Amber: '#f59e0b', Red: '#ef4444' };

function fmt(n) {
  if (!n) return '—';
  if (n >= 10000000) return `₹${(n/10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n/100000).toFixed(1)}L`;
  return `₹${n.toLocaleString()}`;
}

function StatCard({ label, value, color }) {
  return (
    <div className="card flex flex-col gap-1">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold ${color || 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { axios.get('/api/accounts/stats').then(r => setStats(r.data)); }, []);

  if (!stats) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;

  const { total, byRag, byIndustry, byCsm, renewalPending, churnRisk } = stats;
  const ragMap = Object.fromEntries(byRag.map(r => [r.rag_status, r.count]));
  const pieData = byRag.map(r => ({ name: r.rag_status, value: r.count }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Portfolio Overview</h1>
        <p className="text-gray-500 text-sm mt-0.5">All accounts under management</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Total MRR" value={fmt(total.total_mrr)} />
        <StatCard label="Accounts" value={total.count} />
        <StatCard label="Renewal Pending" value={renewalPending.count} color="text-amber-600" />
        <StatCard label="Churn Risk" value={churnRisk.count} color="text-red-600" />
        <StatCard label="Red" value={ragMap.Red || 0} color="text-red-600" />
        <StatCard label="Amber" value={ragMap.Amber || 0} color="text-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">RAG Distribution</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                {pieData.map((entry, i) => <Cell key={i} fill={RAG_COLORS[entry.name] || '#94a3b8'} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: RAG_COLORS[d.name] }} />
                <span className="text-xs text-gray-600">{d.name} ({d.value})</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">CSM Portfolio (by MRR)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byCsm.slice(0, 8)} layout="vertical" margin={{ left: 60, right: 20 }}>
              <XAxis type="number" tickFormatter={v => fmt(v)} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="csm" tick={{ fontSize: 11 }} width={60} />
              <Tooltip formatter={v => fmt(v)} />
              <Bar dataKey="mrr" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Industry Breakdown</h2>
          <div className="space-y-2">
            {byIndustry.slice(0, 8).map(ind => (
              <div key={ind.industry} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm text-gray-700 truncate">{ind.industry}</span>
                  <span className="text-xs text-gray-400 shrink-0">({ind.count})</span>
                </div>
                <span className="text-sm font-medium text-gray-900 ml-2">{fmt(ind.mrr)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">At-Risk Accounts</h2>
          <AtRiskList navigate={navigate} />
        </div>
      </div>
    </div>
  );
}

function AtRiskList({ navigate }) {
  const [accounts, setAccounts] = useState([]);
  useEffect(() => {
    axios.get('/api/accounts?rag_status=Red').then(r => setAccounts(r.data.slice(0, 6)));
  }, []);
  if (!accounts.length) return <p className="text-sm text-gray-400">No red accounts.</p>;
  return (
    <div className="space-y-2">
      {accounts.map(a => (
        <div key={a.id} onClick={() => navigate(`/accounts/${a.id}`)}
          className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition group">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate group-hover:text-brand-700">{a.account_name}</p>
            <p className="text-xs text-gray-400">{a.csm} · {a.industry}</p>
          </div>
          <div className="ml-3 text-right shrink-0">
            <span className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">Red</span>
            <p className="text-xs text-gray-400 mt-0.5">{a.churn_status || '—'}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
