import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Pagination from './Pagination';
import ColumnToggle from './ColumnToggle';
import SelectDropdown from './SelectDropdown';
import MultiSelectDropdown from './MultiSelectDropdown';
import { useColumnPrefs } from '../hooks/useColumnPrefs';
import { TASK_FIELDS } from '../fieldCatalog';
import { useFieldLabels } from '../context/FieldLabelsContext';
import { usePermissions } from '../context/PermissionsContext';
import { useFeatures } from '../hooks/useFeatures';
import { useWatchlist } from '../hooks/useWatchlist';

// Every task field can be shown as a column; these start visible.
const TASKS_DEFAULT_ON = ['task_subject', 'nature_of_task', 'account_name', 'assigned_to', 'due_date', 'derived_status'];
const TASKS_COLS = TASK_FIELDS.map(f => ({
  ...f,
  alwaysVisible: f.key === 'task_subject',
  adminOnly: f.key === 'assigned_to' || f.key === 'assigned_by',
  off: !TASKS_DEFAULT_ON.includes(f.key),
}));

const STATUS_STYLES = {
  Open:      'bg-blue-100 text-blue-800',
  Overdue:   'bg-red-100 text-red-800',
  Completed: 'bg-green-100 text-green-800',
};

function deriveStatus(task) {
  if (task.derived_status) return task.derived_status;
  if (task.status === 'Completed') return 'Completed';
  if (task.due_date && new Date(task.due_date) < new Date()) return 'Overdue';
  return 'Open';
}

function fmtDT(s) {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  } catch { return s; }
}

function fmtDate(s) {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return s; }
}

