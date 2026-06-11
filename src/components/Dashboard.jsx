import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';

const RAG_COLORS = { Green: '#22c55e', Amber: '#f59e0b', Red: '#ef4444' };
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmt(n) {
  if (!n) return '—';
  if (n >= 10000000) return `₹${(n/10000000).toFixed(1)}Cr`;
  if (n >= 100000)   return `₹${(n/100000).toFixed(1)}L`;
  return `₹${n.toLocaleString()}`;
}

function fmtDate(s) {
  const d = new Date(s);
  if (isNaN(d)) return null;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const isActive = s => s !== 'Resolved' && s !== 'Closed';

function KpiCard({ label, value, sub, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className="card flex flex-col gap-1 text-left hover:shadow-md hover:border-brand-200 transition cursor-pointer"
    >
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold ${color || 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </button>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats,       setStats]       = useState(null);
  const [accounts,    setAccounts]    = useState([]);
  const [escalations, setEscalations] = useState([]);
  const [issues,      setIssues]      = useState([]);
  const [tasks,       setTasks]       = useState([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get('/api/accounts?stats=1'),
      axios.get('/api/accounts'),
      axios.get('/api/escalations'),
      axios.get('/api/issues'),
      axios.get('/api/tasks'),
    ]).then(([st, acc, esc, iss, tsk]) => {
      setStats(st.data);
      setAccounts(acc.data || []);
      setEscalations(esc.data || []);
      setIssues(iss.data || []);
      setTasks(tsk.data || []);
    }).finally(() => setLoading(false));
  }, []);

  // ---- Derived metrics ----
  const activeEscalations = useMemo(() => escalations.filter(e => isActive(e.status)), [escalations]);
  const activeIssues      = useMemo(() => issues.filter(i => isActive(i.status)), [issues]);

  const openTasks    = useMemo(() => tasks.filter(t => t.derived_status === 'Open').length, [tasks]);
  const overdueTasks = useMemo(() => tasks.filter(t => t.derived_status === 'Overdue').length, [tasks]);
  const dueTodayTasks = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    return tasks.filter(t => {
      if (t.derived_status === 'Completed') return false;
      const d = new Date(t.due_date);
      return !isNaN(d) && d >= today && d < tomorrow;
    }).length;
  }, [tasks]);

  const atRiskMrr = useMemo(() =>
    accounts.filter(a => a.rag_status === 'Red' || a.rag_status === 'Amber')
            .reduce((s, a) => s + (a.mrr || 0), 0),
  [accounts]);

  const upcomingRenewals = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    const horizon = new Date(today); horizon.setDate(horizon.getDate() + 90);
    return accounts
      .map(a => ({ ...a, _renewal: new Date(a.renewal_date) }))
      .filter(a => !isNaN(a._renewal) && a._renewal >= today && a._renewal <= horizon)
      .sort((a, b) => a._renewal - b._renewal);
  }, [accounts]);

  // 6-month trend: escalations raised, issues reported, issue resolution %
  const trend = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: `${MON[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
        year: d.getFullYear(), month: d.getMonth(),
      });
    }
    return months.map(m => {
      const monthIssues = issues.filter(i => {
        const d = new Date(i.reported_date);
        return !isNaN(d) && d.getFullYear() === m.year && d.getMonth() === m.month;
      });
      const monthEsc = escalations.filter(e => {
        const d = new Date(e.date_of_escalation);
        return !isNaN(d) && d.getFullYear() === m.year && d.getMonth() === m.month;
      });
      const resolved = monthIssues.filter(i => !isActive(i.status)).length;
      return {
        label: m.label,
        Issues: monthIssues.length,
        Escalations: monthEsc.length,
        'Resolution %': monthIssues.length ? Math.round(resolved / monthIssues.length * 100) : null,
      };
    });
  }, [issues, escalations]);

  // CSM workload: accounts, MRR, active escalations, active issues, open tasks
  const csmWorkload = useMemo(() => {
    const map = {};
    const get = (csm) => {
      const k = csm || '(Unassigned)';
      if (!map[k]) map[k] = { csm: k, accounts: 0, mrr: 0, esc: 0, iss: 0, tasks: 0 };
      return map[k];
    };
    for (const a of accounts) { const r = get(a.csm); r.accounts++; r.mrr += a.mrr || 0; }
    for (const e of activeEscalations) get(e.csm).esc++;
    for (const i of activeIssues)      get(i.csm).iss++;
    for (const t of tasks) {
      if (t.derived_status !== 'Completed') {
        const k = t.assigned_to || '(Unassigned)';
        if (!map[k]) map[k] = { csm: k, accounts: 0, mrr: 0, esc: 0, iss: 0, tasks: 0 };
        map[k].tasks++;
      }
    }
    return Object.values(map)
      .filter(r => r.accounts > 0 || r.esc > 0 || r.iss > 0 || r.tasks > 0)
      .sort((a, b) => (b.esc + b.iss) - (a.esc + a.iss));
  }, [accounts, activeEscalations, activeIssues, tasks]);

  // Hotspot accounts: most open escalations + issues
  const hotspots = useMemo(() => {
    const map = {};
    const get = (id, name) => {
      if (!map[id]) map[id] = { id, name, esc: 0, iss: 0 };
      return map[id];
    };
    for (const e of activeEscalations) if (e.account_id) get(e.account_id, e.account_name).esc++;
    for (const i of activeIssues)      if (i.account_id) get(i.account_id, i.account_name).iss++;
    const acctById = Object.fromEntries(accounts.map(a => [a.id, a]));
    return Object.values(map)
      .map(h => ({ ...h, total: h.esc + h.iss, rag: acctById[h.id]?.rag_status, mrr: acctById[h.id]?.mrr }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [activeEscalations, activeIssues, accounts]);

  if (loading || !stats) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const { total, byRag } = stats;
  const pieData = byRag.map(r => ({ name: r.rag_status, value: r.count }));
  const openEsc = activeEscalations.filter(e => e.status === 'Open').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Command Center</h1>
        <p className="text-gray-500 text-sm mt-0.5">Portfolio health, workload and trends at a glance</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
        <KpiCard label="Total MRR" value={fmt(total.total_mrr)} sub={`${total.count} accounts`} onClick={() => navigate('/accounts')} />
        <KpiCard label="At-Risk MRR" value={fmt(atRiskMrr)} sub="Red + Amber accounts" color="text-red-600" onClick={() => navigate('/rag')} />
        <KpiCard label="Active Escalations" value={activeEscalations.length} sub={openEsc ? `${openEsc} open` : 'none open'} color={activeEscalations.length ? 'text-orange-600' : 'text-gray-400'} onClick={() => navigate('/escalations')} />
        <KpiCard label="Active Issues" value={activeIssues.length} sub={`of ${issues.length} total`} color={activeIssues.length ? 'text-amber-600' : 'text-gray-400'} onClick={() => navigate('/issues')} />
        <KpiCard label="Open Tasks" value={openTasks + overdueTasks} sub={overdueTasks ? `${overdueTasks} overdue` : 'none overdue'} color={overdueTasks ? 'text-red-600' : (openTasks + overdueTasks) ? 'text-blue-700' : 'text-gray-400'} onClick={() => navigate('/tasks')} />
        <KpiCard label="Due Today" value={dueTodayTasks} sub="tasks due" color={dueTodayTasks ? 'text-amber-600' : 'text-gray-400'} onClick={() => navigate('/tasks')} />
        <KpiCard label="Renewals (90d)" value={upcomingRenewals.length} sub={fmt(upcomingRenewals.reduce((s,a) => s + (a.mrr||0), 0))} color="text-sky-700" onClick={() => navigate('/reports/renewals')} />
        <KpiCard label="Issue Resolution" value={issues.length ? `${Math.round(issues.filter(i => !isActive(i.status)).length / issues.length * 100)}%` : '—'} sub="all-time resolved" color="text-green-700" onClick={() => navigate('/reports/issues-pivot')} />
      </div>

      {/* Trends + RAG */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">6-Month Trend</h2>
            <span className="hidden sm:inline text-xs text-gray-400">Issues · escalations · resolution %</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={trend} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="count" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis yAxisId="pct" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} width={40} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="count" dataKey="Issues" fill="#818cf8" radius={[4, 4, 0, 0]} barSize={22} />
              <Bar yAxisId="count" dataKey="Escalations" fill="#fb923c" radius={[4, 4, 0, 0]} barSize={22} />
              <Line yAxisId="pct" dataKey="Resolution %" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

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
      </div>

      {/* CSM workload + Hotspots */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <h2 className="text-sm font-semibold text-gray-700">CSM Workload</h2>
            <Link to="/reports/account-mapping" className="text-xs text-brand-600 hover:underline font-medium">Full report →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-y border-gray-100">
                <tr>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">CSM</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Accounts</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">MRR</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Active Esc</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Active Issues</th>
                  <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Open Tasks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {csmWorkload.slice(0, 8).map(r => (
                  <tr key={r.csm} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-2.5 font-medium text-gray-800 whitespace-nowrap">{r.csm}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">{r.accounts}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-600 whitespace-nowrap">{fmt(r.mrr)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {r.esc > 0 ? <span className="font-semibold text-orange-600">{r.esc}</span> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {r.iss > 0 ? <span className="font-semibold text-amber-600">{r.iss}</span> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums">
                      {r.tasks > 0 ? <span className="font-semibold text-blue-600">{r.tasks}</span> : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Hotspot Accounts</h2>
          <p className="text-xs text-gray-400 -mt-2 mb-3">Most active escalations + issues</p>
          {hotspots.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Nothing active. All clear.</p>
          ) : (
            <div className="space-y-1.5">
              {hotspots.map(h => (
                <div key={h.id} onClick={() => navigate(`/accounts/${h.id}`)}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer transition group">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {h.rag && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: RAG_COLORS[h.rag] || '#94a3b8' }} />}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate group-hover:text-brand-700">{h.name}</p>
                      <p className="text-xs text-gray-400">{fmt(h.mrr)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3 text-xs">
                    {h.esc > 0 && <span className="font-medium text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">{h.esc} esc</span>}
                    {h.iss > 0 && <span className="font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">{h.iss} issues</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Renewals + At-risk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Upcoming Renewals (90 days)</h2>
            <Link to="/reports/renewals" className="text-xs text-brand-600 hover:underline font-medium">All renewals →</Link>
          </div>
          {upcomingRenewals.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No renewals due in the next 90 days.</p>
          ) : (
            <div className="space-y-1.5">
              {upcomingRenewals.slice(0, 6).map(a => (
                <div key={a.id} onClick={() => navigate(`/accounts/${a.id}`)}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer transition group">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate group-hover:text-brand-700">{a.account_name}</p>
                    <p className="text-xs text-gray-400">{a.csm || '—'} · {fmt(a.mrr)}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-semibold text-gray-700">{fmtDate(a.renewal_date)}</p>
                    {a.renewal_status && <p className="text-xs text-gray-400">{a.renewal_status}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
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
  if (!accounts.length) return <p className="text-sm text-gray-400 italic">No red accounts.</p>;
  return (
    <div className="space-y-1.5">
      {accounts.map(a => (
        <div key={a.id} onClick={() => navigate(`/accounts/${a.id}`)}
          className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer transition group">
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
