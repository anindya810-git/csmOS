import React, { useState, useEffect } from 'react';
import api from '../../utils/superadminAxios';

function StatCard({ label, value, sub, color = 'brand' }) {
  const colors = {
    brand: 'text-brand-400',
    green: 'text-emerald-400',
    amber: 'text-amber-400',
    red:   'text-red-400',
    cyan:  'text-cyan-400',
  };
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-bold ${colors[color] || colors.brand}`}>{value ?? '–'}</p>
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
    </div>
  );
}

export default function SuperadminDashboard() {
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/superadmin?resource=stats').then(r => setStats(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 sm:p-8 space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">Platform-wide overview across all organisations</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="Total Orgs"        value={stats?.totalOrgs}        color="brand" />
            <StatCard label="Active Orgs"        value={stats?.activeOrgs ?? 0}   color="green" />
            <StatCard label="Suspended Orgs"     value={stats?.suspendedOrgs ?? 0} color="amber" />
            <StatCard label="Total Users"        value={stats?.totalUsers}        color="cyan" />
            <StatCard label="Total Accounts"     value={stats?.totalAccounts}     color="brand" />
            <StatCard label="Total Issues"       value={stats?.totalIssues}       color="red" />
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl">
            <div className="px-5 py-4 border-b border-gray-800">
              <h2 className="text-sm font-semibold text-white">Orgs by Plan</h2>
            </div>
            <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {['trial', 'starter', 'pro', 'enterprise'].map(plan => (
                <div key={plan} className="bg-gray-800 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-white">{(stats?.planBreakdown || {})[plan] ?? 0}</p>
                  <p className="text-xs text-gray-400 mt-0.5 capitalize">{plan}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