function toLocalDT(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const EMPTY_FORM = {
  task_subject: '', task_description: '', nature_of_task: '',
  due_date: '', account_id: '', account_name: '', assigned_to_id: '', assigned_to: '',
};

export default function TasksPage() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const isAdmin   = user?.role === 'admin';
  const { can } = usePermissions();
  const { isEnabled } = useFeatures();
  const { isWatched, toggle: watchToggle } = useWatchlist();
  const { label: fieldLabel } = useFieldLabels();
  const visibleTaskCols = TASKS_COLS.filter(c => !c.adminOnly || isAdmin);
  const { show: showCol, toggle: toggleCol, prefs: colPrefs } = useColumnPrefs(
    user?.email, 'tasks', Object.fromEntries(visibleTaskCols.map(c => [c.key, !c.off]))
  );
  const dataCols = visibleTaskCols.filter(c => c.key !== 'task_subject' && showCol(c.key));
  const colCount = dataCols.length + 1 + (isAdmin ? 2 : 1); // +subject, +checkbox for admin, +actions

  const [tasks,     setTasks]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [reload,    setReload]    = useState(0);
  const [expanded,  setExpanded]  = useState(null);

  // Filters
  const [statusFilter,  setStatusFilter]  = useState('Open');   // all | Open | Overdue | Completed
  const [natureFilter,  setNatureFilter]  = useState('');
  const [assigneeFilter,setAssigneeFilter]= useState('');
  const [search,        setSearch]        = useState('');
  const [accountFilter, setAccountFilter] = useState([]);
  const [page,          setPage]          = useState(1);
  const [perPage,       setPerPage]       = useState(25);

  // Bulk
  const [selected, setSelected] = useState(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);

  // Add/Edit form
  const [showForm,  setShowForm]  = useState(false);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState(null);
  const [editingId, setEditingId] = useState(null);

  // Feature-request approval (review) from the task itself
  const [rejectTask, setRejectTask]   = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [reviewing, setReviewing]     = useState(false);

  // Reference data
  const [accounts,   setAccounts]   = useState([]);
  const [csms,       setCsms]       = useState([]);
  const [ddConfig,   setDdConfig]   = useState({});

  useEffect(() => {
    axios.get('/api/accounts').then(r => setAccounts((r.data || []).sort((a,b) => a.account_name.localeCompare(b.account_name)))).catch(() => {});
    axios.get('/api/dropdown-config').then(r => setDdConfig(r.data || {})).catch(() => {});
    if (isAdmin) {
      axios.get('/api/admin/users').then(r => setCsms((r.data || []).filter(u => u.role === 'csm'))).catch(() => {});
    }
  }, [isAdmin]);

  const load = useCallback(() => {
    setLoading(true);
    axios.get('/api/tasks')
      .then(r => setTasks(r.data || []))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, [reload]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => { setPage(1); }, [statusFilter, natureFilter, assigneeFilter, search, accountFilter]);

  const natureOptions = useMemo(() =>
    [...new Set((ddConfig.nature_of_task || []).map(o => o.value))], [ddConfig]);

  const assigneeOptions = useMemo(() =>
    [...new Set(tasks.map(t => t.assigned_to).filter(Boolean))].sort(), [tasks]);

  const accountOptions = useMemo(() =>
    [...new Set(tasks.map(t => t.account_name).filter(Boolean))].sort(), [tasks]);

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      const ds = deriveStatus(t);
      if (statusFilter !== 'all' && ds !== statusFilter) return false;
      if (natureFilter && t.nature_of_task !== natureFilter) return false;
      if (assigneeFilter && t.assigned_to !== assigneeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!(t.task_subject?.toLowerCase().includes(q) ||
              t.task_description?.toLowerCase().includes(q) ||
              t.account_name?.toLowerCase().includes(q) ||
              t.assigned_to?.toLowerCase().includes(q))) return false;
      }
      if (accountFilter.length > 0 && !accountFilter.includes(t.account_name)) return false;
      return true;
    });
  }, [tasks, statusFilter, natureFilter, assigneeFilter, search]);

  const counts = useMemo(() => ({
    all:       tasks.length,
    Open:      tasks.filter(t => deriveStatus(t) === 'Open').length,
    Overdue:   tasks.filter(t => deriveStatus(t) === 'Overdue').length,
    Completed: tasks.filter(t => deriveStatus(t) === 'Completed').length,
  }), [tasks]);

  const paginated = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page, perPage]);

  // ── Add / Edit helpers ───────────────────────────────────────
  function openAdd() {
    const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0);
    const defaultDue = toLocalDT(d.toISOString());
    const self = csms.find(c => c.csm_name === user?.name || c.name === user?.name);
    setForm({
      ...EMPTY_FORM,
      due_date: defaultDue,
      assigned_to: isAdmin ? '' : (user?.csm_name || user?.name || ''),
      assigned_to_id: isAdmin ? '' : (user?.id || ''),
    });
    setEditingId(null); setFormError(null); setShowForm(true);
  }

  function openEdit(t) {
    setForm({
      task_subject: t.task_subject || '',
      task_description: t.task_description || '',
      nature_of_task: t.nature_of_task || '',
      due_date: toLocalDT(t.due_date),
      account_id: t.account_id || '',
      account_name: t.account_name || '',
      assigned_to_id: t.assigned_to_id || '',
      assigned_to: t.assigned_to || '',
    });
    setEditingId(t.id); setFormError(null); setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.task_subject.trim()) { setFormError('Task subject is required'); return; }
    if (!form.due_date) { setFormError('Due date is required'); return; }
    setSaving(true); setFormError(null);
    try {
      const payload = { ...form };
      if (!payload.account_id) delete payload.account_id;
      if (!payload.assigned_to_id) delete payload.assigned_to_id;

      let data;
      if (editingId) {
        ({ data } = await axios.put(`/api/tasks?id=${editingId}`, payload));
        setTasks(prev => prev.map(t => t.id === editingId ? data : t));
      } else {
        ({ data } = await axios.post('/api/tasks', payload));
        setTasks(prev => [data, ...prev]);
      }
      setShowForm(false);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  // A "Review Feature Request" task can be approved/rejected in place by the
  // assigned approver or any admin; this drives the linked feature request.
  const canReviewTask = (t) =>
    t.nature_of_task === 'Feature Request' && t.feature_request_id != null &&
    (isAdmin || String(t.assigned_to_id) === String(user?.id));

  async function approveFR(task) {
    setReviewing(true);
    try {
      await axios.put(`/api/feature-requests?id=${task.feature_request_id}`, { action: 'approve' });
      setReload(r => r + 1);
    } catch (e) { alert(e.response?.data?.error || 'Failed to approve'); }
    finally { setReviewing(false); }
  }

  async function submitReject() {
    if (!rejectTask) return;
    setReviewing(true);
    try {
      await axios.put(`/api/feature-requests?id=${rejectTask.feature_request_id}`, { action: 'reject', rejection_reason: rejectReason });
      setRejectTask(null); setRejectReason(''); setReload(r => r + 1);
    } catch (e) { alert(e.response?.data?.error || 'Failed to reject'); }
    finally { setReviewing(false); }
  }

  async function markComplete(taskId) {
    try {
      const { data } = await axios.put(`/api/tasks?id=${taskId}`, { status: 'Completed' });
      setTasks(prev => prev.map(t => t.id === taskId ? data : t));
    } catch {}
  }

  async function markOpen(taskId) {
    try {
      const { data } = await axios.put(`/api/tasks?id=${taskId}`, { status: 'Open' });
      setTasks(prev => prev.map(t => t.id === taskId ? data : t));
    } catch {}
  }

  async function bulkMarkComplete() {
    if (!selected.size) return;
    setBulkSaving(true);
    try {
      await axios.patch('/api/tasks', { ids: [...selected], field: 'status', value: 'Completed' });
      setReload(r => r + 1); setSelected(new Set());
    } catch {} finally { setBulkSaving(false); }
  }

  async function deleteTask(taskId) {
    if (!window.confirm('Delete this task?')) return;
    try {
      await axios.delete(`/api/tasks?id=${taskId}`);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch {}
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selected.size === paginated.length) { setSelected(new Set()); return; }
    setSelected(new Set(paginated.map(t => t.id)));
  }

  const allChecked = paginated.length > 0 && paginated.every(t => selected.has(t.id));

  // Account change → auto-fill account_name
  function onAccountChange(e) {
    const aid = e.target.value;
    const acct = accounts.find(a => String(a.id) === String(aid));
    setForm(f => ({ ...f, account_id: aid, account_name: acct?.account_name || '' }));
  }

  // Assignee change → fill name from csm list
  function onAssigneeChange(e) {
    const csmId = e.target.value;
    const csm = csms.find(c => String(c.id) === String(csmId));
    setForm(f => ({ ...f, assigned_to_id: csmId, assigned_to: csm?.csm_name || csm?.name || '' }));
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-500 mt-0.5">{counts.Open} open · {counts.Overdue} overdue · {counts.Completed} completed</p>
        </div>
        {can('create', 'tasks') && (
          <button
            onClick={openAdd}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Task
          </button>
        )}
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto pb-px">
        {[
          { key: 'all',      label: `All (${counts.all})` },
          { key: 'Open',     label: `Open (${counts.Open})` },
          { key: 'Overdue',  label: `Overdue (${counts.Overdue})` },
          { key: 'Completed',label: `Completed (${counts.Completed})` },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setStatusFilter(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition -mb-px whitespace-nowrap ${
              statusFilter === key
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search tasks…"
          className="!w-56 text-sm"
        />
        <SelectDropdown compact className="w-40" placeholder="All types" options={natureOptions} value={natureFilter} onChange={setNatureFilter} />
        {isAdmin && (
          <SelectDropdown compact className="w-44" placeholder="All assignees" options={assigneeOptions} value={assigneeFilter} onChange={setAssigneeFilter} />
        )}
        <MultiSelectDropdown compact className="w-44" placeholder="All Accounts" options={accountOptions} value={accountFilter} onChange={setAccountFilter} />
        {search || natureFilter || assigneeFilter || accountFilter.length > 0 ? (
          <button onClick={() => { setSearch(''); setNatureFilter(''); setAssigneeFilter(''); setAccountFilter([]); }}
            className="text-xs text-gray-400 hover:text-gray-600 transition">Clear</button>
        ) : null}
        <div className="ml-auto">
          {isEnabled('column_selection') && <ColumnToggle columns={visibleTaskCols.map(c => ({ ...c, label: fieldLabel('tasks', c.key, c.label) }))} prefs={colPrefs} onToggle={toggleCol} />}
        </div>
        {selected.size > 0 && isAdmin && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-gray-500">{selected.size} selected</span>
            <button onClick={bulkMarkComplete} disabled={bulkSaving}
              className="px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50">
              {bulkSaving ? '…' : 'Mark Complete'}
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <p className="font-medium">No tasks found</p>
          <p className="text-sm mt-1">Try adjusting your filters or add a new task.</p>
        </div>
      ) : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {isAdmin && (
                  <th className="w-10 px-3 py-3">
                    <input type="checkbox" checked={allChecked} onChange={selectAll}
                      className="!w-4 !h-4 !p-0 !border-0 !ring-0 shrink-0 accent-brand-600" />
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{fieldLabel('tasks', 'task_subject', 'Subject')}</th>
                {dataCols.map(c => (
                  <th key={c.key} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{fieldLabel('tasks', c.key, c.label)}</th>
                ))}
                <th className="px-3 py-3 w-16 sticky right-0 bg-gray-50 z-10 shadow-[-2px_0_6px_rgba(0,0,0,0.05)]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.map(task => {
                const ds = deriveStatus(task);
                const isOpen = expanded === task.id;
                return (
                  <React.Fragment key={task.id}>
                    <tr className={`group hover:bg-gray-50 transition ${ds === 'Overdue' ? 'bg-red-50/30' : ''}`}>
                      {isAdmin && (
                        <td className="w-10 px-3 py-3">
                          <input type="checkbox" checked={selected.has(task.id)} onChange={() => toggleSelect(task.id)}
                            className="!w-4 !h-4 !p-0 !border-0 !ring-0 shrink-0 accent-brand-600" />
                        </td>
                      )}
                      <td className="px-4 py-3 max-w-[220px]">
                        <button type="button" onClick={() => setExpanded(isOpen ? null : task.id)}
                          className="text-left w-full">
                          <p className="text-sm font-medium text-gray-800 truncate">{task.task_subject}</p>
                          {task.task_description && (
                            <p className="text-xs text-gray-400 truncate mt-0.5">{task.task_description}</p>
                          )}
                        </button>
                      </td>
                      {dataCols.map(c => {
                        const k = c.key;
                        let cell;
                        if (k === 'nature_of_task') {
                          cell = task.nature_of_task
                            ? <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">{task.nature_of_task}</span>
                            : <span className="text-gray-300">—</span>;
                        } else if (k === 'account_name') {
                          cell = task.account_id ? (
                            <button type="button" onClick={() => navigate(`/accounts/${task.account_id}`)}
                              className="text-xs text-brand-600 hover:underline font-medium truncate max-w-[140px] block">
                              {task.account_name || '—'}
                            </button>
                          ) : <span className="text-xs text-gray-400">{task.account_name || '—'}</span>;
                        } else if (k === 'due_date') {
                          cell = (
                            <>
                              <p className={`text-xs font-medium ${ds === 'Overdue' ? 'text-red-700' : 'text-gray-700'}`}>
                                {fmtDT(task.due_date)}
                              </p>
                              {ds === 'Completed' && task.completed_at && (
                                <p className="text-xs text-gray-400 mt-0.5">Done {fmtDate(task.completed_at)}</p>
                              )}
                            </>
                          );
                        } else if (k === 'derived_status') {
                          cell = (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[ds] || 'bg-gray-100 text-gray-700'}`}>
                              {ds}
                            </span>
                          );
                        } else if (k === 'completed_at') {
                          cell = task.completed_at
                            ? <span className="text-xs text-gray-600 whitespace-nowrap">{fmtDT(task.completed_at)}</span>
                            : <span className="text-gray-300">—</span>;
                        } else if (k === 'task_description') {
                          cell = task.task_description
                            ? <p className="text-xs text-gray-600 line-clamp-2 max-w-xs">{task.task_description}</p>
                            : <span className="text-gray-300">—</span>;
                        } else {
                          const v = task[k];
                          cell = (v === null || v === undefined || v === '')
                            ? <span className="text-gray-300">—</span>
                            : <span className="block max-w-[180px] truncate text-xs text-gray-600" title={String(v)}>{String(v)}</span>;
                        }
                        return <td key={k} className="px-4 py-3 whitespace-nowrap">{cell}</td>;
                      })}
                      <td className="px-3 py-3 sticky right-0 z-10 bg-white group-hover:bg-gray-50 shadow-[-2px_0_6px_rgba(0,0,0,0.05)] whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {canReviewTask(task) ? (
                            ds !== 'Completed' && (
                              <>
                                <button onClick={() => approveFR(task)} disabled={reviewing}
                                  className="p-1.5 rounded-md text-gray-400 hover:text-green-600 hover:bg-green-50 transition disabled:opacity-50"
                                  title="Approve feature request">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </button>
                                <button onClick={() => { setRejectTask(task); setRejectReason(''); }} disabled={reviewing}
                                  className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-50"
                                  title="Reject feature request">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l4-4m-4 0l4 4m5-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </button>
                              </>
                            )
                          ) : (
                            <>
                              {ds !== 'Completed' && (
                                <button onClick={() => markComplete(task.id)}
                                  className="p-1.5 rounded-md text-gray-400 hover:text-green-600 hover:bg-green-50 transition"
                                  title="Mark complete">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                </button>
                              )}
                              {ds === 'Completed' && (
                                <button onClick={() => markOpen(task.id)}
                                  className="p-1.5 rounded-md text-gray-400 hover:text-brand-600 hover:bg-gray-100 transition"
                                  title="Reopen">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                </button>
                              )}
                            </>
                          )}
                          {isAdmin && (
                            <>
                              <button onClick={() => openEdit(task)}
                                className="p-1.5 rounded-md text-gray-400 hover:text-brand-600 hover:bg-gray-100 transition"
                                title="Edit">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                              <button onClick={() => deleteTask(task.id)}
                                className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                                title="Delete">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </>
                          )}
                          <button onClick={ev => { ev.stopPropagation(); watchToggle('tasks', task.id); }}
                            className={`p-1.5 rounded-md transition ${isWatched('tasks', task.id) ? 'text-brand-600' : 'text-gray-300 hover:text-gray-500'}`}
                            title={isWatched('tasks', task.id) ? 'Remove from watchlist' : 'Add to watchlist'}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isOpen && task.task_description && (
                      <tr className="bg-gray-50">
                        <td colSpan={colCount} className="px-5 py-3 text-sm text-gray-700 whitespace-pre-wrap border-t border-gray-100">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Description</p>
                          {task.task_description}
                          {task.assigned_by && (
                            <p className="text-xs text-gray-400 mt-2">Assigned by: {task.assigned_by}</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          <div className="px-4">
            <Pagination page={page} perPage={perPage} total={filtered.length} onPage={setPage} onPerPage={setPerPage} />
          </div>
        </div>
      )}

      {/* ── Add / Edit Task Panel (portaled for true full-height) ─── */}
      {showForm && createPortal(
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setShowForm(false)} />
          <div className="fixed inset-y-0 right-0 w-[520px] max-w-[90vw] bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <h3 className="text-sm font-semibold text-gray-900">{editingId ? 'Edit Task' : 'Add Task'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <form id="task-slide-form" onSubmit={handleSave} className="space-y-3">
                {formError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{formError}</p>}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Task Subject *</label>
                  <input value={form.task_subject} onChange={e => setForm(f => ({ ...f, task_subject: e.target.value }))}
                    placeholder="e.g. War room for Acme escalation" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Nature of Task</label>
                    <select value={form.nature_of_task} onChange={e => setForm(f => ({ ...f, nature_of_task: e.target.value }))}>
                      <option value="">— Select —</option>
                      {natureOptions.map(v => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Due Date & Time *</label>
                    <input type="datetime-local" value={form.due_date}
                      onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Account</label>
                    <select value={form.account_id} onChange={onAccountChange}>
                      <option value="">— No account —</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Assigned To</label>
                    {isAdmin ? (
                      <select value={form.assigned_to_id} onChange={onAssigneeChange}>
                        <option value="">— Unassigned —</option>
                        {csms.map(c => (
                          <option key={c.id} value={c.id}>{c.csm_name || c.name}</option>
                        ))}
                      </select>
                    ) : (
                      <input value={form.assigned_to || user?.csm_name || user?.name || ''} readOnly className="bg-gray-50 text-gray-500" />
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Task Description</label>
                  <textarea rows={4} value={form.task_description}
                    onChange={e => setForm(f => ({ ...f, task_description: e.target.value }))}
                    placeholder="Details, context, links…" className="resize-none" />
                </div>
              </form>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex gap-2 shrink-0">
              <button type="submit" form="task-slide-form" disabled={saving}
                className="flex-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50">
                {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Task'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 rounded-lg transition">
                Cancel
              </button>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Reject feature request (from its review task) */}
      {rejectTask && createPortal(
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={() => setRejectTask(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Reject Feature Request</h3>
              <button onClick={() => setRejectTask(null)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-gray-600">{rejectTask.task_subject}</p>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Rejection reason <span className="text-gray-400">(required)</span></label>
                <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} className="w-full resize-none text-sm" placeholder="Explain why this is being rejected…" autoFocus />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 pb-5">
              <button onClick={() => setRejectTask(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition">Cancel</button>
              <button onClick={submitReject} disabled={reviewing || !rejectReason.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-60">
                {reviewing ? '…' : 'Reject'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
