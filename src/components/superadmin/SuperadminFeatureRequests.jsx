import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/superadminAxios';

const PRIORITY_COLORS = {
  P0: 'bg-red-900/60 text-red-300',
  P1: 'bg-orange-900/60 text-orange-300',
  P2: 'bg-amber-900/60 text-amber-300',
  P3: 'bg-gray-700 text-gray-400',
};

const STATUS_COLORS = {
  pending:  'bg-amber-900/60 text-amber-300',
  approved: 'bg-emerald-900/60 text-emerald-300',
  rejected: 'bg-red-900/60 text-red-300',
};

function fmtDate(s) {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '—';
}

/* ── Reject modal ──────────────────────────────────────────────── */
function RejectModal({ fr, onClose, onRejected }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!reason.trim()) { setError('Rejection reason is required'); return; }
    setLoading(true); setError('');
    try {
      const { data } = await api.put(`/api/superadmin?resource=feature_requests&id=${fr.id}`, {
        action: 'reject',
        rejection_reason: reason.trim(),
      });
      onRejected(data);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to reject');
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-white font-semibold">Reject Feature Request</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <p className="text-sm text-gray-400">
            Rejecting: <span className="text-white font-medium">{fr.title}</span>
          </p>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Reason *</label>
            <textarea
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-gray-600 resize-none"
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Explain why this is being rejected…"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-700 text-gray-300 rounded-xl text-sm hover:bg-gray-800 transition">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60">
              {loading ? 'Rejecting…' : 'Reject Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Detail / review panel ─────────────────────────────────────── */
function DetailPanel({ fr, onClose, onApproved, onRejected }) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approving, setApproving] = useState(false);

  async function approve() {
    setApproving(true);
    try {
      const { data } = await api.put(`/api/superadmin?resource=feature_requests&id=${fr.id}`, { action: 'approve' });
      onApproved(data);
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to approve');
    } finally { setApproving(false); }
  }

  const isPending = fr.status === 'pending';

  const Field = ({ label, children }) => (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-0.5">{label}</p>
      <div className="text-sm text-white">{children}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-[480px] bg-gray-900 border-l border-gray-800 flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex items-start justify-between flex-shrink-0">
          <div className="min-w-0 pr-4">
            <p className="text-xs text-gray-500 font-mono mb-0.5">
              {fr.request_id || `FR-${String(fr.id).padStart(5, '0')}`}
            </p>
            <h2 className="text-white font-semibold text-lg leading-snug">{fr.title}</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition flex-shrink-0 mt-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[fr.status] || 'bg-gray-700 text-gray-400'}`}>
              {cap(fr.status)}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[fr.priority] || 'bg-gray-700 text-gray-400'}`}>
              {fr.priority || '—'}
            </span>
          </div>

          <Field label="Organisation">{fr.organizations?.name || <span className="text-gray-500">—</span>}</Field>

          <Field label="Description">
            {fr.description
              ? <p className="whitespace-pre-wrap text-gray-300 leading-relaxed">{fr.description}</p>
              : <span className="text-gray-500 italic text-sm">No description provided</span>}
          </Field>

          <Field label="Related To">{fr.related_to || <span className="text-gray-500">—</span>}</Field>
          <Field label="Expected Rollout">{fmtDate(fr.expected_rollout_date)}</Field>
          <Field label="Requested By">{fr.created_by || <span className="text-gray-500">—</span>}</Field>
          {fr.approver_name && <Field label="Assigned Approver">{fr.approver_name}</Field>}
          <Field label="Submitted">{fmtDate(fr.created_at)}</Field>

          {(fr.status === 'approved' || fr.status === 'rejected') && (
            <div className={`rounded-xl p-4 border ${
              fr.status === 'approved'
                ? 'bg-emerald-950/40 border-emerald-900/40'
                : 'bg-red-950/40 border-red-900/40'
            }`}>
              <p className={`text-xs font-medium mb-1 ${fr.status === 'approved' ? 'text-emerald-400' : 'text-red-400'}`}>
                {cap(fr.status)} by {fr.approved_by || 'Superadmin'} · {fmtDate(fr.approved_at)}
              </p>
              {fr.rejection_reason && (
                <p className="text-sm text-gray-300 whitespace-pre-wrap mt-1">{fr.rejection_reason}</p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        {isPending && (
          <div className="px-6 py-4 border-t border-gray-800 flex gap-3 flex-shrink-0">
            <button
              onClick={() => setRejectOpen(true)}
              className="flex-1 py-2.5 border border-red-900 text-red-400 hover:bg-red-950/40 rounded-xl text-sm font-semibold transition">
              Reject
            </button>
            <button
              onClick={approve}
              disabled={approving}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60">
              {approving ? 'Approving…' : 'Approve'}
            </button>
          </div>
        )}
      </div>

      {rejectOpen && (
        <RejectModal
          fr={fr}
          onClose={() => setRejectOpen(false)}
          onRejected={updated => { onRejected(updated); setRejectOpen(false); }}
        />
      )}
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────────── */
const STATUS_TABS = [
  { label: 'All',      value: '' },
  { label: 'Pending',  value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

export default function SuperadminFeatureRequests() {
  const [allItems, setAllItems]     = useState([]);
  const [orgs, setOrgs]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [search, setSearch]         = useState('');
  const [filterOrg, setFilterOrg]   = useState('');
  const [filterStatus, setFilterStatus]     = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [selected, setSelected]     = useState(null);
  const [rejectTarget, setRejectTarget]     = useState(null);
  const [busyId, setBusyId]         = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ resource: 'feature_requests' });
      if (filterOrg)      params.set('org_id',   filterOrg);
      if (filterStatus)   params.set('status',   filterStatus);
      if (filterPriority) params.set('priority', filterPriority);
      const { data } = await api.get(`/api/superadmin?${params}`);
      setAllItems(data || []);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load feature requests');
    } finally { setLoading(false); }
  }, [filterOrg, filterStatus, filterPriority]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    api.get('/api/superadmin?resource=orgs').then(r => setOrgs(r.data || [])).catch(() => {});
  }, []);

  // Client-side search on top of server-side filters
  const items = search
    ? allItems.filter(i =>
        i.title?.toLowerCase().includes(search.toLowerCase()) ||
        (i.request_id || '').toLowerCase().includes(search.toLowerCase()) ||
        i.created_by?.toLowerCase().includes(search.toLowerCase())
      )
    : allItems;

  function applyUpdate(updated) {
    setAllItems(prev => prev.map(i => i.id === updated.id ? updated : i));
    if (selected?.id === updated.id) setSelected(updated);
  }

  function applyDelete(id) {
    setAllItems(prev => prev.filter(i => i.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  async function doApproveInline(fr, e) {
    e.stopPropagation();
    setBusyId(fr.id);
    try {
      const { data } = await api.put(`/api/superadmin?resource=feature_requests&id=${fr.id}`, { action: 'approve' });
      applyUpdate(data);
    } catch (err) { alert(err?.response?.data?.error || 'Failed to approve'); }
    finally { setBusyId(null); }
  }

  async function doDelete(fr, e) {
    e.stopPropagation();
    if (!window.confirm(`Delete "${fr.title}"? This cannot be undone.`)) return;
    setBusyId(fr.id);
    try {
      await api.delete(`/api/superadmin?resource=feature_requests&id=${fr.id}`);
      applyDelete(fr.id);
    } catch (err) { alert(err?.response?.data?.error || 'Failed to delete'); }
    finally { setBusyId(null); }
  }

  const iconBtn = 'p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-700 transition disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Feature Requests</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {items.length} request{items.length !== 1 ? 's' : ''} across all organisations
        </p>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 border-b border-gray-800">
        {STATUS_TABS.map(t => (
          <button
            key={t.value}
            onClick={() => setFilterStatus(t.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition -mb-px ${
              filterStatus === t.value
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-gray-500 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search title, FR ID, or requester…"
          className="flex-1 min-w-48 bg-gray-900 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-gray-600"
        />
        <select
          value={filterOrg}
          onChange={e => setFilterOrg(e.target.value)}
          className="bg-gray-900 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Organisations</option>
          {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <select
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value)}
          className="bg-gray-900 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Priorities</option>
          {['P0', 'P1', 'P2', 'P3'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-xl px-4 py-3">{error}</p>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Request</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Organisation</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Submitted</th>
                <th className="px-4 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {items.map(fr => {
                const busy = busyId === fr.id;
                const isPending = fr.status === 'pending';
                return (
                  <tr
                    key={fr.id}
                    className="hover:bg-gray-800/60 transition cursor-pointer"
                    onClick={() => setSelected(fr)}
                  >
                    <td className="px-5 py-4">
                      <p className="text-xs font-mono text-gray-500">
                        {fr.request_id || `FR-${String(fr.id).padStart(5, '0')}`}
                      </p>
                      <p className="font-medium text-white truncate max-w-xs">{fr.title}</p>
                      {fr.related_to && <p className="text-xs text-gray-500 mt-0.5">{fr.related_to}</p>}
                    </td>
                    <td className="px-4 py-4 text-gray-400 whitespace-nowrap">
                      {fr.organizations?.name || '—'}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[fr.priority] || 'bg-gray-700 text-gray-400'}`}>
                        {fr.priority || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[fr.status] || 'bg-gray-700 text-gray-400'}`}>
                        {cap(fr.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-gray-500 text-xs whitespace-nowrap">{fmtDate(fr.created_at)}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 justify-end" onClick={e => e.stopPropagation()}>
                        {isPending && (
                          <>
                            <button
                              onClick={e => doApproveInline(fr, e)}
                              disabled={busy}
                              className={`${iconBtn} hover:!text-emerald-400`}
                              title="Approve"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); setRejectTarget(fr); }}
                              disabled={busy}
                              className={`${iconBtn} hover:!text-red-400`}
                              title="Reject"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </>
                        )}
                        <button
                          onClick={e => doDelete(fr, e)}
                          disabled={busy}
                          className={`${iconBtn} hover:!text-red-400`}
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-600">No feature requests found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <DetailPanel
          fr={selected}
          onClose={() => setSelected(null)}
          onApproved={applyUpdate}
          onRejected={applyUpdate}
        />
      )}

      {rejectTarget && (
        <RejectModal
          fr={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onRejected={updated => { applyUpdate(updated); setRejectTarget(null); }}
        />
      )}
    </div>
  );
}
