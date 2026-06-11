import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Pagination from './Pagination';
import MultiSelectDropdown from './MultiSelectDropdown';

const PRIORITY_BADGE = {
  P0: 'bg-red-100 text-red-800 border border-red-200',
  P1: 'bg-orange-100 text-orange-800 border border-orange-200',
  P2: 'bg-amber-100 text-amber-800 border border-amber-200',
  P3: 'bg-blue-100 text-blue-800 border border-blue-200',
};

const STATUS_STYLES = {
  'Open':        'bg-red-100 text-red-800',
  'In Progress': 'bg-amber-100 text-amber-800',
  'Deferred':    'bg-blue-100 text-blue-800',
  'Resolved':    'bg-green-100 text-green-800',
  'Closed':      'bg-gray-100 text-gray-700',
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const OPS_TEXT   = ['contains','does not contain','is','is not','is empty','is not empty'];
const OPS_SELECT = ['is','is not','is one of','is empty','is not empty'];
const OPS_DATE   = ['is','before','after','is empty','is not empty'];
function getOps(type) {
  if (type === 'select') return OPS_SELECT;
  if (type === 'date')   return OPS_DATE;
  return OPS_TEXT;
}
function needsValue(op) { return !['is empty','is not empty'].includes(op); }

function matchesCondition(item, cond, fieldDefs) {
  const { field, operator, value } = cond;
  const def = fieldDefs.find(f => f.key === field);
  if (!def) return true;
  const raw = item[field];
  if (operator === 'is empty')     return raw === null || raw === undefined || raw === '';
  if (operator === 'is not empty') return raw !== null && raw !== undefined && raw !== '';
  if (operator === 'is one of') {
    const vals = Array.isArray(value) ? value : [];
    if (vals.length === 0) return true;
    return vals.some(v => String(raw ?? '').toLowerCase() === v.toLowerCase());
  }
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
  account_id: null, account_name: '', tenant_id: '', csm_lead: '', csm: '',
  description: '', priority: 'P1', owner_team: '', support_ticket: '', dev_ticket: '',
  issue_type: '', issue_sub_type: '', reported_date: '', closure_date: '',
  status: 'Open', next_steps: '',
};

function PriorityBadge({ priority }) {
  if (!priority) return <span className="text-gray-300">—</span>;
  return (
    <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full ${PRIORITY_BADGE[priority] || 'bg-gray-100 text-gray-700 border border-gray-200'}`}>
      {priority}
    </span>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-700'}`}>
      {status || 'Open'}
    </span>
  );
}

