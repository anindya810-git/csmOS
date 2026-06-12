import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom';

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

function buildAccountRows(fr) {
  const links = fr.feature_request_links || [];
  const map = {};
  links.forEach(l => {
    if (!l.account_id) return;
    if (!map[l.account_id]) map[l.account_id] = { name: l.account_name, mrr: 0, escalations: 0, issues: 0 };
    map[l.account_id].mrr = Math.max(map[l.account_id].mrr, Number(l.mrr) || 0);
    if (l.link_type === 'escalation') map[l.account_id].escalations++;
    else if (l.link_type === 'issue') map[l.account_id].issues++;
  });
  return Object.values(map).sort((a, b) => b.mrr - a.mrr);
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

function reqId(fr) {
  return fr.request_id || `FR-${String(fr.id).padStart(5, '0')}`;
}

const TABS = [
  { key: 'all',      label: 'All' },
  { key: 'pending',  label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

const MODAL_TITLE = { accounts: 'Accounts', escalations: 'Escalations', issues: 'Issues' };

export default function FeatureRequestReport() {
  const [frs, setFrs]               = useState([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState('all');
  const [detailModal, setDetailModal] = useState(null); // { fr, type: 'accounts'|'escalations'|'issues' }

  useEffect(() => {
    axios.get('/api/feature-requests')
      .then(r => setFrs(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const summary  = frs.reduce((acc, fr) => { acc[fr.status] = (acc[fr.status] || 0) + 1; return acc; }, {});
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
            <table className="w-full text-sm min-w-[860px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Request</th>
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
                        <p className="font-mono text-xs text-gray-400">{reqId(fr)}</p>
                        <p className="font-medium text-gray-900 truncate max-w-xs">{fr.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{fr.created_by}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[fr.status] || ''}`}>{fr.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[fr.priority] || ''}`}>{fr.priority}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{fr.related_to || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        {s.accounts > 0
                          ? <button onClick={() => setDetailModal({ fr, type: 'accounts' })} className="font-medium text-brand-600 hover:text-brand-800 hover:underline transition">{s.accounts}</button>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800">{fmtMRR(s.mrr)}</td>
                      <td className="px-4 py-3 text-right">
                        {s.escalations > 0
                          ? <button onClick={() => setDetailModal({ fr, type: 'escalations' })} className="font-medium text-orange-600 hover:text-orange-800 hover:underline transition">{s.escalations}</button>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {s.issues > 0
                          ? <button onClick={() => setDetailModal({ fr, type: 'issues' })} className="font-medium text-blue-600 hover:text-blue-800 hover:underline transition">{s.issues}</button>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{fmtDate(fr.expected_rollout_date)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {detailModal && createPortal(
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDetailModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-gray-900">{MODAL_TITLE[detailModal.type]}</h3>
                <p className="text-xs text-gray-400 truncate mt-0.5">{reqId(detailModal.fr)} — {detailModal.fr.title}</p>
              </div>
              <button onClick={() => setDetailModal(null)} className="shrink-0 ml-3 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="overflow-y-auto divide-y divide-gray-50">
              {(() => {
                const { fr, type } = detailModal;
                if (type === 'accounts') {
                  const rows = buildAccountRows(fr);
                  if (rows.length === 0) return <p className="px-5 py-8 text-center text-gray-400 text-sm">No accounts linked.</p>;
                  return rows.map((a, i) => (
                    <div key={i} className="flex items-center justify-between px-5 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">{a.name || 'Unknown'}</p>
                        <p className="text-xs text-gray-400">
                          {[
                            a.escalations > 0 && `${a.escalations} escalation${a.escalations > 1 ? 's' : ''}`,
                            a.issues > 0 && `${a.issues} issue${a.issues > 1 ? 's' : ''}`,
                          ].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-gray-700 shrink-0 ml-4">{fmtMRR(a.mrr)}</p>
                    </div>
                  ));
                }
                const linkType = type === 'escalations' ? 'escalation' : 'issue';
                const rows = (fr.feature_request_links || []).filter(l => l.link_type === linkType);
                if (rows.length === 0) return <p className="px-5 py-8 text-center text-gray-400 text-sm">None linked.</p>;
                return rows.map((l, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">#{l.linked_id}</p>
                      <p className="text-xs text-gray-400">{l.account_name || '—'}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-700 shrink-0 ml-4">{fmtMRR(l.mrr)}</p>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
