import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import SelectDropdown from './SelectDropdown';
import DatePicker from './DatePicker';

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

function fmtDate(s) {
  if (!s) return '—';
  try {
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return s; }
}

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

const EMPTY_FORM = { title: '', description: '', related_to: '', priority: 'P2', expected_rollout_date: '' };

export default function FeatureRequestsPage() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const isAdmin = user?.role === 'admin';

  const [frs, setFrs]           = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filters, setFilters]   = useState({ status: '', priority: '', related_to: '', search: '' });
  const [relatedOpts, setRelatedOpts] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [editFr, setEditFr]     = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [formError, setFormError] = useState('');
  const [unlinking, setUnlinking] = useState(null);

  const [reviewFr, setReviewFr]     = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [reviewing, setReviewing]   = useState(false);

  useEffect(() => { load(); loadRelatedOpts(); }, []);

  const load = async (f = filters) => {
    setLoading(true);
    try {
      const params = {};
      if (f.status)     params.status = f.status;
      if (f.priority)   params.priority = f.priority;
      if (f.related_to) params.related_to = f.related_to;
      if (f.search)     params.search = f.search;
      const { data } = await axios.get('/api/feature-requests', { params });
      setFrs(data || []);
    } catch {}
    finally { setLoading(false); }
  };

  const loadRelatedOpts = async () => {
    try {
      const { data } = await axios.get('/api/dropdown-config');
      setRelatedOpts((data?.fr_related_to || []).map(x => x.value));
    } catch {}
  };

  const openCreate = () => {
    setEditFr(null); setForm(EMPTY_FORM); setFormError(''); setShowForm(true);
  };

  const openEdit = (fr) => {
    if (!isAdmin && fr.created_by_id !== user?.id) return;
    if (!isAdmin && fr.status !== 'pending') return;
    setEditFr(fr);
    setForm({ title: fr.title, description: fr.description || '', related_to: fr.related_to || '', priority: fr.priority || 'P2', expected_rollout_date: fr.expected_rollout_date || '' });
    setFormError(''); setShowForm(true);
  };

  const applyFilter = (patch) => {
    const f = { ...filters, ...patch };
    setFilters(f); load(f);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setFormError('Title is required'); return; }
    setSaving(true); setFormError('');
    try {
      if (editFr) {
        await axios.put(`/api/feature-requests?id=${editFr.id}`, form);
      } else {
        await axios.post('/api/feature-requests', form);
      }
      setShowForm(false); load();
    } catch (e) { setFormError(e.response?.data?.error || 'Failed to save'); }
    finally { setSaving(false); }
  };

  // Remove a linked escalation/issue from the request being edited.
  const handleRemoveLink = async (link) => {
    if (!editFr) return;
    const key = `${link.link_type}:${link.linked_id}`;
    setUnlinking(key);
    try {
      const { data } = await axios.put(`/api/feature-requests?id=${editFr.id}`, {
        action: 'remove_link', link_type: link.link_type, linked_id: link.linked_id,
      });
      setEditFr(data);
      setFrs(prev => prev.map(x => x.id === data.id ? data : x));
    } catch (e) { alert(e.response?.data?.error || 'Failed to remove'); }
    finally { setUnlinking(null); }
  };

  const handleApprove = async (fr) => {
    setReviewing(true);
    try {
      const { data } = await axios.put(`/api/feature-requests?id=${fr.id}`, { action: 'approve' });
      setFrs(prev => prev.map(x => x.id === fr.id ? data : x));
      setReviewFr(null);
    } catch (e) { alert(e.response?.data?.error || 'Failed'); }
    finally { setReviewing(false); }
  };

  const handleReject = async () => {
    if (!reviewFr) return;
    setReviewing(true);
    try {
      const { data } = await axios.put(`/api/feature-requests?id=${reviewFr.id}`, { action: 'reject', rejection_reason: rejectReason });
      setFrs(prev => prev.map(x => x.id === reviewFr.id ? data : x));
      setReviewFr(null); setRejectReason('');
    } catch (e) { alert(e.response?.data?.error || 'Failed'); }
    finally { setReviewing(false); }
  };

  const handleDelete = async (fr) => {
    if (!window.confirm(`Delete "${fr.title}"?`)) return;
    try {
      await axios.delete(`/api/feature-requests?id=${fr.id}`);
      setFrs(prev => prev.filter(x => x.id !== fr.id));
    } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  };

  const editLinks = editFr?.feature_request_links || [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Feature Requests</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create a request, then attach escalations &amp; issues from their pages</p>
        </div>
        {can('create', 'feature_requests') && (
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Request
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card p-3 flex flex-wrap gap-2">
        <SelectDropdown options={['pending', 'approved', 'rejected']} value={filters.status} onChange={v => applyFilter({ status: v })} placeholder="All Statuses" className="w-40" />
        <SelectDropdown options={['P0', 'P1', 'P2', 'P3']} value={filters.priority} onChange={v => applyFilter({ priority: v })} placeholder="All Priorities" className="w-40" />
        <SelectDropdown options={relatedOpts} value={filters.related_to} onChange={v => applyFilter({ related_to: v })} placeholder="All Products" className="w-48" />
        <input value={filters.search} onChange={e => applyFilter({ search: e.target.value })} placeholder="Search title…" className="flex-1 min-w-[160px] !py-1.5 text-sm" />
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="card text-center py-10 text-gray-400">Loading…</div>
        ) : frs.length === 0 ? (
          <div className="card text-center py-10 text-gray-400">No feature requests found.</div>
        ) : frs.map(fr => {
          const stats = frStats(fr);
          const canEdit = isAdmin || (fr.created_by_id === user?.id && fr.status === 'pending');
          return (
            <div key={fr.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-gray-900 min-w-0">{fr.title}</p>
                <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[fr.status] || 'bg-gray-100 text-gray-600'}`}>{fr.status}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className={`font-bold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[fr.priority] || 'bg-gray-100 text-gray-600'}`}>{fr.priority}</span>
                {fr.related_to && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{fr.related_to}</span>}
                <span className="text-gray-400">by {fr.created_by || '—'}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                {stats.escalations > 0 && <span>{stats.escalations} escalation{stats.escalations > 1 ? 's' : ''}</span>}
                {stats.issues > 0 && <span>{stats.issues} issue{stats.issues > 1 ? 's' : ''}</span>}
                {stats.accounts > 0 && <span>{stats.accounts} account{stats.accounts > 1 ? 's' : ''}</span>}
                {fr.expected_rollout_date && <span>Rollout: {fmtDate(fr.expected_rollout_date)}</span>}
              </div>
              <div className="mt-3 flex items-center gap-2">
                {isAdmin && fr.status === 'pending' && (
                  <button onClick={() => { setReviewFr(fr); setRejectReason(''); }} className="px-3 py-1.5 text-xs font-medium bg-brand-50 text-brand-700 rounded-lg">Review</button>
                )}
                {canEdit && (
                  <button onClick={() => openEdit(fr)} className="px-3 py-1.5 text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200 rounded-lg">Edit</button>
                )}
                {isAdmin && (
                  <button onClick={() => handleDelete(fr)} className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 border border-red-200 rounded-lg">Delete</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="card p-0 overflow-hidden hidden md:block">
        {loading ? (
          <div className="py-12 text-center text-gray-400">Loading…</div>
        ) : frs.length === 0 ? (
          <div className="py-12 text-center text-gray-400">No feature requests found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Priority</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">By</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Links</th>
                  <th className="px-4 py-3 w-28"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {frs.map(fr => {
                  const stats = frStats(fr);
                  const canEdit = isAdmin || (fr.created_by_id === user?.id && fr.status === 'pending');
                  return (
                    <tr key={fr.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 max-w-xs truncate">{fr.title}</p>
                        {fr.expected_rollout_date && (
                          <p className="text-xs text-gray-400 mt-0.5">Rollout: {fmtDate(fr.expected_rollout_date)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[fr.status] || 'bg-gray-100 text-gray-600'}`}>{fr.status}</span>
                        {fr.status === 'rejected' && fr.rejection_reason && (
                          <p className="text-xs text-red-400 mt-0.5 max-w-[160px] truncate" title={fr.rejection_reason}>{fr.rejection_reason}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[fr.priority] || 'bg-gray-100 text-gray-600'}`}>{fr.priority}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{fr.related_to || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{fr.created_by || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {stats.escalations > 0 && (
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0"></span>
                              {stats.escalations}E
                            </span>
                          )}
                          {stats.issues > 0 && (
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"></span>
                              {stats.issues}I
                            </span>
                          )}
                          {stats.accounts > 0 && (
                            <span className="text-gray-400">{stats.accounts} acct{stats.accounts > 1 ? 's' : ''}</span>
                          )}
                          {stats.escalations === 0 && stats.issues === 0 && <span className="text-gray-300">—</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {isAdmin && fr.status === 'pending' && (
                            <button onClick={() => { setReviewFr(fr); setRejectReason(''); }} className="px-2 py-1 text-xs font-medium bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-md transition">
                              Review
                            </button>
                          )}
                          {canEdit && (
                            <button onClick={() => openEdit(fr)} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-gray-100 rounded-md transition" title="Edit">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                          )}
                          {isAdmin && (
                            <button onClick={() => handleDelete(fr)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition" title="Delete">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit – basic form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 pt-10 overflow-y-auto" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">{editFr ? 'Edit Feature Request' : 'New Feature Request'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {formError && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{formError}</p>}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Feature request title" className="w-full" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the feature and business justification…" rows={5} className="w-full resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Related To</label>
                  <SelectDropdown options={relatedOpts} value={form.related_to} onChange={v => setForm(f => ({ ...f, related_to: v }))} placeholder="— Select —" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
                  <SelectDropdown options={['P0', 'P1', 'P2', 'P3']} value={form.priority} onChange={v => setForm(f => ({ ...f, priority: v }))} placeholder="— Select —" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Expected Rollout Date</label>
                <DatePicker value={form.expected_rollout_date} onChange={v => setForm(f => ({ ...f, expected_rollout_date: v }))} placeholder="Select date" />
              </div>

              {/* Linked items (edit only) — new links are added from the Escalations / Issues pages */}
              {editFr && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Linked items ({editLinks.length})</label>
                  {editLinks.length === 0 ? (
                    <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                      None yet. Open an escalation or issue and use the “Add to feature request” button to attach it here.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {editLinks.map((l, i) => {
                        const key = `${l.link_type}:${l.linked_id}`;
                        return (
                          <span key={i} className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${l.link_type === 'escalation' ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${l.link_type === 'escalation' ? 'bg-orange-400' : 'bg-blue-400'}`}></span>
                            {l.account_name || `${l.link_type === 'escalation' ? 'Esc' : 'Issue'} #${l.linked_id}`}
                            <button onClick={() => handleRemoveLink(l)} disabled={unlinking === key} className="ml-0.5 hover:text-red-500 leading-none disabled:opacity-40">✕</button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-60">
                {saving ? 'Saving…' : editFr ? 'Save Changes' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review modal */}
      {reviewFr && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Review Feature Request</h3>
              <button onClick={() => setReviewFr(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <p className="font-medium text-gray-800">{reviewFr.title}</p>
              {reviewFr.description && <p className="text-sm text-gray-600 line-clamp-3">{reviewFr.description}</p>}
              <div className="flex gap-2 text-xs flex-wrap">
                <span className={`font-bold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[reviewFr.priority] || ''}`}>{reviewFr.priority}</span>
                {reviewFr.related_to && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{reviewFr.related_to}</span>}
                <span className="text-gray-400">by {reviewFr.created_by}</span>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Rejection reason <span className="text-gray-400">(required to reject)</span></label>
                <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Explain why this is being rejected…" rows={3} className="w-full resize-none text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 pb-5">
              <button onClick={() => setReviewFr(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition">Cancel</button>
              <button onClick={handleReject} disabled={reviewing || !rejectReason.trim()} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-60">
                {reviewing ? '…' : 'Reject'}
              </button>
              <button onClick={() => handleApprove(reviewFr)} disabled={reviewing} className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-60">
                {reviewing ? '…' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
