import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
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
  const [loading,     setLoading]     = useState(true);
  const [filters,     setFilters]     = useState({ status: '', csm: '', month: '' });
  const [expanded,    setExpanded]    = useState(null);
  const [reload,      setReload]      = useState(0);
  const [showForm,    setShowForm]    = useState(false);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [saving,      setSaving]      = useState(false);
  const [accounts,    setAccounts]    = useState([]);
  const [csms,        setCsms]        = useState([]);

  useEffect(() => {
    axios.get('/api/accounts').then(r => {
      const list = r.data || [];
      setAccounts(list.sort((a,b) => a.account_name.localeCompare(b.account_name)));
    }).catch(() => {});
    axios.get('/api/accounts/filters').then(r => setCsms(r.data.csms || [])).catch(() => {});
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

  const stats = {
    total:         escalations.length,
    open:          escalations.filter(e => e.status === 'Open').length,
    inProgress:    escalations.filter(e => e.status === 'In Progress').length,
    partlyResolved:escalations.filter(e => e.status === 'Partly Resolved').length,
    resolved:      escalations.filter(e => e.status === 'Resolved').length,
  };

  const allCsms   = [...new Set(escalations.map(e => e.csm).filter(Boolean))].sort();
  const allMonths = [...new Set(escalations.map(e => e.month).filter(Boolean))];
  allMonths.sort((a,b) => MONTHS.indexOf(a) - MONTHS.indexOf(b));

  const inp = (field, placeholder, type='text') => (
    <input type={type} value={form[field] || ''} placeholder={placeholder}
      onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
      className="!py-1.5 text-sm" />
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Escalations</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track and manage account escalations</p>
        </div>
        <button
          onClick={() => { setShowForm(s => !s); setForm(EMPTY_FORM); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Escalation
        </button>
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
                onChange={e => setForm(f => ({ ...f, date_of_escalation: e.target.value }))}
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
      <div className="card flex flex-wrap items-center gap-3">
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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">RAG</th>
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
                {escalations.map(e => {
                  const rag = e.accounts?.rag_status;
                  return (
                    <React.Fragment key={e.id}>
                      <tr
                        className="hover:bg-gray-50 cursor-pointer transition"
                        onClick={() => setExpanded(expanded === e.id ? null : e.id)}
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
                      </tr>
                      {expanded === e.id && (
                        <tr className="bg-blue-50">
                          <td colSpan={9} className="px-4 py-4">
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
