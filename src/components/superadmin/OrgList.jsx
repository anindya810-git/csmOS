import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/superadminAxios';
import CreateOrgModal from './CreateOrgModal';

const PLAN_COLORS = { trial: 'bg-gray-700 text-gray-300', starter: 'bg-blue-900 text-blue-300', pro: 'bg-violet-900 text-violet-300', enterprise: 'bg-amber-900 text-amber-300' };
const STATUS_COLORS = { active: 'bg-emerald-900 text-emerald-300', suspended: 'bg-amber-900 text-amber-300', cancelled: 'bg-red-900 text-red-300' };

export default function OrgList() {
  const navigate = useNavigate();
  const [orgs, setOrgs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch]   = useState('');

  useEffect(() => { fetchOrgs(); }, []);

  async function fetchOrgs() {
    setLoading(true);
    try { const { data } = await api.get('/api/superadmin?resource=orgs'); setOrgs(data || []); }
    catch {}
    finally { setLoading(false); }
  }

  const filtered = orgs.filter(o => !search || o.name.toLowerCase().includes(search.toLowerCase()) || o.slug.includes(search.toLowerCase()));

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Organisations</h1>
          <p className="text-gray-500 text-sm mt-0.5">{orgs.length} org{orgs.length !== 1 ? 's' : ''} total</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Organisation
        </button>
      </div>

      <input
        value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search organisations…"
        className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-gray-600"
      />

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Organisation</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Users</th>
                <th className="text-right px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Accounts</th>
                <th className="text-right px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Issues</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.map(org => (
                <tr
                  key={org.id}
                  onClick={() => navigate(`/superadmin/orgs/${org.id}`)}
                  className="hover:bg-gray-800/60 cursor-pointer transition"
                >
                  <td className="px-5 py-4">
                    <p className="font-medium text-white">{org.name}</p>
                    <p className="text-xs text-gray-500">{org.slug}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${PLAN_COLORS[org.plan] || 'bg-gray-700 text-gray-300'}`}>{org.plan}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[org.billing_status] || 'bg-gray-700 text-gray-300'}`}>{org.billing_status}</span>
                  </td>
                  <td className="px-4 py-4 text-right text-gray-300">{org._stats?.users ?? 0} / {org.user_limit}</td>
                  <td className="px-4 py-4 text-right text-gray-300">{org._stats?.accounts ?? 0}</td>
                  <td className="px-4 py-4 text-right text-gray-300">{org._stats?.issues ?? 0}</td>
                  <td className="px-4 py-4 text-gray-500 text-xs">{org.created_at ? new Date(org.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '–'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-gray-600">No organisations found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <CreateOrgModal onClose={() => setShowCreate(false)} onCreated={org => { setOrgs(o => [org.org, ...o]); }} />}
    </div>
  );
}
