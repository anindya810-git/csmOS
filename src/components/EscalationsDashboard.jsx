import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const STATUS_STYLES = {
  'Resolved':       'bg-green-100 text-green-800',
  'In Progress':    'bg-amber-100 text-amber-800',
  'Partly Resolved':'bg-blue-100 text-blue-800',
  'Open':           'bg-red-100 text-red-800',
};

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-700'}`}>
      {status || 'Open'}
    </span>
  );
}

export default function EscalationsDashboard() {
  const { user } = useAuth();
  const [escalations, setEscalations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', csm: '', month: '' });
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.csm) params.csm = filters.csm;
    if (filters.month) params.month = filters.month;
    axios.get('/api/escalations', { params })
      .then(r => setEscalations(r.data || []))
      .catch(() => setEscalations([]))
      .finally(() => setLoading(false));
  }, [filters]);

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }));

  const stats = {
    total: escalations.length,
    open: escalations.filter(e => e.status === 'Open').length,
    inProgress: escalations.filter(e => e.status === 'In Progress').length,
    partlyResolved: escalations.filter(e => e.status === 'Partly Resolved').length,
    resolved: escalations.filter(e => e.status === 'Resolved').length,
  };

  const allCsms = [...new Set(escalations.map(e => e.csm).filter(Boolean))].sort();
  const allMonths = [...new Set(escalations.map(e => e.month).filter(Boolean))];
  const MONTH_ORDER = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  allMonths.sort((a, b) => MONTH_ORDER.indexOf(a) - MONTH_ORDER.indexOf(b));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Escalations</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track and manage account escalations</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'bg-gray-50 border-gray-200', text: 'text-gray-900' },
          { label: 'Open', value: stats.open, color: 'bg-red-50 border-red-200', text: 'text-red-700' },
          { label: 'In Progress', value: stats.inProgress, color: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
          { label: 'Partly Resolved', value: stats.partlyResolved, color: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
          { label: 'Resolved', value: stats.resolved, color: 'bg-green-50 border-green-200', text: 'text-green-700' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
            <p className="text-xs font-medium text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.text}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap items-center gap-3">
        <select value={filters.status} onChange={e => setFilter('status', e.target.value)} className="!w-auto text-sm">
          <option value="">All Statuses</option>
          <option>Open</option>
          <option>In Progress</option>
          <option>Partly Resolved</option>
          <option>Resolved</option>
        </select>
        {user?.role === 'admin' && (
          <select value={filters.csm} onChange={e => setFilter('csm', e.target.value)} className="!w-auto text-sm">
            <option value="">All CSMs</option>
            {allCsms.map(c => <option key={c}>{c}</option>)}
          </select>
        )}
        <select value={filters.month} onChange={e => setFilter('month', e.target.value)} className="!w-auto text-sm">
          <option value="">All Months</option>
          {allMonths.map(m => <option key={m}>{m}</option>)}
        </select>
        {(filters.status || filters.csm || filters.month) && (
          <button onClick={() => setFilters({ status: '', csm: '', month: '' })}
            className="text-sm text-gray-500 hover:text-gray-700 underline">Clear filters</button>
        )}
        <span className="ml-auto text-sm text-gray-400">{escalations.length} escalation{escalations.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : escalations.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">No escalations found.</div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Account</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">CSM</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ownership</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">ETA</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Escalated By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {escalations.map(e => (
                  <React.Fragment key={e.id}>
                    <tr
                      className="hover:bg-gray-50 cursor-pointer transition"
                      onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{e.account_name}</div>
                        {e.tenant_id && <div className="text-xs text-gray-400 font-mono">{e.tenant_id}</div>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {e.date_of_escalation ? new Date(e.date_of_escalation).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—'}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-gray-700 line-clamp-2">{e.description}</p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={e.status} />
                      </td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{e.csm || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{e.ownership || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{e.eta || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{e.escalated_by || '—'}</td>
                    </tr>
                    {expanded === e.id && (
                      <tr className="bg-blue-50">
                        <td colSpan={8} className="px-4 py-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Description</p>
                              <p className="text-sm text-gray-800 whitespace-pre-wrap">{e.description}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Action Taken</p>
                              <p className="text-sm text-gray-800 whitespace-pre-wrap">{e.action_taken || '—'}</p>
                            </div>
                            {e.email_subject && (
                              <div className="sm:col-span-2">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Email Subject</p>
                                <p className="text-sm text-gray-700 italic">{e.email_subject}</p>
                              </div>
                            )}
                            <div className="sm:col-span-2 flex flex-wrap gap-4 text-xs text-gray-500">
                              {e.ps_leader && <span><span className="font-medium">PS Leader:</span> {e.ps_leader}</span>}
                              {e.month && <span><span className="font-medium">Month:</span> {e.month}</span>}
                              {e.account_id && (
                                <Link to={`/accounts/${e.account_id}`} className="text-brand-600 hover:underline font-medium" onClick={ev => ev.stopPropagation()}>
                                  View Account →
                                </Link>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
