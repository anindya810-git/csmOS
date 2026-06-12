import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Link } from 'react-router-dom';

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

// A self-contained "add this escalation / issue to a feature request" control.
// Renders a trigger button; on click, opens a portal modal listing existing
// feature requests. The account + MRR are tagged server-side via the link API,
// so the feature-request report stays accurate (MRR is deduped per account).
export default function AddToFeatureRequest({ type, id, accountName, className }) {
  const [open, setOpen]     = useState(false);
  const [frs, setFrs]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);

  const openModal = (e) => {
    e?.stopPropagation();
    setOpen(true); setSearch('');
    setLoading(true);
    axios.get('/api/feature-requests')
      .then(r => setFrs(r.data || []))
      .catch(() => setFrs([]))
      .finally(() => setLoading(false));
  };

  const close = (e) => { e?.stopPropagation(); setOpen(false); };

  const isLinked = (fr) =>
    (fr.feature_request_links || []).some(l => l.link_type === type && l.linked_id === id);

  const patchLocal = (frId, links) =>
    setFrs(prev => prev.map(x => x.id === frId ? { ...x, feature_request_links: links } : x));

  const addTo = async (fr) => {
    setBusyId(fr.id);
    try {
      const { data } = await axios.put(`/api/feature-requests?id=${fr.id}`, {
        action: 'add_links', link_ids: [{ type, id }],
      });
      patchLocal(fr.id, data.feature_request_links || []);
    } catch (err) { alert(err.response?.data?.error || 'Failed to add'); }
    finally { setBusyId(null); }
  };

  const removeFrom = async (fr) => {
    setBusyId(fr.id);
    try {
      const { data } = await axios.put(`/api/feature-requests?id=${fr.id}`, {
        action: 'remove_link', link_type: type, linked_id: id,
      });
      patchLocal(fr.id, data.feature_request_links || []);
    } catch (err) { alert(err.response?.data?.error || 'Failed to remove'); }
    finally { setBusyId(null); }
  };

  const filtered = frs.filter(fr =>
    !search || (fr.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (fr.related_to || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <button
        onClick={openModal}
        title="Add to feature request"
        className={className || 'p-1.5 rounded-md text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition'}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3a6 6 0 00-3.6 10.8c.4.3.6.7.6 1.2v.5h6v-.5c0-.5.2-.9.6-1.2A6 6 0 0012 3z" />
        </svg>
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={close}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-900">Add to Feature Request</h3>
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {type === 'escalation' ? 'Escalation' : 'Issue'}{accountName ? ` · ${accountName}` : ''}
                </p>
              </div>
              <button onClick={close} className="p-1.5 -mr-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="px-5 py-3 border-b border-gray-100 shrink-0">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search feature requests…" className="w-full !py-1.5 text-sm" autoFocus />
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="py-10 text-center text-sm text-gray-400">Loading…</div>
              ) : frs.length === 0 ? (
                <div className="py-10 px-5 text-center text-sm text-gray-400">
                  <p>No feature requests yet.</p>
                  <Link to="/feature-requests" onClick={close} className="text-brand-600 hover:underline font-medium">Create one first →</Link>
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-400">No matches.</div>
              ) : filtered.map(fr => {
                const linked = isLinked(fr);
                const busy = busyId === fr.id;
                return (
                  <div key={fr.id} className="flex items-center gap-3 px-5 py-2.5 border-b border-gray-50 last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate">{fr.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${PRIORITY_COLORS[fr.priority] || 'bg-gray-100 text-gray-600'}`}>{fr.priority}</span>
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${STATUS_COLORS[fr.status] || 'bg-gray-100 text-gray-600'}`}>{fr.status}</span>
                        {fr.related_to && <span className="text-xs text-gray-400 truncate">{fr.related_to}</span>}
                      </div>
                    </div>
                    {linked ? (
                      <button onClick={() => removeFrom(fr)} disabled={busy}
                        className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-red-50 hover:text-red-600 rounded-lg transition disabled:opacity-50 group">
                        <svg className="w-3.5 h-3.5 group-hover:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        <span className="group-hover:hidden">Added</span>
                        <span className="hidden group-hover:inline">Remove</span>
                      </button>
                    ) : (
                      <button onClick={() => addTo(fr)} disabled={busy}
                        className="shrink-0 px-2.5 py-1 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition disabled:opacity-50">
                        {busy ? '…' : 'Add'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="px-5 py-3 border-t border-gray-100 shrink-0 flex justify-end">
              <button onClick={close} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition">Done</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
