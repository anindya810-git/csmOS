import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function deriveStatus(task) {
  if (task.derived_status) return task.derived_status;
  if (task.status === 'Completed') return 'Completed';
  if (task.due_date && new Date(task.due_date) < new Date()) return 'Overdue';
  return 'Open';
}

function fmtDT(s) {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
    });
  } catch { return s; }
}

export default function TaskPivotReport() {
  const [tasks,   setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState('open');
  const [sortDir,   setSortDir]   = useState('desc');

  useEffect(() => {
    axios.get('/api/tasks')
      .then(r => setTasks(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // CSM-wise pivot
  const csmRows = useMemo(() => {
    const map = {};
    for (const t of tasks) {
      const key = t.assigned_to || '(Unassigned)';
      if (!map[key]) map[key] = { csm: key, open: 0, overdue: 0, completed: 0, total: 0, nextDue: null };
      const ds = deriveStatus(t);
      map[key].total++;
      if (ds === 'Open')      { map[key].open++;      if (!map[key].nextDue || new Date(t.due_date) < new Date(map[key].nextDue)) map[key].nextDue = t.due_date; }
      if (ds === 'Overdue')   { map[key].overdue++;   }
      if (ds === 'Completed') map[key].completed++;
    }
    const list = Object.values(map);
    list.sort((a, b) => {
      const va = a[sortField] ?? '', vb = b[sortField] ?? '';
      if (sortDir === 'asc') return va > vb ? 1 : -1;
      return va < vb ? 1 : -1;
    });
    return list;
  }, [tasks, sortField, sortDir]);

  // 6-month task trend
  const trend = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ year: d.getFullYear(), month: d.getMonth(), label: `${MON[d.getMonth()]} ${String(d.getFullYear()).slice(2)}` });
    }
    return months.map(m => {
      const monthTasks = tasks.filter(t => {
        const d = new Date(t.created_at);
        return !isNaN(d) && d.getFullYear() === m.year && d.getMonth() === m.month;
      });
      const done = tasks.filter(t => {
        if (!t.completed_at) return false;
        const d = new Date(t.completed_at);
        return !isNaN(d) && d.getFullYear() === m.year && d.getMonth() === m.month;
      });
      return { label: m.label, Created: monthTasks.length, Completed: done.length };
    });
  }, [tasks]);

  const totals = useMemo(() => ({
    total:     tasks.length,
    open:      tasks.filter(t => deriveStatus(t) === 'Open').length,
    overdue:   tasks.filter(t => deriveStatus(t) === 'Overdue').length,
    completed: tasks.filter(t => deriveStatus(t) === 'Completed').length,
  }), [tasks]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const Th = ({ field, children, right }) => (
    <th onClick={() => handleSort(field)}
      className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700 transition select-none whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}>
      <span className="inline-flex items-center gap-1">
        {children}
        {sortField === field && (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortDir === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
          </svg>
        )}
      </span>
    </th>
  );

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Tasks',  value: totals.total,     color: 'text-gray-900' },
          { label: 'Open',         value: totals.open,      color: 'text-blue-700' },
          { label: 'Overdue',      value: totals.overdue,   color: 'text-red-600' },
          { label: 'Completed',    value: totals.completed, color: 'text-green-700' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Trend chart */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">6-Month Task Trend</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={trend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Created"   fill="#818cf8" radius={[4,4,0,0]} barSize={22} />
            <Bar dataKey="Completed" fill="#22c55e" radius={[4,4,0,0]} barSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* CSM Pivot table */}
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <Th field="csm">CSM</Th>
              <Th field="total"     right>Total</Th>
              <Th field="open"      right>Open</Th>
              <Th field="overdue"   right>Overdue</Th>
              <Th field="completed" right>Completed</Th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">Next Due</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {csmRows.map(r => (
              <tr key={r.csm} className="hover:bg-gray-50 transition">
                <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{r.csm}</td>
                <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-700">{r.total}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {r.open > 0 ? <span className="text-blue-700 font-medium">{r.open}</span> : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {r.overdue > 0 ? <span className="text-red-600 font-semibold">{r.overdue}</span> : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {r.completed > 0 ? <span className="text-green-700 font-medium">{r.completed}</span> : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDT(r.nextDue)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-gray-200 bg-gray-50">
            <tr>
              <td className="px-4 py-3 font-bold text-gray-800">Total</td>
              <td className="px-4 py-3 text-right font-bold tabular-nums text-gray-800">{totals.total}</td>
              <td className="px-4 py-3 text-right font-bold tabular-nums text-blue-700">{totals.open || '—'}</td>
              <td className="px-4 py-3 text-right font-bold tabular-nums text-red-600">{totals.overdue || '—'}</td>
              <td className="px-4 py-3 text-right font-bold tabular-nums text-green-700">{totals.completed || '—'}</td>
              <td className="px-4 py-3" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
