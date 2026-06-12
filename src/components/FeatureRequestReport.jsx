import React, { useEffect, useState } from 'react';
import axios from 'axios';

const PRIORITY_COLORS = {
  P0: 'bg-red-100 text-red-700',
  P1: 'bg-orange-100 text-orange-700',
  P2: 'bg-yellow-100 text-yellow-700',
  P3: 'bg-gray-100 text-gray-600',
};

const STATUS_COLORS = {
  pending:  'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

function frStats(fr) {
  const links = fr.feature_request_links || [];
  const accountMRR = {};
  links.forEach(l => {
    if (l.account_id != null && l.mrr != null) {
      accountMRR[l.account_id] = Math.max(accountMRR[l.account_id] || 0, Number(l.mrr));
    }
  });
  return {
    accounts: Object.keys(accountMRR).length,
    mrr: Object.values(accountMRR).reduce((a, b) => a + b, 0),
    escalations: links.filter(l => l.link_type === 'escalation').length,
    issues: links.filter(l => l.link_type === 'issue').length,
  };
}

function fmtMRR(v) {
  if (!v) return '—';
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000)   return `₹${(v / 1000).toFixed(0)}K`;
  return `₹${v}`;
}

function fmtDate(s) {
  if (!s) return '—';
  try {
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return s; }
}

const TABS = [
  { key: 'all',      label: 'All' },
  { key: 'pending',  label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

export default function FeatureRequestReport() {
  const [frs, setFrs]         = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('all');

  useEffect(() => {
    axios.get('/api/feature-requests')
      .then(r => setFrs(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const summary = frs.reduce((acc, fr) => { acc[fr.status] = (acc[fr.status] || 0) + 1; return acc; }, {});
  const filtered = tab === 'all' ? frs : frs.filter(f => f.status === tab);

  return (
    <div className="space-y-5">
      {/* Summary tiles */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending Review', key: 'pending',  cls: 'text-yellow-600' },
          { label: 'Approved',       key: 'approved', cls: 'text-green-600'  },
          { label: 'Rejected',       key: 'rejected', cls: 'text-red-600'    },
        ].map(s => (
          <div key={s.key} className="card p-4 text-center cursor-pointer hover:shadow-md transition" onClick={() => setTab(s.key)}>
            <p className={`text-2xl font-bold ${s.cls}`}>{summary[s.key] || 0}</p>
            <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px whitespace-nowrap ${tab === t.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}{t.key !== 'all' ? ` (${summary[t.key] || 0})` : ` (${frs.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-gray-400">No feature requests in this view.</div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Priority</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Accounts</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Combined MRR</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Escalations</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Issues</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Expected Rollout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(fr => {
                  const s = frStats(fr);
                  return (
                    <tr key={fr.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 truncate max-w-xs">{fr.title}</p>
                        <p className="text-xs text-gray-400">{fr.created_by}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[fr.status] || ''}`}>{fr.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[fr.priority] || ''}`}>{fr.priority}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{fr.related_to || '—'}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800">{s.accounts || '—'}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800">{fmtMRR(s.mrr)}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800">{s.escalations || '—'}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800">{s.issues || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{fmtDate(fr.expected_rollout_date)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
