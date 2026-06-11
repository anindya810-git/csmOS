import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Pagination from './Pagination';

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

const OPS_TEXT   = ['contains','does not contain','is','is not','is empty','is not empty'];
const OPS_SELECT = ['is','is not','is empty','is not empty'];
const OPS_DATE   = ['is','before','after','is empty','is not empty'];
function getOps(type) {
  if (type === 'select') return OPS_SELECT;
  if (type === 'date')   return OPS_DATE;
  return OPS_TEXT;
}
function needsValue(op) { return !['is empty','is not empty'].includes(op); }
function matchesEscalationCondition(esc, cond, fieldDefs) {
  const { field, operator, value } = cond;
  const def = fieldDefs.find(f => f.key === field);
  if (!def) return true;
  const raw = esc[field];
  if (operator === 'is empty')     return raw === null || raw === undefined || raw === '';
  if (operator === 'is not empty') return raw !== null && raw !== undefined && raw !== '';
  if (def.type === 'date') {
    if (!raw || !value) return false;
    const rD = new Date(raw), vD = new Date(value);
    if (operator === 'is')     return rD.toDateString() === vD.toDateString();
    if (operator === 'before') return rD < vD;
    if (operator === 'after')  return rD > vD;
  }
  const r = String(raw ?? '').toLowerCase();
  const v = String(value ?? '').toLowerCase();
  if (operator === 'contains')         return r.includes(v);
  if (operator === 'does not contain') return !r.includes(v);
  if (operator === 'is')               return r === v;
  if (operator === 'is not')           return r !== v;
  return true;
}

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
  const [filters,     setFilters]     = useState({ status: '', csm: '', ownership: '', issue_type: '', month: '' });
  const [search,      setSearch]      = useState('');
  const [advancedOpen,setAdvancedOpen]= useState(false);
  const [conditions,  setConditions]  = useState([]);
  const [conditionLogic, setConditionLogic] = useState('AND');
  const [page,        setPage]        = useState(1);
  const [perPage,     setPerPage]     = useState(100);
  const [bulkOpen,    setBulkOpen]    = useState(false);
  const [bulkField,   setBulkField]   = useState('status');
  const [bulkValue,   setBulkValue]   = useState('');
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [bulkSaving,  setBulkSaving]  = useState(false);
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
    axios.get('/api/escalations')
      .then(r => setEscalations(r.data || []))
      .catch(() => setEscalations([]))
      .finally(() => setLoading(false));
  }, [reload]);

  useEffect(() => { load(); }, [load]);

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

  const addCondition = () =>
    setConditions(c => [...c, { id: Date.now(), field: 'account_name', operator: 'contains', value: '' }]);
  const updateCondition = (id, updates) =>
    setConditions(c => c.map(cond => cond.id === id ? { ...cond, ...updates } : cond));
  const removeCondition = (id) =>
    setConditions(c => c.filter(cond => cond.id !== id));

  const handleBulkApply = async () => {
    setBulkSaving(true);
    try {
      await axios.patch('/api/escalations', { ids: displayed.map(e => e.id), field: bulkField, value: bulkValue });
      setBulkConfirm(false);
      setBulkOpen(false);
      setBulkValue('');
      setReload(r => r + 1);
    } catch (e) {
      alert(e.response?.data?.error || 'Bulk update failed');
    } finally {
      setBulkSaving(false);
    }
  };

  const allCsms       = [...new Set(escalations.map(e => e.csm).filter(Boolean))].sort();
  const allMonths     = [...new Set(escalations.map(e => e.month).filter(Boolean))].sort((a, b) => MONTHS.indexOf(a) - MONTHS.indexOf(b));
  const allOwnerships = [...new Set(escalations.map(e => e.ownership).filter(Boolean))].sort();
  const allIssueTypes = [...new Set(escalations.map(e => e.issue_type).filter(Boolean))].sort();

  const fieldDefs = [
    { key: 'account_name',         label: 'Account Name',         type: 'text' },
    { key: 'description',          label: 'Description',          type: 'text' },
    { key: 'action_taken',         label: 'Action Taken',         type: 'text' },
    { key: 'status',               label: 'Status',               type: 'select', opts: (dropdownConfig.escalation_status?.length ? dropdownConfig.escalation_status.map(o => o.value) : ['Open','In Progress','Partly Resolved','Resolved']) },
    { key: 'csm',                  label: 'CSM',                  type: 'select', opts: allCsms },
    { key: 'ownership',            label: 'Ownership',            type: 'select', opts: (dropdownConfig.ownership || []).map(o => o.value) },
    { key: 'ps_leader',            label: 'PS Leader',            type: 'select', opts: (dropdownConfig.ps_leader || []).map(o => o.value) },
    { key: 'escalated_by',         label: 'Escalated By',         type: 'select', opts: (dropdownConfig.escalated_by || []).map(o => o.value) },
    { key: 'trigger_reason',       label: 'Trigger Reason',       type: 'select', opts: (dropdownConfig.trigger_reason || []).map(o => o.value) },
    { key: 'source_of_escalation', label: 'Source of Escalation', type: 'select', opts: (dropdownConfig.source_of_escalation || []).map(o => o.value) },
    { key: 'issue_type',           label: 'Issue Type',           type: 'select', opts: (dropdownConfig.issue_type || []).map(o => o.value) },
    { key: 'issue_sub_type',       label: 'Issue Sub-Type',       type: 'text' },
    { key: 'date_of_escalation',   label: 'Date of Escalation',   type: 'date' },
    { key: 'eta',                  label: 'ETA',                  type: 'date' },
    { key: 'month',                label: 'Month',                type: 'select', opts: MONTHS },
  ];

  const bulkFieldDefs = [
    { key: 'status',               label: 'Status',               type: 'select', group: 'Status & Resolution', opts: (dropdownConfig.escalation_status?.length ? dropdownConfig.escalation_status.map(o => o.value) : ['Open','In Progress','Partly Resolved','Resolved']) },
    { key: 'action_taken',         label: 'Action Taken',         type: 'text',   group: 'Status & Resolution' },
    { key: 'eta',                  label: 'ETA',                  type: 'date',   group: 'Status & Resolution' },
    { key: 'ownership',            label: 'Ownership',            type: 'select', group: 'Assignment', opts: (dropdownConfig.ownership || []).map(o => o.value) },
    { key: 'ps_leader',            label: 'PS Leader',            type: 'select', group: 'Assignment', opts: (dropdownConfig.ps_leader || []).map(o => o.value) },
    { key: 'escalated_by',         label: 'Escalated By',         type: 'select', group: 'Assignment', opts: (dropdownConfig.escalated_by || []).map(o => o.value) },
    { key: 'trigger_reason',       label: 'Trigger Reason',       type: 'select', group: 'Classification', opts: (dropdownConfig.trigger_reason || []).map(o => o.value) },
    { key: 'source_of_escalation', label: 'Source of Escalation', type: 'select', group: 'Classification', opts: (dropdownConfig.source_of_escalation || []).map(o => o.value) },
    { key: 'issue_type',           label: 'Issue Type',           type: 'select', group: 'Classification', opts: (dropdownConfig.issue_type || []).map(o => o.value) },
    { key: 'issue_sub_type',       label: 'Issue Sub-Type',       type: 'text',   group: 'Classification' },
    { key: 'month',                label: 'Month',                type: 'select', group: 'Classification', opts: MONTHS },
  ];

  const setFilter = (key, val) => { setFilters(f => ({ ...f, [key]: val })); setPage(1); };
  useEffect(() => { setPage(1); }, [search]);  // eslint-disable-line react-hooks/exhaustive-deps

  const clearAll = () => {
    setSearch('');
    setFilters({ status: '', csm: '', ownership: '', issue_type: '', month: '' });
    setConditions([]);
    setPage(1);
  };
  const hasFilters = !!(search || Object.values(filters).some(Boolean) || conditions.length > 0);
  const activeConditions = conditions.filter(c => c.field && c.operator);
  // paginated is derived after displayed is computed below

  const displayed = escalations.filter(e => {
    if (search) {
      const q = search.toLowerCase();
      const blob = [e.account_name, e.description, e.csm, e.ownership, e.escalated_by, e.issue_type].filter(Boolean).join(' ').toLowerCase();
      if (!blob.includes(q)) return false;
    }
    if (filters.status     && e.status     !== filters.status)     return false;
    if (filters.csm        && e.csm        !== filters.csm)        return false;
    if (filters.ownership  && e.ownership  !== filters.ownership)  return false;
    if (filters.issue_type && e.issue_type !== filters.issue_type) return false;
    if (filters.month      && e.month      !== filters.month)      return false;
    if (activeConditions.length === 0) return true;
    const results = activeConditions.map(c => matchesEscalationCondition(e, c, fieldDefs));
    return conditionLogic === 'OR' ? results.some(Boolean) : results.every(Boolean);
  });

  const paginated = displayed.slice((page - 1) * perPage, page * perPage);

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
          <p className="text-sm text-gray-500 mt-0.5">
            {displayed.length !== escalations.length
              ? `${displayed.length} of ${escalations.length} escalations`
              : `${escalations.length} escalation${escalations.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigate('/reports/weekly')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            Weekly View
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => { setBulkOpen(o => !o); setBulkValue(''); }}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition
                ${bulkOpen ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Bulk Update
            </button>
          )}
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
                {(dropdownConfig.escalation_status?.length ? dropdownConfig.escalation_status.map(o => o.value) : ['Open','In Progress','Partly Resolved','Resolved']).map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Ownership</p>
              <select value={form.ownership} onChange={e => setForm(f => ({ ...f, ownership: e.target.value }))} className="!py-1.5 text-sm">
                <option value="">—</option>
                {(dropdownConfig.ownership || []).map(o => <option key={o.id} value={o.value}>{o.value}</option>)}
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
                {(dropdownConfig.ps_leader || []).map(o => <option key={o.id} value={o.value}>{o.value}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Escalated By</p>
              <select value={form.escalated_by} onChange={e => setForm(f => ({ ...f, escalated_by: e.target.value }))} className="!py-1.5 text-sm">
                <option value="">—</option>
                {(dropdownConfig.escalated_by || []).map(o => <option key={o.id} value={o.value}>{o.value}</option>)}
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
      <div className="card p-4 space-y-3">
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search account, description, CSM, ownership…"
            className="pl-11 pr-10 !py-2.5 text-base w-full" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={filters.status} onChange={e => setFilter('status', e.target.value)} className="!w-auto text-sm !py-1.5">
            <option value="">All Statuses</option>
            {(dropdownConfig.escalation_status?.length ? dropdownConfig.escalation_status.map(o => o.value) : ['Open','In Progress','Partly Resolved','Resolved']).map(s => <option key={s}>{s}</option>)}
          </select>
          {user?.role === 'admin' && (
            <select value={filters.csm} onChange={e => setFilter('csm', e.target.value)} className="!w-auto text-sm !py-1.5">
              <option value="">All CSMs</option>
              {allCsms.map(c => <option key={c}>{c}</option>)}
            </select>
          )}
          <select value={filters.ownership} onChange={e => setFilter('ownership', e.target.value)} className="!w-auto text-sm !py-1.5">
            <option value="">All Ownerships</option>
            {allOwnerships.map(o => <option key={o}>{o}</option>)}
          </select>
          <select value={filters.issue_type} onChange={e => setFilter('issue_type', e.target.value)} className="!w-auto text-sm !py-1.5">
            <option value="">All Issue Types</option>
            {allIssueTypes.map(t => <option key={t}>{t}</option>)}
          </select>
          <select value={filters.month} onChange={e => setFilter('month', e.target.value)} className="!w-auto text-sm !py-1.5">
            <option value="">All Months</option>
            {allMonths.map(m => <option key={m}>{m}</option>)}
          </select>
          <button
            onClick={() => setAdvancedOpen(o => !o)}
            className={`ml-auto inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border transition
              ${advancedOpen || conditions.length > 0
                ? 'bg-brand-50 border-brand-300 text-brand-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            Advanced{conditions.length > 0 ? ` (${conditions.length})` : ''}
          </button>
          {hasFilters && (
            <button onClick={clearAll} className="text-sm text-gray-400 hover:text-gray-600 underline">Clear all</button>
          )}
        </div>

        {advancedOpen && (
          <div className="border-t border-gray-100 pt-3 space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Match</span>
              <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden text-sm font-medium">
                <button onClick={() => setConditionLogic('AND')}
                  className={`px-3 py-1 transition ${conditionLogic === 'AND' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>AND</button>
                <button onClick={() => setConditionLogic('OR')}
                  className={`px-3 py-1 border-l border-gray-200 transition ${conditionLogic === 'OR' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>OR</button>
              </div>
              <span className="text-xs text-gray-400">{conditionLogic === 'AND' ? 'all conditions must match' : 'any condition must match'}</span>
            </div>
            {conditions.length === 0 && <p className="text-sm text-gray-400 italic pb-1">No conditions yet — add one below.</p>}
            {conditions.map((cond, idx) => {
              const def = fieldDefs.find(f => f.key === cond.field);
              const ops = getOps(def?.type || 'text');
              return (
                <React.Fragment key={cond.id}>
                  {idx > 0 && (
                    <div className="flex items-center gap-2 py-0.5">
                      <div className="flex-1 border-t border-dashed border-gray-200" />
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${conditionLogic === 'AND' ? 'text-brand-700 bg-brand-50' : 'text-amber-700 bg-amber-50'}`}>{conditionLogic}</span>
                      <div className="flex-1 border-t border-dashed border-gray-200" />
                    </div>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <select value={cond.field}
                      onChange={ev => {
                        const nd = fieldDefs.find(f => f.key === ev.target.value);
                        const no = getOps(nd?.type || 'text');
                        updateCondition(cond.id, { field: ev.target.value, operator: no[0], value: '' });
                      }}
                      className="!w-auto text-sm !py-1.5">
                      {fieldDefs.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                    </select>
                    <select value={cond.operator}
                      onChange={ev => updateCondition(cond.id, { operator: ev.target.value, value: '' })}
                      className="!w-auto text-sm !py-1.5">
                      {ops.map(op => <option key={op}>{op}</option>)}
                    </select>
                    {needsValue(cond.operator) && (
                      def?.type === 'select' ? (
                        <select value={cond.value}
                          onChange={ev => updateCondition(cond.id, { value: ev.target.value })}
                          className="!w-auto text-sm !py-1.5">
                          <option value="">Select…</option>
                          {(def.opts || []).map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : def?.type === 'date' ? (
                        <input type="date" value={cond.value}
                          onChange={ev => updateCondition(cond.id, { value: ev.target.value })}
                          className="!w-auto text-sm !py-1.5" />
                      ) : (
                        <input type="text" value={cond.value}
                          onChange={ev => updateCondition(cond.id, { value: ev.target.value })}
                          className="!w-48 text-sm !py-1.5" placeholder="Enter value…" />
                      )
                    )}
                    <button onClick={() => removeCondition(cond.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition" title="Remove">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </React.Fragment>
              );
            })}
            <button onClick={addCondition}
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 mt-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add condition
            </button>
          </div>
        )}
      </div>

      {/* Bulk update toolbar */}
      {bulkOpen && (
        <div className="card border-amber-200 bg-amber-50/60 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 shrink-0">
              <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span className="text-sm font-semibold text-amber-800">Bulk Update</span>
            </div>
            <span className="text-sm text-amber-700">Set</span>
            <select value={bulkField} onChange={e => { setBulkField(e.target.value); setBulkValue(''); }}
              className="!w-auto text-sm !py-1.5 border-amber-200 bg-white">
              {Object.entries(bulkFieldDefs.reduce((acc, f) => { (acc[f.group] = acc[f.group] || []).push(f); return acc; }, {})).map(([group, fields]) => (
                <optgroup key={group} label={group}>
                  {fields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                </optgroup>
              ))}
            </select>
            <span className="text-sm text-amber-700">to</span>
            {(() => {
              const def = bulkFieldDefs.find(f => f.key === bulkField);
              if (!def) return null;
              if (def.type === 'select') return (
                <select value={bulkValue} onChange={e => setBulkValue(e.target.value)} className="!w-auto text-sm !py-1.5 border-amber-200 bg-white">
                  <option value="">— Select value —</option>
                  {(def.opts || []).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              );
              if (def.type === 'date') return (
                <input type="date" value={bulkValue} onChange={e => setBulkValue(e.target.value)} className="!w-auto text-sm !py-1.5 border-amber-200 bg-white" />
              );
              return (
                <input type="text" value={bulkValue} onChange={e => setBulkValue(e.target.value)} placeholder="Enter value…" className="!w-48 text-sm !py-1.5 border-amber-200 bg-white" />
              );
            })()}
            <span className="text-sm text-amber-700">
              for <strong className="text-amber-900">{displayed.length}</strong> escalation{displayed.length !== 1 ? 's' : ''}
            </span>
            <button onClick={() => setBulkConfirm(true)} disabled={!bulkValue || displayed.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-sm font-medium rounded-lg transition ml-1">
              Apply →
            </button>
            <button onClick={() => { setBulkOpen(false); setBulkValue(''); }}
              className="text-sm text-amber-600 hover:text-amber-800 transition ml-auto">
              Cancel
            </button>
          </div>
        </div>
      )}

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
                {paginated.map(e => {
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
                                    {(dropdownConfig.escalation_status?.length ? dropdownConfig.escalation_status.map(o => o.value) : ['Open','In Progress','Partly Resolved','Resolved']).map(s => <option key={s}>{s}</option>)}
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
                                    {(dropdownConfig.ownership || []).map(o => <option key={o.id} value={o.value}>{o.value}</option>)}
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
                                    {(dropdownConfig.ps_leader || []).map(o => <option key={o.id} value={o.value}>{o.value}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Escalated By</p>
                                  <select value={editForm.escalated_by || ''} onChange={ev => setEditForm(f => ({ ...f, escalated_by: ev.target.value }))} className="!py-1.5 text-sm">
                                    <option value="">—</option>
                                    {(dropdownConfig.escalated_by || []).map(o => <option key={o.id} value={o.value}>{o.value}</option>)}
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
          <Pagination page={page} perPage={perPage} total={displayed.length} onPage={setPage} onPerPage={setPerPage} />
        </div>

        {/* Mobile / tablet cards */}
        <div className="lg:hidden space-y-3">
          {paginated.map(e => {
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
                            {(dropdownConfig.escalation_status?.length ? dropdownConfig.escalation_status.map(o => o.value) : ['Open','In Progress','Partly Resolved','Resolved']).map(s => <option key={s}>{s}</option>)}
                          </select>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Ownership</p>
                          <select value={editForm.ownership || ''} onChange={ev => setEditForm(f => ({ ...f, ownership: ev.target.value }))} className="text-sm">
                            <option value="">—</option>
                            {(dropdownConfig.ownership || []).map(o => <option key={o.id} value={o.value}>{o.value}</option>)}
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
                            {(dropdownConfig.ps_leader || []).map(o => <option key={o.id} value={o.value}>{o.value}</option>)}
                          </select>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Escalated By</p>
                          <select value={editForm.escalated_by || ''} onChange={ev => setEditForm(f => ({ ...f, escalated_by: ev.target.value }))} className="text-sm">
                            <option value="">—</option>
                            {(dropdownConfig.escalated_by || []).map(o => <option key={o.id} value={o.value}>{o.value}</option>)}
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
          <Pagination page={page} perPage={perPage} total={displayed.length} onPage={setPage} onPerPage={setPerPage} />
        </div>
        </>
      )}

      {bulkConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Confirm Bulk Update</h3>
              <p className="text-sm text-gray-500 mt-0.5">This will overwrite existing values and cannot be undone.</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
              Set <strong>{bulkFieldDefs.find(f => f.key === bulkField)?.label}</strong> to{' '}
              <strong>"{bulkValue}"</strong> for{' '}
              <strong>{displayed.length} escalation{displayed.length !== 1 ? 's' : ''}</strong>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setBulkConfirm(false)} disabled={bulkSaving}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition">
                Cancel
              </button>
              <button onClick={handleBulkApply} disabled={bulkSaving}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition disabled:opacity-60">
                {bulkSaving ? 'Updating…' : `Update ${displayed.length} escalation${displayed.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
