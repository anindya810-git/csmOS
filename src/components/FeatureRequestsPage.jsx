import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import { useWatchlist } from '../hooks/useWatchlist';
import SelectDropdown from './SelectDropdown';
import DatePicker from './DatePicker';
import DrillModal from './DrillModal';
import AccountListModal from './AccountListModal';
import AiPanel from './AiPanel';

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

const RAG_DOT = { Green: 'bg-green-500', Amber: 'bg-amber-400', Red: 'bg-red-500' };

function fmtDate(s) {
  if (!s) return '—';
  try {
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return s; }
}

function fmtMRR(v) {
  if (!v) return '—';
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000)   return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000)     return `₹${(v / 1000).toFixed(0)}K`;
  return `₹${v}`;
}

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

function reqId(fr) {
  return fr.request_id || `FR-${String(fr.id).padStart(5, '0')}`;
}

function CollapsibleSection({ label, count, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-gray-100 group"
      >
        <span className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide group-hover:text-gray-700 transition">{label}</span>
          {count != null && (
            <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">{count}</span>
          )}
        </span>
        <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? '' : '-rotate-90'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && children}
    </div>
  );
}

const EMPTY_FORM = { title: '', description: '', related_to: '', priority: 'P2', expected_rollout_date: '' };

export default function FeatureRequestsPage() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const { isWatched, toggle: watchToggle } = useWatchlist();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const canReview = (fr) => isAdmin || (fr?.approver_id != null && String(fr.approver_id) === String(user?.id));

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

  // Drill-downs opened from the table's Links column (shared with the reports)
  const [drill, setDrill]         = useState(null);   // escalations / issues
  const [acctModal, setAcctModal] = useState(null);   // accounts

  // Full escalation / issue / account records so links resolve to rich detail.
  const panelDataLoadedRef = useRef(false);
  const [allEscalations, setAllEscalations] = useState([]);
  const [allIssues,       setAllIssues]       = useState([]);
  const [allAccounts,     setAllAccounts]     = useState([]);

  useEffect(() => { load(); loadRelatedOpts(); loadPanelData(); }, []);

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

  const loadPanelData = () => {
    if (panelDataLoadedRef.current) return;
    panelDataLoadedRef.current = true;
    Promise.all([
      axios.get('/api/escalations'),
      axios.get('/api/issues'),
      axios.get('/api/accounts'),
    ]).then(([escR, issR, accR]) => {
      setAllEscalations(escR.data || []);
      setAllIssues(issR.data || []);
      setAllAccounts(accR.data || []);
    }).catch(() => { panelDataLoadedRef.current = false; });
  };

  // Resolve a request's links into full records, then open the matching
  // drill-down (same modals as the Weekly View / Account Mapping reports).
  const openDrillEscalations = (fr) => {
    const items = (fr.feature_request_links || [])
      .filter(l => l.link_type === 'escalation')
      .map(l => allEscalations.find(e => String(e.id) === String(l.linked_id))
        || { id: l.linked_id, account_id: l.account_id, account_name: l.account_name, description: '', status: '' });
    setDrill({ title: `Escalations — ${reqId(fr)}`, kind: 'escalation', items });
  };

  const openDrillIssues = (fr) => {
    const items = (fr.feature_request_links || [])
      .filter(l => l.link_type === 'issue')
      .map(l => allIssues.find(i => String(i.id) === String(l.linked_id))
        || { id: l.linked_id, account_id: l.account_id, account_name: l.account_name, description: '', status: '' });
    setDrill({ title: `Issues — ${reqId(fr)}`, kind: 'issue', items });
  };

  const openDrillAccounts = (fr) => {
    const seen = new Set();
    const items = [];
    for (const l of (fr.feature_request_links || [])) {
      if (l.account_id == null || seen.has(l.account_id)) continue;
      seen.add(l.account_id);
      items.push(allAccounts.find(a => String(a.id) === String(l.account_id))
        || { id: l.account_id, account_name: l.account_name, mrr: l.mrr });
    }
    setAcctModal({ title: `Accounts — ${reqId(fr)}`, accounts: items });
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
    loadPanelData();
  };

  const openReview = (fr) => {
    setReviewFr(fr); setRejectReason('');
    loadPanelData();
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

  // Resolve links to full records for the active panel (edit or review)
  const panelFr = showForm ? editFr : reviewFr;
  const panelLinks = panelFr?.feature_request_links || [];
  const editLinks  = editFr?.feature_request_links || [];

  const resolvedEscalations = panelLinks
    .filter(l => l.link_type === 'escalation')
    .map(l => allEscalations.find(e => String(e.id) === String(l.linked_id))
      || { id: l.linked_id, account_name: l.account_name, description: '', status: '' });

  const resolvedIssues = panelLinks
    .filter(l => l.link_type === 'issue')
    .map(l => allIssues.find(i => String(i.id) === String(l.linked_id))
      || { id: l.linked_id, account_name: l.account_name, description: '', status: '', priority: '' });

  const resolvedAccounts = (() => {
    const seen = new Set();
    const items = [];
    for (const l of panelLinks) {
      if (l.account_id == null || seen.has(l.account_id)) continue;
      seen.add(l.account_id);
      const full = allAccounts.find(a => String(a.id) === String(l.account_id));
      items.push(full || { id: l.account_id, account_name: l.account_name, mrr: l.mrr });
    }
    return items;
  })();

  // Shared escalation row renderer
  const EscRow = ({ e, removable }) => {
    const link = removable ? editLinks.find(l => l.link_type === 'escalation' && String(l.linked_id) === String(e.id)) : null;
    const key = `escalation:${e.id}`;
    return (
      <div className="flex items-start gap-2 bg-orange-50 rounded-lg px-3 py-2">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-800 truncate">{e.account_name || `Escalation #${e.id}`}</p>
          {e.description && <p className="text-xs text-gray-500 truncate">{e.description}</p>}
          {e.status && (
            <p className="text-xs text-gray-400">{e.status}{e.date_of_escalation ? ` · ${fmtDate(e.date_of_escalation)}` : ''}</p>
          )}
        </div>
        {link && (
          <button onClick={() => handleRemoveLink(link)} disabled={unlinking === key}
            className="shrink-0 p-0.5 text-gray-300 hover:text-red-500 transition disabled:opacity-40">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  };

  // Shared issue row renderer
  const IssRow = ({ i, removable }) => {
    const link = removable ? editLinks.find(l => l.link_type === 'issue' && String(l.linked_id) === String(i.id)) : null;
    const key = `issue:${i.id}`;
    return (
      <div className="flex items-start gap-2 bg-blue-50 rounded-lg px-3 py-2">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-800 truncate">{i.account_name || `Issue #${i.id}`}</p>
          {i.description && <p className="text-xs text-gray-500 truncate">{i.description}</p>}
          <div className="flex items-center gap-2 mt-0.5">
            {i.priority && <span className={`text-xs font-bold px-1.5 py-0 rounded ${PRIORITY_COLORS[i.priority] || 'text-gray-500'}`}>{i.priority}</span>}
            {i.status && <span className="text-xs text-gray-400">{i.status}</span>}
          </div>
        </div>
        {link && (
          <button onClick={() => handleRemoveLink(link)} disabled={unlinking === key}
            className="shrink-0 p-0.5 text-gray-300 hover:text-red-500 transition disabled:opacity-40">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  };

  // Shared account row renderer
  const AccRow = ({ a }) => (
    <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
      {a.rag_status && <span className={`w-2 h-2 rounded-full shrink-0 ${RAG_DOT[a.rag_status] || 'bg-gray-300'}`} />}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-800 truncate">{a.account_name}</p>
        <p className="text-xs text-gray-400">{[a.industry, a.region, fmtMRR(a.mrr)].filter(Boolean).join(' · ')}</p>
      </div>
    </div>
  );

  const CloseIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );

  // One stacked line in the Links column: "N Escalations / Issues / Accounts".
  // Clickable (colored) when count > 0, muted when empty.
  const LinkLine = ({ count, singular, dotBg, textCls, onClick }) => {
    const label = `${count} ${singular}${count === 1 ? '' : 's'}`;
    if (count > 0) {
      return (
        <button onClick={onClick} className={`flex items-center gap-1.5 font-medium hover:underline transition w-fit ${textCls}`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotBg}`} />
          {label}
        </button>
      );
    }
    return (
      <span className="flex items-center gap-1.5 text-gray-300">
        <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-gray-200" />
        {label}
      </span>
    );
  };

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
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">{fr.title}</p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{reqId(fr)}</p>
                </div>
                <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[fr.status] || 'bg-gray-100 text-gray-600'}`}>{fr.status}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className={`font-bold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[fr.priority] || 'bg-gray-100 text-gray-600'}`}>{fr.priority}</span>
                {fr.related_to && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{fr.related_to}</span>}
                <span className="text-gray-400">by {fr.created_by || '—'}</span>
                {fr.approver_name && fr.status === 'pending' && <span className="text-gray-400">· approver {fr.approver_name}</span>}
              </div>
              <div className="mt-2 flex flex-col gap-1 text-xs">
                {stats.escalations > 0 && (
                  <LinkLine count={stats.escalations} singular="Escalation" dotBg="bg-orange-400" textCls="text-orange-600" onClick={() => openDrillEscalations(fr)} />
                )}
                {stats.issues > 0 && (
                  <LinkLine count={stats.issues} singular="Issue" dotBg="bg-blue-400" textCls="text-blue-600" onClick={() => openDrillIssues(fr)} />
                )}
                {stats.accounts > 0 && (
                  <LinkLine count={stats.accounts} singular="Account" dotBg="bg-brand-500" textCls="text-brand-600" onClick={() => openDrillAccounts(fr)} />
                )}
                {fr.expected_rollout_date && <span className="text-gray-500">Rollout: {fmtDate(fr.expected_rollout_date)}</span>}
              </div>
              <div className="mt-3 flex items-center gap-2">
                {canReview(fr) && fr.status === 'pending' && (
                  <button onClick={() => openReview(fr)} className="px-3 py-1.5 text-xs font-medium bg-brand-50 text-brand-700 rounded-lg">Review</button>
                )}
                {canEdit && (
                  <button onClick={() => openEdit(fr)} className="px-3 py-1.5 text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200 rounded-lg">Edit</button>
                )}
                {isAdmin && (
                  <button onClick={() => handleDelete(fr)} className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 border border-red-200 rounded-lg">Delete</button>
                )}
                <button onClick={() => watchToggle('feature_requests', fr.id)}
                  className={`ml-auto p-1.5 rounded-md transition ${isWatched('feature_requests', fr.id) ? 'text-brand-600' : 'text-gray-300 hover:text-gray-500'}`}
                  title={isWatched('feature_requests', fr.id) ? 'Remove from watchlist' : 'Add to watchlist'}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
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
                        <p className="font-mono text-xs text-gray-400">{reqId(fr)}</p>
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
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {fr.created_by || '—'}
                        {fr.approver_name && fr.status === 'pending' && (
                          <span className="block text-gray-400 mt-0.5">Approver: {fr.approver_name}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 text-xs">
                          <LinkLine count={stats.escalations} singular="Escalation" dotBg="bg-orange-400" textCls="text-orange-600 hover:text-orange-800" onClick={() => openDrillEscalations(fr)} />
                          <LinkLine count={stats.issues} singular="Issue" dotBg="bg-blue-400" textCls="text-blue-600 hover:text-blue-800" onClick={() => openDrillIssues(fr)} />
                          <LinkLine count={stats.accounts} singular="Account" dotBg="bg-brand-500" textCls="text-brand-600 hover:text-brand-800" onClick={() => openDrillAccounts(fr)} />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {canReview(fr) && fr.status === 'pending' && (
                            <button onClick={() => openReview(fr)} className="px-2 py-1 text-xs font-medium bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-md transition">
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
                          <button onClick={() => watchToggle('feature_requests', fr.id)}
                            className={`p-1.5 rounded-md transition ${isWatched('feature_requests', fr.id) ? 'text-brand-600' : 'text-gray-300 hover:text-gray-500'}`}
                            title={isWatched('feature_requests', fr.id) ? 'Remove from watchlist' : 'Add to watchlist'}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
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

      {/* ── Create / Edit slide-over ── */}
      {showForm && createPortal(
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setShowForm(false)} />
          <div className="fixed inset-y-0 right-0 w-[560px] max-w-[95vw] bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{editFr ? 'Edit Feature Request' : 'New Feature Request'}</h3>
                {editFr && <p className="text-xs text-gray-400 font-mono mt-0.5">{reqId(editFr)}</p>}
              </div>
              <button onClick={() => setShowForm(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
                <CloseIcon />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {formError && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{formError}</p>}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Feature request title" className="w-full" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the feature and business justification…" rows={4} className="w-full resize-none" />
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

              {/* Linked items — edit mode only */}
              {editFr && (
                <>
                  {/* Escalations */}
                  <CollapsibleSection label="Escalations" count={resolvedEscalations.length}>
                    {resolvedEscalations.length === 0 ? (
                      <p className="text-xs text-gray-400 py-1">No escalations linked yet.</p>
                    ) : (
                      <div className="space-y-1.5 mb-2">
                        {resolvedEscalations.map(e => <EscRow key={e.id} e={e} removable />)}
                      </div>
                    )}
                    <button onClick={() => navigate('/escalations')}
                      className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-800 font-medium transition mt-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      Add from Escalations page
                    </button>
                  </CollapsibleSection>

                  {/* Issues */}
                  <CollapsibleSection label="Issues" count={resolvedIssues.length}>
                    {resolvedIssues.length === 0 ? (
                      <p className="text-xs text-gray-400 py-1">No issues linked yet.</p>
                    ) : (
                      <div className="space-y-1.5 mb-2">
                        {resolvedIssues.map(i => <IssRow key={i.id} i={i} removable />)}
                      </div>
                    )}
                    <button onClick={() => navigate('/issues')}
                      className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-800 font-medium transition mt-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      Add from Issues page
                    </button>
                  </CollapsibleSection>

                  {/* Accounts */}
                  {resolvedAccounts.length > 0 && (
                    <CollapsibleSection label="Accounts" count={resolvedAccounts.length}>
                      <p className="text-xs text-gray-400 mb-2">Auto-added from linked escalations and issues.</p>
                      <div className="space-y-1.5">
                        {resolvedAccounts.map(a => <AccRow key={a.id} a={a} />)}
                      </div>
                    </CollapsibleSection>
                  )}
                </>
              )}
            </div>

            <div className="border-t border-gray-100 px-5 py-4 shrink-0 flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-60">
                {saving ? 'Saving…' : editFr ? 'Save Changes' : 'Submit Request'}
              </button>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* ── Review slide-over ── */}
      {reviewFr && createPortal(
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setReviewFr(null)} />
          <div className="fixed inset-y-0 right-0 w-[560px] max-w-[95vw] bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Review Feature Request</h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{reqId(reviewFr)}</p>
              </div>
              <button onClick={() => setReviewFr(null)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
                <CloseIcon />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {/* FR summary */}
              <div className="space-y-2">
                <p className="font-semibold text-gray-900 text-base">{reviewFr.title}</p>
                {reviewFr.description && <p className="text-sm text-gray-600 leading-relaxed">{reviewFr.description}</p>}
                <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                  <span className={`font-bold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[reviewFr.priority] || ''}`}>{reviewFr.priority}</span>
                  {reviewFr.related_to && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{reviewFr.related_to}</span>}
                  <span className={`px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[reviewFr.status] || ''}`}>{reviewFr.status}</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                  <span>By: <span className="text-gray-700">{reviewFr.created_by || '—'}</span></span>
                  {reviewFr.expected_rollout_date && (
                    <span>Rollout: <span className="text-gray-700">{fmtDate(reviewFr.expected_rollout_date)}</span></span>
                  )}
                </div>
              </div>

              {/* Escalations */}
              <CollapsibleSection label="Escalations" count={resolvedEscalations.length}>
                {resolvedEscalations.length === 0 ? (
                  <p className="text-xs text-gray-400 py-1">No escalations linked.</p>
                ) : (
                  <div className="space-y-1.5">
                    {resolvedEscalations.map(e => <EscRow key={e.id} e={e} removable={false} />)}
                  </div>
                )}
              </CollapsibleSection>

              {/* Issues */}
              <CollapsibleSection label="Issues" count={resolvedIssues.length}>
                {resolvedIssues.length === 0 ? (
                  <p className="text-xs text-gray-400 py-1">No issues linked.</p>
                ) : (
                  <div className="space-y-1.5">
                    {resolvedIssues.map(i => <IssRow key={i.id} i={i} removable={false} />)}
                  </div>
                )}
              </CollapsibleSection>

              {/* Accounts */}
              <CollapsibleSection label="Accounts" count={resolvedAccounts.length}>
                {resolvedAccounts.length === 0 ? (
                  <p className="text-xs text-gray-400 py-1">No accounts linked.</p>
                ) : (
                  <div className="space-y-1.5">
                    {resolvedAccounts.map(a => <AccRow key={a.id} a={a} />)}
                  </div>
                )}
              </CollapsibleSection>

              {/* AI recommendation */}
              <AiPanel
                section="feature_request"
                title="AI Recommendation"
                getPayload={() => ({ feature_request_id: reviewFr.id })}
                initialText={reviewFr.ai_recommendation}
                initialAt={reviewFr.ai_recommendation_at}
                onGenerated={(t, at) => {
                  setReviewFr(prev => prev ? { ...prev, ai_recommendation: t, ai_recommendation_at: at } : prev);
                  setFrs(prev => prev.map(x => x.id === reviewFr.id ? { ...x, ai_recommendation: t, ai_recommendation_at: at } : x));
                }}
                hint="Recommends whether to take this up, a priority and a suggested ETA from the linked accounts, escalations and issues."
              />

              {/* Rejection reason */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Rejection reason <span className="text-gray-400 font-normal">(required to reject)</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Explain why this is being rejected…"
                  rows={3}
                  className="w-full resize-none text-sm"
                />
              </div>
            </div>

            <div className="border-t border-gray-100 px-5 py-4 shrink-0 flex justify-end gap-3">
              <button onClick={() => setReviewFr(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancel</button>
              <button onClick={handleReject} disabled={reviewing || !rejectReason.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-60">
                {reviewing ? '…' : 'Reject'}
              </button>
              <button onClick={() => handleApprove(reviewFr)} disabled={reviewing}
                className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-60">
                {reviewing ? '…' : 'Approve'}
              </button>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Link drill-downs (shared with Weekly View / Account Mapping reports) */}
      <DrillModal drill={drill} onClose={() => setDrill(null)} />
      {acctModal && <AccountListModal title={acctModal.title} accounts={acctModal.accounts} onClose={() => setAcctModal(null)} />}
    </div>
  );
}
