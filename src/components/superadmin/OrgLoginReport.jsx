import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

function daysBucket(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function getDayLabel(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function last30Days() {
  const days = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export default function OrgLoginReport({ org, onClose }) {
  const users = org.users || [];
  const days = useMemo(() => last30Days(), []);

  const activityByDay = useMemo(() => {
    const map = {};
    days.forEach(d => { map[d] = 0; });
    users.forEach(u => {
      const bucket = daysBucket(u.last_active_at);
      if (bucket && map[bucket] !== undefined) {
        map[bucket]++;
      }
    });
    return days.map(d => ({ date: d, label: getDayLabel(d), users: map[d] }));
  }, [users, days]);

  const totalUsers = users.length;
  const activeToday = users.filter(u => daysBucket(u.last_active_at) === days[days.length - 1]).length;
  const active7d = users.filter(u => {
    const b = daysBucket(u.last_active_at);
    return b && b >= days[days.length - 7];
  }).length;
  const active30d = users.filter(u => {
    const b = daysBucket(u.last_active_at);
    return b && b >= days[0];
  }).length;
  const neverActive = users.filter(u => !u.last_active_at).length;

  const sortedUsers = [...users].sort((a, b) => {
    if (!a.last_active_at && !b.last_active_at) return 0;
    if (!a.last_active_at) return 1;
    if (!b.last_active_at) return -1;
    return new Date(b.last_active_at) - new Date(a.last_active_at);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 overflow-y-auto py-8">
      <div className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-4xl mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h2 className="text-lg font-bold text-white">User Activity Report</h2>
            <p className="text-xs text-gray-500 mt-0.5">{org.name} · last 30 days based on last active date</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-gray-800 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Users', value: totalUsers, color: 'text-white' },
              { label: 'Active Today', value: activeToday, color: 'text-emerald-400' },
              { label: 'Active (7d)', value: active7d, color: 'text-brand-400' },
              { label: 'Never Active', value: neverActive, color: 'text-gray-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Daily Active Users (Last 30 Days)</p>
            {active30d === 0 ? (
              <p className="text-sm text-gray-600 text-center py-8">No activity recorded in the last 30 days</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={activityByDay} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                    tickLine={false}
                    axisLine={false}
                    interval={4}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#D1D5DB' }}
                    itemStyle={{ color: '#34D399' }}
                    formatter={(v) => [v, 'Users']}
                  />
                  <Bar dataKey="users" fill="#10B981" radius={[3, 3, 0, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Users table */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-800">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Users — sorted by last activity</p>
            </div>
            <div className="overflow-auto max-h-64">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-600 uppercase">Name</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase">Email</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase">Role</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {sortedUsers.map(u => (
                    <tr key={u.id}>
                      <td className="px-5 py-2.5 text-white font-medium">{u.name}</td>
                      <td className="px-4 py-2.5 text-gray-400 text-xs">{u.email}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-brand-900 text-brand-300' : 'bg-gray-800 text-gray-400'}`}>{u.role}</span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">
                        {u.last_active_at
                          ? new Date(u.last_active_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : <span className="text-gray-700">Never</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
