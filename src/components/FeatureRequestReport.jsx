import React, { useEffect, useState } from 'react';
import axios from 'axios';
import DrillModal from './DrillModal';
import AccountListModal from './AccountListModal';

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

// Combined MRR is deduped per account (an account may surface via several
// linked escalations/issues, but its MRR is counted once).
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

function reqId(fr) {
  return fr.request_id || `FR-${String(fr.id).padStart(5, '0')}`;
}

const TABS = [
  { key: 'all',      label: 'All' },
  { key: 'pending',  label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

export default function FeatureRequestReport() {
  const [frs, setFrs]                 = useState([]);
  const [accounts, setAccounts]       = useState([]);
  const [escalations, setEscalations] = useState([]);
  const [issues, setIssues]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState('all');
  const [drill, setDrill]             = useState(null);     // escalations / issues (Weekly-View style)
  const [acctModal, setAcctModal]     = useState(null);     // accounts (Account-Mapping style)

  useEffect(() => {
    Promise.all([
      axios.get('/api/feature-requests'),
      axios.get('/api/accounts'),
      axios.get('/api/escalations'),
      axios.get('/api/issues'),
    ]).then(([frR, accR, escR, issR]) => {
      setFrs(frR.data || []);
      setAccounts(accR.data || []);
      setEscalations(escR.data || []);
      setIssues(issR.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Resolve a request's links into the full escalation / issue / account
  // records so the drill-downs show the same detail as the source reports.
  // Falls back to the link row if a record was since deleted.
  const openEscalations = (fr) => {
    const items = (fr.feature_request_links || [])
      .filter(l => l.link_type === 'escalation')
      .map(l => escalations.find(e => String(e.id) === String(l.linked_id))
        || { id: l.linked_id, account_id: l.account_id, account_name: l.account_name, description: '', status: '' });
    setDrill({ title: `Escalations — ${reqId(fr)}`, kind: 'escalation', items });
  };

  const openIssues = (fr) => {
    const items = (fr.feature_request_links || [])
      .filter(l => l.link_type === 'issue')
      .map(l => issues.find(i => String(i.id) === String(l.linked_id))
        || { id: l.linked_id, account_id: l.account_id, account_name: l.account_name, description: '', status: '' });
    setDrill({ title: `Issues — ${reqId(fr)}`, kind: 'issue', items });
  };

  const openAccounts = (fr) => {
    const seen = new Set();
    const items = [];
    for (const l of (fr.feature_request_links || [])) {
      if (l.account_id == null || seen.has(l.account_id)) continue;
      seen.add(l.account_id);
      items.push(accounts.find(a => String(a.id) === String(l.account_id))
        || { id: l.account_id, account_name: l.account_name, mrr: l.mrr });
    }
    setAcctModal({ title: `Accounts — ${reqId(fr)}`, accounts: items });
  };

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
                          ? <button onClick={() => openAccounts(fr)} className="font-medium text-brand-600 hover:text-brand-800 hover:underline transition">{s.accounts}</button>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800">{fmtMRR(s.mrr)}</td>
                      <td className="px-4 py-3 text-right">
                        {s.escalations > 0
                          ? <button onClick={() => openEscalations(fr)} className="font-medium text-orange-600 hover:text-orange-800 hover:underline transition">{s.escalations}</button>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {s.issues > 0
                          ? <button onClick={() => openIssues(fr)} className="font-medium text-blue-600 hover:text-blue-800 hover:underline transition">{s.issues}</button>
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

      <DrillModal drill={drill} onClose={() => setDrill(null)} />
      {acctModal && <AccountListModal title={acctModal.title} accounts={acctModal.accounts} onClose={() => setAcctModal(null)} />}
    </div>
  );
}