export default function IssuesDashboard() {
  const { user } = useAuth();
  const [issues,       setIssues]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [accounts,     setAccounts]     = useState([]);
  const [csms,         setCsms]         = useState([]);
  const [dropdownConfig, setDropdownConfig] = useState({});
  const [reload,       setReload]       = useState(0);
  const [expanded,     setExpanded]     = useState(null);
  const [showForm,     setShowForm]     = useState(false);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [saving,       setSaving]       = useState(false);
  const [editing,      setEditing]      = useState(null);
  const [editForm,     setEditForm]     = useState({});
  const [editSaving,   setEditSaving]   = useState(false);

  const [filters,      setFilters]      = useState({ status: [], priority: '', issue_type: '', owner_team: '', csm: [], month: '', account_name: '' });
  const [search,       setSearch]       = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [conditions,   setConditions]   = useState([]);
  const [conditionLogic, setConditionLogic] = useState('AND');
  const [page,         setPage]         = useState(1);
  const [perPage,      setPerPage]      = useState(100);
  const [bulkOpen,     setBulkOpen]     = useState(false);
  const [bulkField,    setBulkField]    = useState('status');
  const [bulkValue,    setBulkValue]    = useState('');
  const [bulkConfirm,  setBulkConfirm]  = useState(false);
  const [bulkSaving,   setBulkSaving]   = useState(false);

  useEffect(() => {
    axios.get('/api/accounts').then(r => {
      setAccounts((r.data || []).sort((a, b) => a.account_name.localeCompare(b.account_name)));
    }).catch(() => {});
    axios.get('/api/accounts/filters').then(r => setCsms(r.data.csms || [])).catch(() => {});
    axios.get('/api/dropdown-config').then(r => setDropdownConfig(r.data || {})).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    axios.get('/api/issues')
      .then(r => setIssues(r.data || []))
      .catch(() => setIssues([]))
      .finally(() => setLoading(false));
  }, [reload]);

  useEffect(() => { load(); }, [load]);

  const setFilter = (key, val) => { setFilters(f => ({ ...f, [key]: val })); setPage(1); };
  useEffect(() => { setPage(1); }, [search]);

  const handleAccountSelect = (accountId, setter) => {
    const acct = accounts.find(a => String(a.id) === String(accountId));
    if (acct) setter(f => ({ ...f, account_id: acct.id, account_name: acct.account_name, tenant_id: acct.tenant_id || '', csm: acct.csm || f.csm }));
    else setter(f => ({ ...f, account_id: null, account_name: '', tenant_id: '' }));
  };

  const handleSave = async () => {
    if (!form.description) { alert('Description is required'); return; }
    setSaving(true);
    try {
      await axios.post('/api/issues', {
        ...form,
        support_ticket: form.support_ticket ? parseInt(form.support_ticket) : null,
        dev_ticket: form.dev_ticket ? parseInt(form.dev_ticket) : null,
      });
      setShowForm(false);
      setForm(EMPTY_FORM);
      setReload(r => r + 1);
    } catch (e) {
      alert('Failed to save: ' + (e.response?.data?.error || e.message));
    } finally { setSaving(false); }
  };

  const startEdit = (issue) => {
    setEditing(issue.id);
    setExpanded(null);
    setEditForm({
      account_id: issue.account_id || '',
      account_name: issue.account_name || '',
      tenant_id: issue.tenant_id || '',
      csm_lead: issue.csm_lead || '',
      csm: issue.csm || '',
      description: issue.description || '',
      priority: issue.priority || 'P1',
      owner_team: issue.owner_team || '',
      support_ticket: issue.support_ticket ?? '',
      dev_ticket: issue.dev_ticket ?? '',
      issue_type: issue.issue_type || '',
      issue_sub_type: issue.issue_sub_type || '',
      reported_date: issue.reported_date || '',
      closure_date: issue.closure_date || '',
      status: issue.status || 'Open',
      next_steps: issue.next_steps || '',
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this issue? This cannot be undone.')) return;
    try {
      await axios.delete(`/api/issues?id=${id}`);
      if (editing === id) setEditing(null);
      setReload(r => r + 1);
    } catch (e) { alert('Failed to delete: ' + (e.response?.data?.error || e.message)); }
  };

  const handleEditSave = async () => {
    if (!editForm.description) { alert('Description is required'); return; }
    setEditSaving(true);
    try {
      await axios.put(`/api/issues?id=${editing}`, {
        ...editForm,
        support_ticket: editForm.support_ticket !== '' ? parseInt(editForm.support_ticket) : null,
        dev_ticket: editForm.dev_ticket !== '' ? parseInt(editForm.dev_ticket) : null,
      });
      setEditing(null);
      setReload(r => r + 1);
    } catch (e) {
      alert('Failed to save: ' + (e.response?.data?.error || e.message));
    } finally { setEditSaving(false); }
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
      await axios.patch('/api/issues', { ids: displayed.map(i => i.id), field: bulkField, value: bulkValue });
      setBulkConfirm(false);
      setBulkOpen(false);
      setBulkValue('');
      clearAll();
      setReload(r => r + 1);
    } catch (e) {
      alert(e.response?.data?.error || 'Bulk update failed');
    } finally { setBulkSaving(false); }
  };

  // ── Computed ────────────────────────────────────────────────────────────────
  const allCsms       = [...new Set(issues.map(i => i.csm).filter(Boolean))].sort();
  const allOwnerTeams = [...new Set(issues.map(i => i.owner_team).filter(Boolean))].sort();
  const allMonths     = [...new Set(
    issues.map(i => i.reported_date ? MONTHS[new Date(i.reported_date + 'T00:00:00').getMonth()] : null).filter(Boolean)
  )].sort((a, b) => MONTHS.indexOf(a) - MONTHS.indexOf(b));

  const dd = (key, fb = []) => (dropdownConfig[key]?.length ? dropdownConfig[key].map(o => o.value) : fb);

  const fieldDefs = [
    { key: 'account_name',   label: 'Account Name',   type: 'text' },
    { key: 'description',    label: 'Description',    type: 'text' },
    { key: 'next_steps',     label: 'Next Steps',     type: 'text' },
    { key: 'status',         label: 'Status',         type: 'select', opts: ['Open','In Progress','Deferred','Resolved','Closed'] },
    { key: 'priority',       label: 'Priority',       type: 'select', opts: ['P0','P1','P2','P3'] },
    { key: 'csm',            label: 'CSM',            type: 'select', opts: allCsms },
    { key: 'owner_team',     label: 'Owner Team',     type: 'select', opts: allOwnerTeams },
    { key: 'issue_type',     label: 'Issue Type',     type: 'select', opts: dd('issue_type', ['Configuration Failures','PS','Reports & Dashboards','Integration Failures','Platform Issue','Misc','Support']) },
    { key: 'issue_sub_type', label: 'Issue Sub-Type', type: 'text' },
    { key: 'reported_date',  label: 'Reported Date',  type: 'date' },
    { key: 'closure_date',   label: 'Closure Date',   type: 'text' },
    { key: 'support_ticket', label: 'Support Ticket', type: 'number' },
    { key: 'dev_ticket',     label: 'Dev Ticket',     type: 'number' },
  ];

  const bulkFieldDefs = [
    { key: 'account_id',     label: 'Account',        type: 'account', group: 'Account' },
    { key: 'status',         label: 'Status',         type: 'select', group: 'Status & Priority', opts: ['Open','In Progress','Deferred','Resolved','Closed'] },
    { key: 'priority',       label: 'Priority',       type: 'select', group: 'Status & Priority', opts: ['P0','P1','P2','P3'] },
    { key: 'owner_team',     label: 'Owner Team',     type: 'text',   group: 'Assignment' },
    { key: 'csm',            label: 'CSM',            type: 'select', group: 'Assignment', opts: allCsms.length ? allCsms : csms },
    { key: 'csm_lead',       label: 'CSM Lead',       type: 'text',   group: 'Assignment' },
    { key: 'issue_type',     label: 'Issue Type',     type: 'select', group: 'Classification', opts: dd('issue_type', ['Configuration Failures','PS','Reports & Dashboards','Integration Failures','Platform Issue','Misc','Support']) },
    { key: 'issue_sub_type', label: 'Issue Sub-Type', type: 'text',   group: 'Classification' },
    { key: 'next_steps',     label: 'Next Steps',     type: 'text',   group: 'Notes' },
    { key: 'closure_date',   label: 'Closure Date',   type: 'text',   group: 'Notes' },
  ];

  const clearAll = () => {
    setSearch('');
    setFilters({ status: [], priority: '', issue_type: '', owner_team: '', csm: [], month: '', account_name: '' });
    setConditions([]);
    setPage(1);
  };
  const hasFilters = !!(search || filters.status.length || filters.priority || filters.issue_type || filters.owner_team || filters.csm.length || filters.month || filters.account_name || conditions.length > 0);
  const activeConditions = conditions.filter(c => c.field && c.operator);

  const displayed = issues.filter(issue => {
    if (search) {
      const q = search.toLowerCase();
      const blob = [issue.account_name, issue.description, issue.csm, issue.owner_team, issue.issue_type, issue.next_steps]
        .filter(Boolean).join(' ').toLowerCase();
      if (!blob.includes(q)) return false;
    }
    if (filters.account_name && issue.account_name !== filters.account_name) return false;
    if (filters.status.length > 0 && !filters.status.includes(issue.status)) return false;
    if (filters.priority   && issue.priority   !== filters.priority)   return false;
    if (filters.issue_type && issue.issue_type !== filters.issue_type) return false;
    if (filters.owner_team && issue.owner_team !== filters.owner_team) return false;
    if (filters.csm.length > 0 && !filters.csm.includes(issue.csm))   return false;
    if (filters.month && issue.reported_date) {
      const m = MONTHS[new Date(issue.reported_date + 'T00:00:00').getMonth()];
      if (m !== filters.month) return false;
    } else if (filters.month && !issue.reported_date) return false;
    if (activeConditions.length === 0) return true;
    const results = activeConditions.map(c => matchesCondition(issue, c, fieldDefs));
    return conditionLogic === 'OR' ? results.some(Boolean) : results.every(Boolean);
  });

  const paginated = displayed.slice((page - 1) * perPage, page * perPage);

  const stats = {
    total:      displayed.length,
    p0:         displayed.filter(i => i.priority === 'P0').length,
    open:       displayed.filter(i => i.status === 'Open').length,
    inProgress: displayed.filter(i => i.status === 'In Progress').length,
    resolved:   displayed.filter(i => i.status === 'Resolved' || i.status === 'Closed').length,
  };

  const inp = (field, placeholder, type = 'text', formState = form, setter = setForm) => (
    <input type={type} value={formState[field] || ''} placeholder={placeholder}
      onChange={e => setter(f => ({ ...f, [field]: e.target.value }))}
      className="!py-1.5 text-sm" />
  );

  // ── Form fields shared between add + edit ────────────────────────────────────
  const IssueFormFields = ({ f, set, isEdit }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {!isEdit && (
        <div className="sm:col-span-2 lg:col-span-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Account</p>
          <select value={f.account_id || ''} onChange={e => handleAccountSelect(e.target.value, set)} className="!py-1.5 text-sm">
            <option value="">Select account…</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
          </select>
        </div>
      )}
      {isEdit && (
        <>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Account</p>
            <select value={f.account_id || ''} onChange={e => handleAccountSelect(e.target.value, set)} className="!py-1.5 text-sm">
              <option value="">Select account…</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
            </select>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Account Name <span className="text-gray-300 font-normal normal-case">(read-only)</span></p>
            <input type="text" value={f.account_name || ''} readOnly className="!py-1.5 text-sm bg-gray-100 cursor-not-allowed" />
          </div>
        </>
      )}
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Reported Date</p>
        <input type="date" value={f.reported_date || ''} onChange={e => set(p => ({ ...p, reported_date: e.target.value }))} className="!py-1.5 text-sm" />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Priority</p>
        <select value={f.priority || 'P1'} onChange={e => set(p => ({ ...p, priority: e.target.value }))} className="!py-1.5 text-sm">
          <option value="">—</option>
          {['P0','P1','P2','P3'].map(p => <option key={p}>{p}</option>)}
        </select>
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Status</p>
        <select value={f.status || 'Open'} onChange={e => set(p => ({ ...p, status: e.target.value }))} className="!py-1.5 text-sm">
          {['Open','In Progress','Deferred','Resolved','Closed'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Description *</p>
        <textarea rows={3} value={f.description || ''}
          onChange={e => set(p => ({ ...p, description: e.target.value }))}
          placeholder="Describe the issue…" className="text-sm" />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Issue Type</p>
        <select value={f.issue_type || ''} onChange={e => set(p => ({ ...p, issue_type: e.target.value, issue_sub_type: '' }))} className="!py-1.5 text-sm">
          <option value="">—</option>
          {(dropdownConfig.issue_type || []).map(o => <option key={o.id} value={o.value}>{o.value}</option>)}
        </select>
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Issue Sub-Type</p>
        <select value={f.issue_sub_type || ''} onChange={e => set(p => ({ ...p, issue_sub_type: e.target.value }))} className="!py-1.5 text-sm" disabled={!f.issue_type}>
          <option value="">{f.issue_type ? '—' : 'Select Issue Type first'}</option>
          {(dropdownConfig.issue_sub_type || []).filter(o => o.parent_value === f.issue_type).map(o => <option key={o.id} value={o.value}>{o.value}</option>)}
        </select>
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Owner Team</p>
        <input type="text" value={f.owner_team || ''} onChange={e => set(p => ({ ...p, owner_team: e.target.value }))} placeholder="Engineering, PS, Product…" className="!py-1.5 text-sm" />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Support Ticket #</p>
        <input type="number" value={f.support_ticket || ''} onChange={e => set(p => ({ ...p, support_ticket: e.target.value }))} className="!py-1.5 text-sm" />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Dev Ticket #</p>
        <input type="number" value={f.dev_ticket || ''} onChange={e => set(p => ({ ...p, dev_ticket: e.target.value }))} className="!py-1.5 text-sm" />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Closure Date</p>
        <input type="text" value={f.closure_date || ''} onChange={e => set(p => ({ ...p, closure_date: e.target.value }))} placeholder="e.g. 2026-04-30" className="!py-1.5 text-sm" />
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Next Steps</p>
        <textarea rows={2} value={f.next_steps || ''}
          onChange={e => set(p => ({ ...p, next_steps: e.target.value }))}
          placeholder="What happens next…" className="text-sm" />
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Issues</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {displayed.length !== issues.length
              ? `${displayed.length} of ${issues.length} issues`
              : `${issues.length} issue${issues.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
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
            Add Issue
          </button>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card border-brand-200 bg-brand-50/30 space-y-4">
          <p className="text-sm font-semibold text-gray-800">New Issue</p>
          <IssueFormFields f={form} set={setForm} isEdit={false} />
          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={saving || !form.description}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-60">
              {saving ? 'Saving…' : 'Save Issue'}
            </button>
            <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition">Cancel</button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total',       value: stats.total,      color: 'bg-gray-50 border-gray-200',     text: 'text-gray-900' },
          { label: 'P0 Critical', value: stats.p0,         color: 'bg-red-50 border-red-200',       text: 'text-red-700' },
          { label: 'Open',        value: stats.open,       color: 'bg-orange-50 border-orange-200', text: 'text-orange-700' },
          { label: 'In Progress', value: stats.inProgress, color: 'bg-amber-50 border-amber-200',   text: 'text-amber-700' },
          { label: 'Resolved',    value: stats.resolved,   color: 'bg-green-50 border-green-200',   text: 'text-green-700' },
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
            placeholder="Search account, description, owner, issue type…"
            className="pl-11 pr-10 !py-2.5 text-base w-full" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={filters.account_name} onChange={e => setFilter('account_name', e.target.value)} className="!w-auto text-sm !py-1.5">
            <option value="">All Accounts</option>
            {[...new Set(issues.map(i => i.account_name).filter(Boolean))].sort().map(a => <option key={a}>{a}</option>)}
          </select>
          <MultiSelectDropdown
            placeholder="All Statuses"
            options={['Open','In Progress','Deferred','Resolved','Closed']}
            value={filters.status}
            onChange={v => setFilter('status', v)}
          />
          <select value={filters.priority} onChange={e => setFilter('priority', e.target.value)} className="!w-auto text-sm !py-1.5">
            <option value="">All Priorities</option>
            {['P0','P1','P2','P3'].map(p => <option key={p}>{p}</option>)}
          </select>
          <select value={filters.issue_type} onChange={e => setFilter('issue_type', e.target.value)} className="!w-auto text-sm !py-1.5">
            <option value="">All Issue Types</option>
            {[...new Set(issues.map(i => i.issue_type).filter(Boolean))].sort().map(t => <option key={t}>{t}</option>)}
          </select>
          <select value={filters.owner_team} onChange={e => setFilter('owner_team', e.target.value)} className="!w-auto text-sm !py-1.5">
            <option value="">All Owners</option>
            {allOwnerTeams.map(o => <option key={o}>{o}</option>)}
          </select>
          {user?.role === 'admin' && (
            <MultiSelectDropdown
              placeholder="All CSMs"
              options={allCsms}
              value={filters.csm}
              onChange={v => setFilter('csm', v)}
            />
          )}
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
          {hasFilters && <button onClick={clearAll} className="text-sm text-gray-400 hover:text-gray-600 underline">Clear all</button>}
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
                    <select value={cond.field} onChange={ev => {
                      const nd = fieldDefs.find(f => f.key === ev.target.value);
                      updateCondition(cond.id, { field: ev.target.value, operator: getOps(nd?.type || 'text')[0], value: '' });
                    }} className="!w-auto text-sm !py-1.5">
                      {fieldDefs.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                    </select>
                    <select value={cond.operator} onChange={ev => updateCondition(cond.id, { operator: ev.target.value, value: ev.target.value === 'is one of' ? [] : '' })} className="!w-auto text-sm !py-1.5">
                      {ops.map(op => <option key={op}>{op}</option>)}
                    </select>
                    {needsValue(cond.operator) && (
                      def?.type === 'select' ? (
                        cond.operator === 'is one of' ? (
                          <MultiSelectDropdown
                            placeholder="Select values…"
                            options={def.opts || []}
                            value={Array.isArray(cond.value) ? cond.value : []}
                            onChange={v => updateCondition(cond.id, { value: v })}
                          />
                        ) : (
                          <select value={cond.value} onChange={ev => updateCondition(cond.id, { value: ev.target.value })} className="!w-auto text-sm !py-1.5">
                            <option value="">Select…</option>
                            {(def.opts || []).map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        )
                      ) : def?.type === 'date' ? (
                        <input type="date" value={cond.value} onChange={ev => updateCondition(cond.id, { value: ev.target.value })} className="!w-auto text-sm !py-1.5" />
                      ) : def?.type === 'number' ? (
                        <input type="number" value={cond.value} onChange={ev => updateCondition(cond.id, { value: ev.target.value })} className="!w-36 text-sm !py-1.5" placeholder="Number…" />
                      ) : (
                        <input type="text" value={cond.value} onChange={ev => updateCondition(cond.id, { value: ev.target.value })} className="!w-48 text-sm !py-1.5" placeholder="Enter value…" />
                      )
                    )}
                    <button onClick={() => removeCondition(cond.id)} className="p-1 text-gray-400 hover:text-red-500 transition" title="Remove">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </React.Fragment>
              );
            })}
            <button onClick={addCondition} className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 mt-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add condition
            </button>
          </div>
        )}
      </div>

      {/* Bulk toolbar */}
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
            <select value={bulkField} onChange={e => { setBulkField(e.target.value); setBulkValue(''); }} className="!w-auto text-sm !py-1.5 border-amber-200 bg-white">
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
              if (def.type === 'account') return (
                <select value={bulkValue} onChange={e => setBulkValue(e.target.value)} className="!w-auto text-sm !py-1.5 border-amber-200 bg-white">
                  <option value="">— Select account —</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
                </select>
              );
              if (def.type === 'select') return (
                <select value={bulkValue} onChange={e => setBulkValue(e.target.value)} className="!w-auto text-sm !py-1.5 border-amber-200 bg-white">
                  <option value="">— Select value —</option>
                  {(def.opts || []).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              );
              return <input type="text" value={bulkValue} onChange={e => setBulkValue(e.target.value)} placeholder="Enter value…" className="!w-48 text-sm !py-1.5 border-amber-200 bg-white" />;
            })()}
            <span className="text-sm text-amber-700">for <strong className="text-amber-900">{displayed.length}</strong> issue{displayed.length !== 1 ? 's' : ''}</span>
            <button onClick={() => setBulkConfirm(true)} disabled={!bulkValue || displayed.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-sm font-medium rounded-lg transition ml-1">
              Apply →
            </button>
            <button onClick={() => { setBulkOpen(false); setBulkValue(''); }} className="text-sm text-amber-600 hover:text-amber-800 transition ml-auto">Cancel</button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">No issues found.</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="card overflow-hidden p-0 hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Account</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Priority</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Issue Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Owner</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Reported</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">CSM</th>
                    <th className="px-3 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map(issue => {
                    const isEditing = editing === issue.id;
                    return (
                      <React.Fragment key={issue.id}>
                        <tr
                          className={`transition ${isEditing ? 'bg-amber-50/40' : 'hover:bg-gray-50 cursor-pointer'}`}
                          onClick={() => { if (!isEditing) setExpanded(expanded === issue.id ? null : issue.id); }}
                        >
                          <td className="px-4 py-3">
                            {issue.account_id ? (
                              <Link to={`/accounts/${issue.account_id}`} className="font-medium text-brand-700 hover:underline" onClick={ev => ev.stopPropagation()}>
                                {issue.account_name}
                              </Link>
                            ) : (
                              <span className="font-medium text-gray-900">{issue.account_name || '—'}</span>
                            )}
                            {issue.tenant_id && <div className="text-xs text-gray-400 font-mono truncate max-w-[140px]">{issue.tenant_id}</div>}
                          </td>
                          <td className="px-4 py-3"><PriorityBadge priority={issue.priority} /></td>
                          <td className="px-4 py-3 max-w-xs">
                            <p className="text-gray-700 line-clamp-2 text-xs">{issue.description}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs text-gray-700">{issue.issue_type || '—'}</div>
                            {issue.issue_sub_type && <div className="text-xs text-gray-400">{issue.issue_sub_type}</div>}
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{issue.owner_team || '—'}</td>
                          <td className="px-4 py-3"><StatusBadge status={issue.status} /></td>
                          <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                            {issue.reported_date ? new Date(issue.reported_date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{issue.csm || '—'}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={ev => { ev.stopPropagation(); isEditing ? setEditing(null) : startEdit(issue); }}
                                className={`p-1.5 rounded-md transition ${isEditing ? 'text-amber-600 bg-amber-100 hover:bg-amber-200' : 'text-gray-400 hover:text-brand-600 hover:bg-gray-100'}`}
                                title={isEditing ? 'Cancel edit' : 'Edit issue'}
                              >
                                {isEditing
                                  ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                  : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
                              </button>
                              {user?.role === 'admin' && !isEditing && (
                                <button onClick={ev => { ev.stopPropagation(); handleDelete(issue.id); }}
                                  className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition" title="Delete">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {expanded === issue.id && !isEditing && (
                          <tr className="bg-blue-50">
                            <td colSpan={9} className="px-4 py-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Description</p>
                                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{issue.description}</p>
                                </div>
                                {issue.next_steps && (
                                  <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Next Steps</p>
                                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{issue.next_steps}</p>
                                  </div>
                                )}
                                <div className="sm:col-span-2 flex flex-wrap gap-4 text-xs text-gray-500">
                                  {issue.support_ticket && <span><span className="font-medium">Support Ticket:</span> #{issue.support_ticket}</span>}
                                  {issue.dev_ticket && <span><span className="font-medium">Dev Ticket:</span> #{issue.dev_ticket}</span>}
                                  {issue.closure_date && <span><span className="font-medium">Closure Date:</span> {issue.closure_date}</span>}
                                  {issue.csm_lead && <span><span className="font-medium">CSM Lead:</span> {issue.csm_lead}</span>}
                                  {issue.account_id && (
                                    <Link to={`/accounts/${issue.account_id}`} className="text-brand-600 hover:underline font-medium" onClick={ev => ev.stopPropagation()}>
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
                            <td colSpan={9} className="px-4 py-4">
                              <div className="space-y-4">
                                <p className="text-sm font-semibold text-gray-800">Edit Issue</p>
                                <IssueFormFields f={editForm} set={setEditForm} isEdit={true} />
                                <div className="flex gap-2 pt-1">
                                  <button onClick={handleEditSave} disabled={editSaving || !editForm.description}
                                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-60">
                                    {editSaving ? 'Saving…' : 'Save Changes'}
                                  </button>
                                  <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition">Cancel</button>
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

          <Pagination page={page} perPage={perPage} total={displayed.length} onPage={setPage} onPerPage={setPerPage} />

          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {paginated.map(issue => {
              const open = expanded === issue.id;
              const isEditing = editing === issue.id;
              return (
                <div key={issue.id} className="card p-0 overflow-hidden">
                  <div className="flex items-stretch">
                    <button type="button" onClick={() => { if (!isEditing) setExpanded(open ? null : issue.id); }}
                      className="flex-1 text-left p-4 active:bg-gray-50 transition min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          {issue.account_id
                            ? <Link to={`/accounts/${issue.account_id}`} onClick={ev => ev.stopPropagation()} className="font-semibold text-brand-700 hover:underline break-words">{issue.account_name}</Link>
                            : <span className="font-semibold text-gray-900 break-words">{issue.account_name || '—'}</span>}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <StatusBadge status={issue.status} />
                          <PriorityBadge priority={issue.priority} />
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-gray-700 line-clamp-2">{issue.description}</p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                        {issue.issue_type && <span>{issue.issue_type}</span>}
                        {issue.owner_team && <span><span className="text-gray-400">Owner:</span> {issue.owner_team}</span>}
                        {issue.reported_date && <span>{new Date(issue.reported_date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
                      </div>
                    </button>
                    <div className="flex flex-col border-l border-gray-100 shrink-0">
                      <button onClick={() => { isEditing ? setEditing(null) : startEdit(issue); }}
                        className={`flex-1 px-3 transition ${isEditing ? 'bg-amber-100 text-amber-600' : 'text-gray-400 hover:text-brand-600 hover:bg-gray-50'}`}
                        title={isEditing ? 'Cancel' : 'Edit'}>
                        {isEditing
                          ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
                      </button>
                      {user?.role === 'admin' && !isEditing && (
                        <button onClick={() => handleDelete(issue.id)}
                          className="flex-1 px-3 border-t border-gray-100 text-gray-400 hover:text-red-600 hover:bg-red-50 transition" title="Delete">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                  {open && !isEditing && (
                    <div className="px-4 pb-4 pt-1 bg-gray-50 border-t border-gray-100 space-y-2">
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{issue.description}</p>
                      {issue.next_steps && <div><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Next Steps</p><p className="text-sm text-gray-700">{issue.next_steps}</p></div>}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                        {issue.support_ticket && <span><span className="font-medium">ST:</span> #{issue.support_ticket}</span>}
                        {issue.dev_ticket && <span><span className="font-medium">DT:</span> #{issue.dev_ticket}</span>}
                        {issue.closure_date && <span><span className="font-medium">Closure:</span> {issue.closure_date}</span>}
                        {issue.account_id && <Link to={`/accounts/${issue.account_id}`} className="text-brand-600 hover:underline font-medium">View Account →</Link>}
                      </div>
                    </div>
                  )}
                  {isEditing && (
                    <div className="px-4 pb-4 pt-3 bg-amber-50 border-t border-amber-100 space-y-4">
                      <p className="text-sm font-semibold text-gray-800">Edit Issue</p>
                      <IssueFormFields f={editForm} set={setEditForm} isEdit={true} />
                      <div className="flex gap-2">
                        <button onClick={handleEditSave} disabled={editSaving || !editForm.description}
                          className="flex-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-60">
                          {editSaving ? 'Saving…' : 'Save Changes'}
                        </button>
                        <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg transition">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Bulk confirm modal */}
      {bulkConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Confirm Bulk Update</h3>
              <p className="text-sm text-gray-500 mt-0.5">This will overwrite existing values and cannot be undone.</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
              Set <strong>{bulkFieldDefs.find(f => f.key === bulkField)?.label}</strong> to{' '}
              <strong>"{bulkField === 'account_id' ? (accounts.find(a => String(a.id) === String(bulkValue))?.account_name || bulkValue) : bulkValue}"</strong> for{' '}
              <strong>{displayed.length} issue{displayed.length !== 1 ? 's' : ''}</strong>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setBulkConfirm(false)} disabled={bulkSaving} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition">Cancel</button>
              <button onClick={handleBulkApply} disabled={bulkSaving}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition disabled:opacity-60">
                {bulkSaving ? 'Updating…' : `Update ${displayed.length} issue${displayed.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
