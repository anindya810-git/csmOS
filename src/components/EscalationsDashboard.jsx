import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const STATUS_STYLES = {
  'Resolved':        'bg-green-100 text-green-800',
  'In Progress':     'bg-amber-100 text-amber-800',
  'Partly Resolved': 'bg-blue-100 text-blue-800',
  'Open':            'bg-red-100 text-red-800',
};

const RAG_BADGE = {
  Green: 'bg-green-100 text-green-800',
  Amber: 'bg-amber-100 text-amber-800',
  Red:   'bg-red-100 text-red-800',
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const OWNERSHIP_OPTIONS = ['CSM','PS','CSM + PS','PS + CSM','Support + CSM','Sales + CSM','CSM + CP','CSM + CP + PS','CSM + PS + Engg','PS + CSM + Support','CSM + Engg + Support','CSM + Engg + PS','Support + Engg + PS + CSM','PS DEV + Product + CSM','Support + Product + CSM','CSM + Billings','Product'];
const ESCALATED_BY_OPTIONS = ['CSM','Vivek','Pritam','Vivek / Pritam','Nilesh','Prashant'];
const PS_LEADER_OPTIONS = ['Hirak','Ambrish'];

const EMPTY_FORM = {
  account_id: null, account_name: '', tenant_id: '',
  date_of_escalation: '', month: '', description: '', action_taken: '',
  ownership: '', status: 'Open', csm: '', eta: '', email_subject: '',
  ps_leader: '', escalated_by: '',
  trigger_reason: '', source_of_escalation: '', issue_type: '', issue_sub_type: '',
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
  const navigate = useNavigate();
  const [escalations, setEscalations] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filters,     setFilters]     = useState({ status: '', csm: '', month: '', escalated_by: '', date_from: '', date_to: '' });
  const [expanded,    setExpanded]    = useState(null);
  const [reload,      setReload]      = useState(0);
  const [showForm,    setShowForm]    = useState(false);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [saving,      setSaving]      = useState(false);
  const [accounts,    setAccounts]    = useState([]);
  const [csms,        setCsms]        = useState([]);
  const [editing,       setEditing]       = useState(null);
  const [editForm,      setEditForm]      = useState({});
  const [editSaving,    setEditSaving]    = useState(false);
  const [dropdownConfig, setDropdownConfig] = useState({});

  useEffect(() => {
    axios.get('/api/accounts').then(r => {
      const list = r.data || [];
      setAccounts(list.sort((a,b) => a.account_name.localeCompare(b.account_name)));
    }).catch(() => {});
    axios.get('/api/accounts/filters').then(r => setCsms(r.data.csms || [])).catch(() => {});
    axios.get('/api/dropdown-config').then(r => setDropdownConfig(r.data || {})).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.csm)    params.csm    = filters.csm;
    if (filters.month)  params.month  = filters.month;
    axios.get('/api/escalations', { params })
      .then(r => setEscalations(r.data || []))
      .catch(() => setEscalations([]))
      .finally(() => setLoading(false));
  }, [filters, reload]);

  useEffect(() => { load(); }, [load]);

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }));

  const handleAccountSelect = (accountId) => {
    const acct = accounts.find(a => String(a.id) === String(accountId));
    if (acct) {
      setForm(f => ({ ...f, account_id: acct.id, account_name: acct.account_name, tenant_id: acct.tenant_id || '', csm: acct.csm || f.csm }));
    } else {
      setForm(f => ({ ...f, account_id: null, account_name: '', tenant_id: '' }));
    }
  };

  const handleSave = async () => {
    if (!form.description) { alert('Description is required'); return; }
    setSaving(true);
    try {
      await axios.post('/api/escalations', form);
      setShowForm(false);
      setForm(EMPTY_FORM);
      setReload(r => r + 1);
    } catch (e) {
      alert('Failed to save: ' + (e.response?.data?.error || e.message));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (e) => {
    setEditing(e.id);
    setExpanded(null);
    const acct = accounts.find(a => String(a.id) === String(e.account_id));
    setEditForm({
      account_id: e.account_id || '',
      account_name: acct?.account_name || e.account_name || '',
      tenant_id: acct?.tenant_id || e.tenant_id || '',
      date_of_escalation: e.date_of_escalation ? e.date_of_escalation.slice(0, 10) : '',
      month: e.month || '',
      description: e.description || '',
      action_taken: e.action_taken || '',
      ownership: e.ownership || '',
      status: e.status || 'Open',
      csm: acct?.csm || e.csm || '',
      eta: e.eta || '',
      ps_leader: e.ps_leader || '',
      escalated_by: e.escalated_by || '',
      email_subject: e.email_subject || '',
      trigger_reason: e.trigger_reason || '',
      source_of_escalation: e.source_of_escalation || '',
      issue_type: e.issue_type || '',
      issue_sub_type: e.issue_sub_type || '',
    });
  };

  const handleEditAccountSelect = (accountId) => {
    const acct = accounts.find(a => String(a.id) === String(accountId));
    if (acct) {
      setEditForm(f => ({ ...f, account_id: acct.id, account_name: acct.account_name, tenant_id: acct.tenant_id || '', csm: acct.csm || f.csm }));
    } else {
      setEditForm(f => ({ ...f, account_id: '', account_name: '', tenant_id: '' }));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this escalation? This cannot be undone.')) return;
    try {
      await axios.delete(`/api/escalations/${id}`);
      if (editing === id) setEditing(null);
      setReload(r => r + 1);
    } catch (e) {
      alert('Failed to delete: ' + (e.response?.data?.error || e.message));
    }
  };

  const handleEditSave = async () => {
    if (!editForm.description) { alert('Description is required'); return; }
    setEditSaving(true);
    try {
      await axios.put(`/api/escalations/${editing}`, {
        ...editForm,
        account_id: editForm.account_id || null,
        account_name: editForm.account_name || null,
        tenant_id: editForm.tenant_id || null,
      });
      setEditing(null);
      setReload(r => r + 1);
    } catch (e) {
      alert('Failed to save: ' + (e.response?.data?.error || e.message));
    } finally {
      setEditSaving(false);
    }
  };

  const allCsms        = [...new Set(escalations.map(e => e.csm).filter(Boolean))].sort();
  const allMonths      = [...new Set(escalations.map(e => e.month).filter(Boolean))];
  allMonths.sort((a,b) => MONTHS.indexOf(a) - MONTHS.indexOf(b));
  const allEscalatedBy = [...new Set(escalations.map(e => e.escalated_by).filter(Boolean))].sort();

  // Client-side filters applied on top of the server-filtered list
  const displayed = escalations.filter(e => {
    if (filters.escalated_by && e.escalated_by !== filters.escalated_by) return false;
    if (filters.date_from) {
      const d = e.date_of_escalation ? new Date(e.date_of_escalation) : null;
      if (!d || d < new Date(filters.date_from)) return false;
    }
    if (filters.date_to) {
      const d = e.date_of_escalation ? new Date(e.date_of_escalation) : null;
      if (!d || d > new Date(filters.date_to + 'T23:59:59')) return false;
    }
    return true;
  });

  const stats = {
    total:         displayed.length,
    open:          displayed.filter(e => e.status === 'Open').length,
    inProgress:    displayed.filter(e => e.status === 'In Progress').length,
    partlyResolved:displayed.filter(e => e.status === 'Partly Resolved').length,
    resolved:      displayed.filter(e => e.status === 'Resolved').length,
  };

  const inp = (field, placeholder, type='text') => (
    <input type={type} value={form[field] || ''} placeholder={placeholder}
      onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
      className="!py-1.5 text-sm" />
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Escalations</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track and manage account escalations</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigate('/escalations/weekly')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            Weekly View
          </button>
          <button
            onClick={() => { setShowForm(s => !s); setForm(EMPTY_FORM); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Escalation
          </button>
        </div>
      </div>

      {/* Add Escalation Form */}
      {showForm && (
        <div className="card border-brand-200 bg-brand-50/30 space-y-4">
          <p className="text-sm font-semibold text-gray-800">New Escalation</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="sm:col-span-2 lg:col-span-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Account *</p>
              <select value={form.account_id || ''} onChange={e => handleAccountSelect(e.target.value)} className="!py-1.5 text-sm">
                <option value="">Select account…</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.account_name}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Date of Escalation</p>
              <input type="date" value={form.date_of_escalation}
                onChange={e => {
                  const val = e.target.value;
                  const month = val ? MONTHS[new Date(val + 'T00:00:00').getMonth()] : '';
                  setForm(f => ({ ...f, date_of_escalation: val, month }));
                }}
                className="!py-1.5 text-sm" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Month</p>
              <select value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} className="!py-1.5 text-sm">
                <option value="">—</option>
                {MONTHS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Description *</p>
              <textarea rows={3} value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Describe the escalation issue…" className="text-sm" />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Action Taken</p>
              <textarea rows={2} value={form.action_taken}
                onChange={e => setForm(f => ({ ...f, action_taken: e.target.value }))}
                placeholder="What steps were taken to resolve this…" className="text-sm" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Status</p>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="!py-1.5 text-sm">
                <option>Open</option><option>In Progress</option><option>Partly Resolved</option><option>Resolved</option>
              </select>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Ownership</p>
              <select value={form.ownership} onChange={e => setForm(f => ({ ...f, ownership: e.target.value }))} className="!py-1.5 text-sm">
                <option value="">—</option>
                {OWNERSHIP_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">ETA</p>
              <input type="date" value={form.eta}
                onChange={e => setForm(f => ({ ...f, eta: e.target.value }))}
                className="!py-1.5 text-sm" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">CSM</p>
              {csms.length ? (
                <select value={form.csm} onChange={e => setForm(f => ({ ...f, csm: e.target.value }))} className="!py-1.5 text-sm">
                  <option value="">—</option>
                  {csms.map(c => <option key={c}>{c}</option>)}
                </select>
              ) : inp('csm', 'CSM name')}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">PS Leader</p>
              <select value={form.ps_leader} onChange={e => setForm(f => ({ ...f, ps_leader: e.target.value }))} className="!py-1.5 text-sm">
                <option value="">—</option>
                {PS_LEADER_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Escalated By</p>
              <select value={form.escalated_by} onChange={e => setForm(f => ({ ...f, escalated_by: e.target.value }))} className="!py-1.5 text-sm">
                <option value="">—</option>
                {ESCALATED_BY_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Trigger Reason</p>
              <select value={form.trigger_reason} onChange={e => setForm(f => ({ ...f, trigger_reason: e.target.value }))} className="!py-1.5 text-sm">
                <option value="">—</option>
                {(dropdownConfig.trigger_reason || []).map(o => <option key={o.id} value={o.value}>{o.value}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Source of Escalation</p>
              <select value={form.source_of_escalation} onChange={e => setForm(f => ({ ...f, source_of_escalation: e.target.value }))} className="!py-1.5 text-sm">
                <option value="">—</option>
                {(dropdownConfig.source_of_escalation || []).map(o => <option key={o.id} value={o.value}>{o.value}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Issue Type</p>
              <select value={form.issue_type} onChange={e => setForm(f => ({ ...f, issue_type: e.target.value, issue_sub_type: '' }))} className="!py-1.5 text-sm">
                <option value="">—</option>
                {(dropdownConfig.issue_type || []).map(o => <option key={o.id} value={o.value}>{o.value}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Issue Sub-Type</p>
              <select value={form.issue_sub_type} onChange={e => setForm(f => ({ ...f, issue_sub_type: e.target.value }))} className="!py-1.5 text-sm" disabled={!form.issue_type}>
                <option value="">{form.issue_type ? '—' : 'Select Issue Type first'}</option>
                {(dropdownConfig.issue_sub_type || []).filter(o => o.parent_value === form.issue_type).map(o => <option key={o.id} value={o.value}>{o.value}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Email Subject</p>
              {inp('email_subject', 'Email subject line (if any)')}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={saving || !form.description}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-60">
              {saving ? 'Saving…' : 'Save Escalation'}
            </button>
            <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition">Cancel</button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total',          value: stats.total,          color: 'bg-gray-50 border-gray-200',   text: 'text-gray-900' },
          { label: 'Open',           value: stats.open,           color: 'bg-red-50 border-red-200',     text: 'text-red-700' },
          { label: 'In Progress',    value: stats.inProgress,     color: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
          { label: 'Partly Resolved',value: stats.partlyResolved, color: 'bg-blue-50 border-blue-200',   text: 'text-blue-700' },
          { label: 'Resolved',       value: stats.resolved,       color: 'bg-green-50 border-green-200', text: 'text-green-700' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
            <p className="text-xs font-medium text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.text}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <select value={filters.status} onChange={e => setFilter('status', e.target.value)} className="!w-auto text-sm">
            <option value="">All Statuses</option>
            <option>Open</option><option>In Progress</option><option>Partly Resolved</option><option>Resolved</option>
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
          <select value={filters.escalated_by} onChange={e => setFilter('escalated_by', e.target.value)} className="!w-auto text-sm">
            <option value="">All Escalated By</option>
            {allEscalatedBy.map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium whitespace-nowrap">From</label>
            <input type="date" value={filters.date_from} onChange={e => setFilter('date_from', e.target.value)}
              className="!w-auto !py-1.5 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium whitespace-nowrap">To</label>
            <input type="date" value={filters.date_to} onChange={e => setFilter('date_to', e.target.value)}
              className="!w-auto !py-1.5 text-sm" />
          </div>
          {(filters.status || filters.csm || filters.month || filters.escalated_by || filters.date_from || filters.date_to) && (
            <button onClick={() => setFilters({ status: '', csm: '', month: '', escalated_by: '', date_from: '', date_to: '' })}
              className="text-sm text-gray-500 hover:text-gray-700 underline">Clear all</button>
          )}
          <span className="ml-auto text-sm text-gray-400">{displayed.length} escalation{displayed.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">No escalations found.</div>
      ) : (
        <>
        {/* Desktop table */}
        <div className="card overflow-hidden p-0 hidden lg:block">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Account</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">RAG</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">CSM</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ownership</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">ETA</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Escalated By</th>
                  <th className="px-3 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayed.map(e => {
                  const rag = e.accounts?.rag_status;
                  const isEditing = editing === e.id;
                  return (
                    <React.Fragment key={e.id}>
                      <tr
                        className={`transition ${isEditing ? 'bg-amber-50/40' : 'hover:bg-gray-50 cursor-pointer'}`}
                        onClick={() => { if (!isEditing) setExpanded(expanded === e.id ? null : e.id); }}
                      >
                        <td className="px-4 py-3">
                          {e.account_id ? (
                            <Link
                              to={`/accounts/${e.account_id}`}
                              className="font-medium text-brand-700 hover:underline"
                              onClick={ev => ev.stopPropagation()}
                            >
                              {e.account_name}
                            </Link>
                          ) : (
                            <span className="font-medium text-gray-900">{e.account_name}</span>
                          )}
                          {e.tenant_id && <div className="text-xs text-gray-400 font-mono">{e.tenant_id}</div>}
                        </td>
                        <td className="px-4 py-3">
                          {rag ? (
                            <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${RAG_BADGE[rag] || 'bg-gray-100 text-gray-700'}`}>{rag}</span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {e.date_of_escalation ? new Date(e.date_of_escalation).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—'}
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <p className="text-gray-700 line-clamp-2">{e.description}</p>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{e.csm || '—'}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{e.ownership || '—'}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{e.eta || '—'}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{e.escalated_by || '—'}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={ev => { ev.stopPropagation(); isEditing ? setEditing(null) : startEdit(e); }}
                              className={`p-1.5 rounded-md transition ${isEditing ? 'text-amber-600 bg-amber-100 hover:bg-amber-200' : 'text-gray-400 hover:text-brand-600 hover:bg-gray-100'}`}
                              title={isEditing ? 'Cancel edit' : 'Edit escalation'}
                            >
                              {isEditing ? (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              )}
                            </button>
                            {user?.role === 'admin' && !isEditing && (
                              <button
                                onClick={ev => { ev.stopPropagation(); handleDelete(e.id); }}
                                className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                                title="Delete escalation"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expanded === e.id && !isEditing && (
                        <tr className="bg-blue-50">
                          <td colSpan={10} className="px-4 py-4">
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
                                {e.trigger_reason && <span><span className="font-medium">Trigger:</span> {e.trigger_reason}</span>}
                                {e.source_of_escalation && <span><span className="font-medium">Source:</span> {e.source_of_escalation}</span>}
                                {e.issue_type && <span><span className="font-medium">Issue Type:</span> {e.issue_type}</span>}
                                {e.issue_sub_type && <span><span className="font-medium">Sub-Type:</span> {e.issue_sub_type}</span>}
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
                      {isEditing && (
                        <tr className="bg-amber-50">
                          <td colSpan={10} className="px-4 py-4">
                            <div className="space-y-4">
                              <p className="text-sm font-semibold text-gray-800">Edit Escalation</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                <div>
                                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Account</p>
                                  <select value={editForm.account_id || ''} onChange={ev => handleEditAccountSelect(ev.target.value)} className="!py-1.5 text-sm">
                                    <option value="">Select account…</option>
                                    {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Account Name <span className="text-gray-300 font-normal normal-case">(read-only)</span></p>
                                  <input type="text" value={editForm.account_name || ''} readOnly className="!py-1.5 text-sm bg-gray-100 cursor-not-allowed" />
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Tenant ID <span className="text-gray-300 font-normal normal-case">(read-only)</span></p>
                                  <input type="text" value={editForm.tenant_id || ''} readOnly className="!py-1.5 text-sm bg-gray-100 cursor-not-allowed font-mono" />
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Date of Escalation</p>
                                  <input type="date" value={editForm.date_of_escalation || ''}
                                    onChange={ev => {
                                      const val = ev.target.value;
                                      const month = val ? MONTHS[new Date(val + 'T00:00:00').getMonth()] : '';
                                      setEditForm(f => ({ ...f, date_of_escalation: val, month }));
                                    }}
                                    className="!py-1.5 text-sm" />
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Month</p>
                                  <select value={editForm.month || ''} onChange={ev => setEditForm(f => ({ ...f, month: ev.target.value }))} className="!py-1.5 text-sm">
                                    <option value="">—</option>
                                    {MONTHS.map(m => <option key={m}>{m}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Status</p>
                                  <select value={editForm.status || 'Open'} onChange={ev => setEditForm(f => ({ ...f, status: ev.target.value }))} className="!py-1.5 text-sm">
                                    <option>Open</option><option>In Progress</option><option>Partly Resolved</option><option>Resolved</option>
                                  </select>
                                </div>
                                <div className="sm:col-span-2 lg:col-span-3">
                                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Description *</p>
                                  <textarea rows={3} value={editForm.description || ''}
                                    onChange={ev => setEditForm(f => ({ ...f, description: ev.target.value }))}
                                    className="text-sm" />
                                </div>
                                <div className="sm:col-span-2 lg:col-span-3">
                                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Action Taken</p>
                                  <textarea rows={2} value={editForm.action_taken || ''}
                                    onChange={ev => setEditForm(f => ({ ...f, action_taken: ev.target.value }))}
                                    className="text-sm" />
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Ownership</p>
                                  <select value={editForm.ownership || ''} onChange={ev => setEditForm(f => ({ ...f, ownership: ev.target.value }))} className="!py-1.5 text-sm">
                                    <option value="">—</option>
                                    {OWNERSHIP_OPTIONS.map(o => <option key={o}>{o}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">ETA</p>
                                  <input type="date" value={editForm.eta || ''}
                                    onChange={ev => setEditForm(f => ({ ...f, eta: ev.target.value }))}
                                    className="!py-1.5 text-sm" />
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">CSM <span className="text-gray-300 font-normal normal-case">(read-only)</span></p>
                                  <input type="text" value={editForm.csm || ''} readOnly className="!py-1.5 text-sm bg-gray-100 cursor-not-allowed" />
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">PS Leader</p>
                                  <select value={editForm.ps_leader || ''} onChange={ev => setEditForm(f => ({ ...f, ps_leader: ev.target.value }))} className="!py-1.5 text-sm">
                                    <option value="">—</option>
                                    {PS_LEADER_OPTIONS.map(o => <option key={o}>{o}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Escalated By</p>
                                  <select value={editForm.escalated_by || ''} onChange={ev => setEditForm(f => ({ ...f, escalated_by: ev.target.value }))} className="!py-1.5 text-sm">
                                    <option value="">—</option>
                                    {ESCALATED_BY_OPTIONS.map(o => <option key={o}>{o}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Trigger Reason</p>
                                  <select value={editForm.trigger_reason || ''} onChange={ev => setEditForm(f => ({ ...f, trigger_reason: ev.target.value }))} className="!py-1.5 text-sm">
                                    <option value="">—</option>
                                    {(dropdownConfig.trigger_reason || []).map(o => <option key={o.id} value={o.value}>{o.value}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Source of Escalation</p>
                                  <select value={editForm.source_of_escalation || ''} onChange={ev => setEditForm(f => ({ ...f, source_of_escalation: ev.target.value }))} className="!py-1.5 text-sm">
                                    <option value="">—</option>
                                    {(dropdownConfig.source_of_escalation || []).map(o => <option key={o.id} value={o.value}>{o.value}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Issue Type</p>
                                  <select value={editForm.issue_type || ''} onChange={ev => setEditForm(f => ({ ...f, issue_type: ev.target.value, issue_sub_type: '' }))} className="!py-1.5 text-sm">
                                    <option value="">—</option>
                                    {(dropdownConfig.issue_type || []).map(o => <option key={o.id} value={o.value}>{o.value}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Issue Sub-Type</p>
                                  <select value={editForm.issue_sub_type || ''} onChange={ev => setEditForm(f => ({ ...f, issue_sub_type: ev.target.value }))} className="!py-1.5 text-sm" disabled={!editForm.issue_type}>
                                    <option value="">{editForm.issue_type ? '—' : 'Select Issue Type first'}</option>
                                    {(dropdownConfig.issue_sub_type || []).filter(o => o.parent_value === editForm.issue_type).map(o => <option key={o.id} value={o.value}>{o.value}</option>)}
                                  </select>
                                </div>
                                <div className="sm:col-span-2">
                                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Email Subject</p>
                                  <input type="text" value={editForm.email_subject || ''} onChange={ev => setEditForm(f => ({ ...f, email_subject: ev.target.value }))} className="!py-1.5 text-sm" placeholder="Email subject line (if any)" />
                                </div>
                              </div>
                              <div className="flex gap-2 pt-1">
                                <button onClick={handleEditSave} disabled={editSaving || !editForm.description}
                                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-60">
                                  {editSaving ? 'Saving…' : 'Save Changes'}
                                </button>
                                <button onClick={() => setEditing(null)}
                                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition">Cancel</button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile / tablet cards */}
        <div className="lg:hidden space-y-3">
          {displayed.map(e => {
            const rag = e.accounts?.rag_status;
            const open = expanded === e.id;
            const isEditing = editing === e.id;
            return (
              <div key={e.id} className="card p-0 overflow-hidden">
                <div className="flex items-stretch">
                  <button type="button" onClick={() => { if (!isEditing) setExpanded(open ? null : e.id); }}
                    className="flex-1 text-left p-4 active:bg-gray-50 transition min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {e.account_id ? (
                          <Link to={`/accounts/${e.account_id}`} onClick={ev => ev.stopPropagation()}
                            className="font-semibold text-brand-700 hover:underline break-words">{e.account_name}</Link>
                        ) : (
                          <span className="font-semibold text-gray-900 break-words">{e.account_name}</span>
                        )}
                        {e.tenant_id && <p className="text-xs text-gray-400 font-mono">{e.tenant_id}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <StatusBadge status={e.status} />
                        {rag && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${RAG_BADGE[rag] || 'bg-gray-100 text-gray-700'}`}>{rag}</span>}
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-gray-700 line-clamp-2">{e.description}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      {e.date_of_escalation && <span>{new Date(e.date_of_escalation).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</span>}
                      {e.csm && <span><span className="text-gray-400">CSM:</span> {e.csm}</span>}
                      {e.eta && <span><span className="text-gray-400">ETA:</span> {e.eta}</span>}
                    </div>
                  </button>
                  <div className="flex flex-col border-l border-gray-100 shrink-0">
                    <button
                      onClick={() => { isEditing ? setEditing(null) : startEdit(e); }}
                      className={`flex-1 px-3 transition ${isEditing ? 'bg-amber-100 text-amber-600' : 'text-gray-400 hover:text-brand-600 hover:bg-gray-50'}`}
                      title={isEditing ? 'Cancel edit' : 'Edit escalation'}
                    >
                      {isEditing ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      )}
                    </button>
                    {user?.role === 'admin' && !isEditing && (
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="flex-1 px-3 border-t border-gray-100 text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                        title="Delete escalation"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                  </div>
                </div>
                {open && !isEditing && (
                  <div className="px-4 pb-4 pt-1 bg-gray-50 border-t border-gray-100 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Description</p>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{e.description}</p>
                    </div>
                    {e.action_taken && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Action Taken</p>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{e.action_taken}</p>
                      </div>
                    )}
                    {e.email_subject && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Email Subject</p>
                        <p className="text-sm text-gray-700 italic">{e.email_subject}</p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      {e.ownership && <span><span className="font-medium">Ownership:</span> {e.ownership}</span>}
                      {e.ps_leader && <span><span className="font-medium">PS Leader:</span> {e.ps_leader}</span>}
                      {e.escalated_by && <span><span className="font-medium">Escalated By:</span> {e.escalated_by}</span>}
                      {e.trigger_reason && <span><span className="font-medium">Trigger:</span> {e.trigger_reason}</span>}
                      {e.source_of_escalation && <span><span className="font-medium">Source:</span> {e.source_of_escalation}</span>}
                      {e.issue_type && <span><span className="font-medium">Issue Type:</span> {e.issue_type}</span>}
                      {e.issue_sub_type && <span><span className="font-medium">Sub-Type:</span> {e.issue_sub_type}</span>}
                      {e.month && <span><span className="font-medium">Month:</span> {e.month}</span>}
                    </div>
                    {e.account_id && (
                      <Link to={`/accounts/${e.account_id}`} className="inline-block text-sm text-brand-600 hover:underline font-medium">View Account →</Link>
                    )}
                  </div>
                )}
                {isEditing && (
                  <div className="px-4 pb-4 pt-3 bg-amber-50 border-t border-amber-100 space-y-4">
                    <p className="text-sm font-semibold text-gray-800">Edit Escalation</p>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Account</p>
                        <select value={editForm.account_id || ''} onChange={ev => handleEditAccountSelect(ev.target.value)} className="text-sm">
                          <option value="">Select account…</option>
                          {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Account Name</p>
                          <input type="text" value={editForm.account_name || ''} readOnly className="text-sm bg-gray-100 cursor-not-allowed" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Tenant ID</p>
                          <input type="text" value={editForm.tenant_id || ''} readOnly className="text-xs bg-gray-100 cursor-not-allowed font-mono" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Date</p>
                          <input type="date" value={editForm.date_of_escalation || ''}
                            onChange={ev => {
                              const val = ev.target.value;
                              const month = val ? MONTHS[new Date(val + 'T00:00:00').getMonth()] : '';
                              setEditForm(f => ({ ...f, date_of_escalation: val, month }));
                            }}
                            className="text-sm" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Month</p>
                          <select value={editForm.month || ''} onChange={ev => setEditForm(f => ({ ...f, month: ev.target.value }))} className="text-sm">
                            <option value="">—</option>
                            {MONTHS.map(m => <option key={m}>{m}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Description *</p>
                        <textarea rows={3} value={editForm.description || ''}
                          onChange={ev => setEditForm(f => ({ ...f, description: ev.target.value }))}
                          className="text-sm" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Action Taken</p>
                        <textarea rows={2} value={editForm.action_taken || ''}
                          onChange={ev => setEditForm(f => ({ ...f, action_taken: ev.target.value }))}
                          className="text-sm" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Status</p>
                          <select value={editForm.status || 'Open'} onChange={ev => setEditForm(f => ({ ...f, status: ev.target.value }))} className="text-sm">
                            <option>Open</option><option>In Progress</option><option>Partly Resolved</option><option>Resolved</option>
                          </select>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Ownership</p>
                          <select value={editForm.ownership || ''} onChange={ev => setEditForm(f => ({ ...f, ownership: ev.target.value }))} className="text-sm">
                            <option value="">—</option>
                            {OWNERSHIP_OPTIONS.map(o => <option key={o}>{o}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">ETA</p>
                          <input type="date" value={editForm.eta || ''}
                            onChange={ev => setEditForm(f => ({ ...f, eta: ev.target.value }))}
                            className="text-sm" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">CSM</p>
                          <input type="text" value={editForm.csm || ''} readOnly className="text-sm bg-gray-100 cursor-not-allowed" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">PS Leader</p>
                          <select value={editForm.ps_leader || ''} onChange={ev => setEditForm(f => ({ ...f, ps_leader: ev.target.value }))} className="text-sm">
                            <option value="">—</option>
                            {PS_LEADER_OPTIONS.map(o => <option key={o}>{o}</option>)}
                          </select>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Escalated By</p>
                          <select value={editForm.escalated_by || ''} onChange={ev => setEditForm(f => ({ ...f, escalated_by: ev.target.value }))} className="text-sm">
                            <option value="">—</option>
                            {ESCALATED_BY_OPTIONS.map(o => <option key={o}>{o}</option>)}
                          </select>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Trigger Reason</p>
                          <select value={editForm.trigger_reason || ''} onChange={ev => setEditForm(f => ({ ...f, trigger_reason: ev.target.value }))} className="text-sm">
                            <option value="">—</option>
                            {(dropdownConfig.trigger_reason || []).map(o => <option key={o.id} value={o.value}>{o.value}</option>)}
                          </select>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Source of Escalation</p>
                          <select value={editForm.source_of_escalation || ''} onChange={ev => setEditForm(f => ({ ...f, source_of_escalation: ev.target.value }))} className="text-sm">
                            <option value="">—</option>
                            {(dropdownConfig.source_of_escalation || []).map(o => <option key={o.id} value={o.value}>{o.value}</option>)}
                          </select>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Issue Type</p>
                          <select value={editForm.issue_type || ''} onChange={ev => setEditForm(f => ({ ...f, issue_type: ev.target.value, issue_sub_type: '' }))} className="text-sm">
                            <option value="">—</option>
                            {(dropdownConfig.issue_type || []).map(o => <option key={o.id} value={o.value}>{o.value}</option>)}
                          </select>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Issue Sub-Type</p>
                          <select value={editForm.issue_sub_type || ''} onChange={ev => setEditForm(f => ({ ...f, issue_sub_type: ev.target.value }))} className="text-sm" disabled={!editForm.issue_type}>
                            <option value="">{editForm.issue_type ? '—' : 'Select Issue Type first'}</option>
                            {(dropdownConfig.issue_sub_type || []).filter(o => o.parent_value === editForm.issue_type).map(o => <option key={o.id} value={o.value}>{o.value}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Email Subject</p>
                        <input type="text" value={editForm.email_subject || ''} onChange={ev => setEditForm(f => ({ ...f, email_subject: ev.target.value }))} className="text-sm" placeholder="Email subject line (if any)" />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={handleEditSave} disabled={editSaving || !editForm.description}
                        className="flex-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-60">
                        {editSaving ? 'Saving…' : 'Save Changes'}
                      </button>
                      <button onClick={() => setEditing(null)}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg transition">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </>
      )}
    </div>
  );
}
