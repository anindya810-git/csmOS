import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useWatchlist } from '../hooks/useWatchlist';

const TABS = [
  { key: 'accounts',         label: 'Accounts',         color: 'text-blue-700 bg-blue-50 border-blue-200' },
  { key: 'issues',           label: 'Issues',           color: 'text-rose-700 bg-rose-50 border-rose-200' },
  { key: 'escalations',      label: 'Escalations',      color: 'text-amber-700 bg-amber-50 border-amber-200' },
  { key: 'tasks',            label: 'Tasks',            color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { key: 'feature_requests', label: 'Feature Requests', color: 'text-violet-700 bg-violet-50 border-violet-200' },
];

const RAG_BADGE = {
  Green: 'bg-green-100 text-green-800 border border-green-200',
  Amber: 'bg-amber-100 text-amber-800 border border-amber-200',
  Red:   'bg-red-100 text-red-800 border border-red-200',
};
const PRIORITY_BADGE = {
  P0: 'bg-red-100 text-red-700',
  P1: 'bg-orange-100 text-orange-700',
  P2: 'bg-yellow-100 text-yellow-700',
  P3: 'bg-gray-100 text-gray-600',
};

function fmt(n) {
  if (!n) return '—';
  if (n >= 10000000) return `₹${(n/10000000).toFixed(1)}Cr`;
  if (n >= 100000)   return `₹${(n/100000).toFixed(1)}L`;
  return `₹${n.toLocaleString()}`;
}
function fmtDate(s) {
  if (!s) return '—';
  try {
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return s; }
}

/* ── Icons ─────────────────────────────────────────────────────────── */
function IconBtn({ title, onClick, className = '', children }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(e); }}
      title={title}
      className={`p-1.5 rounded-lg transition ${className}`}
    >{children}</button>
  );
}
function EyeOffIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>;
}
function EditIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>;
}
function TrashIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
}
function AccountIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>;
}

/* ── Delete confirmation portal ─────────────────────────────────────── */
function DeleteConfirm({ label, onConfirm, onCancel }) {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
        <h3 className="text-base font-bold text-gray-900 mb-2">Delete {label}?</h3>
        <p className="text-sm text-gray-500 mb-5">This cannot be undone. The item will also be removed from your watchlist.</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition">Delete</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── Edit side panels (imported lazily from existing pages) ─────────── */

function EmptyState({ type }) {
  const labels = { accounts: 'accounts', issues: 'issues', escalations: 'escalations', tasks: 'tasks', feature_requests: 'feature requests' };
  return (
    <div className="text-center py-16">
      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-gray-600">No watched {labels[type]}</p>
      <p className="text-xs text-gray-400 mt-1">Click the eye icon on any {labels[type].slice(0, -1)} to add it here</p>
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────────────── */
export default function WatchlistPage() {
  const navigate = useNavigate();
  const { getIds, toggle } = useWatchlist();
  const [activeTab, setActiveTab] = useState('accounts');
  const [data, setData]     = useState({});
  const [loading, setLoading] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null); // { type, id, label }
  const [editItem, setEditItem] = useState(null); // { type, item }

  const watchedIds = {
    accounts:         getIds('accounts'),
    issues:           getIds('issues'),
    escalations:      getIds('escalations'),
    tasks:            getIds('tasks'),
    feature_requests: getIds('feature_requests'),
  };

  const tabsWithCount = TABS.map(t => ({ ...t, count: watchedIds[t.key].length }));

  const fetchTab = useCallback(async (tab) => {
    const ids = watchedIds[tab];
    if (!ids.length) { setData(d => ({ ...d, [tab]: [] })); return; }
    if (data[tab] !== undefined) return;
    setLoading(l => ({ ...l, [tab]: true }));
    try {
      const endpointMap = {
        accounts:         '/api/accounts',
        issues:           '/api/issues',
        escalations:      '/api/escalations',
        tasks:            '/api/tasks',
        feature_requests: '/api/feature-requests',
      };
      const { data: rows } = await axios.get(endpointMap[tab]);
      const allRows = Array.isArray(rows) ? rows : (rows?.data || rows?.issues || rows?.escalations || rows?.tasks || []);
      setData(d => ({ ...d, [tab]: allRows.filter(r => ids.includes(String(r.id))) }));
    } catch {
      setData(d => ({ ...d, [tab]: [] }));
    } finally {
      setLoading(l => ({ ...l, [tab]: false }));
    }
  }, [data, JSON.stringify(watchedIds)]);

  useEffect(() => { fetchTab(activeTab); }, [activeTab]);
  useEffect(() => { setData({}); }, [JSON.stringify(watchedIds)]);

  async function handleDelete(type, id) {
    const endpointMap = {
      issues:           `/api/issues?id=${id}`,
      escalations:      `/api/escalations/${id}`,
      tasks:            `/api/tasks?id=${id}`,
      feature_requests: `/api/feature-requests?id=${id}`,
    };
    try {
      await axios.delete(endpointMap[type]);
      toggle(type, id); // remove from watchlist
      setData(d => ({ ...d, [type]: (d[type] || []).filter(r => String(r.id) !== String(id)) }));
    } catch (e) {
      alert('Delete failed: ' + (e.response?.data?.error || e.message));
    }
    setConfirmDelete(null);
  }

  const rows = data[activeTab] || [];
  const isLoading = loading[activeTab];

  const sharedProps = {
    onNavigate: navigate,
    onRemove: (type, id) => toggle(type, id),
    onDelete: (type, id, label) => setConfirmDelete({ type, id, label }),
    onEdit: (type, item) => setEditItem({ type, item }),
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Watchlist</h1>
        <p className="text-sm text-gray-500 mt-0.5">Items you're keeping an eye on</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto pb-px">
        {tabsWithCount.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition -mb-px ${
              activeTab === t.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${activeTab === t.key ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !watchedIds[activeTab].length ? (
        <EmptyState type={activeTab} />
      ) : rows.length === 0 ? (
        <EmptyState type={activeTab} />
      ) : activeTab === 'accounts' ? (
        <AccountRows rows={rows} {...sharedProps} />
      ) : activeTab === 'issues' ? (
        <IssueRows rows={rows} {...sharedProps} />
      ) : activeTab === 'escalations' ? (
        <EscalationRows rows={rows} {...sharedProps} />
      ) : activeTab === 'tasks' ? (
        <TaskRows rows={rows} {...sharedProps} />
      ) : (
        <FeatureRequestRows rows={rows} {...sharedProps} />
      )}

      {confirmDelete && (
        <DeleteConfirm
          label={confirmDelete.label}
          onConfirm={() => handleDelete(confirmDelete.type, confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {editItem && (
        <EditPanel
          type={editItem.type}
          item={editItem.item}
          onClose={() => setEditItem(null)}
          onSaved={(type, updated) => {
            setData(d => ({ ...d, [type]: (d[type] || []).map(r => String(r.id) === String(updated.id) ? { ...r, ...updated } : r) }));
            setEditItem(null);
          }}
          navigate={navigate}
        />
      )}
    </div>
  );
}

/* ── Action buttons ─────────────────────────────────────────────────── */
function Actions({ onRemove, onDelete, onEdit, editLabel, deleteLabel, onOpenAccount, onOpen }) {
  return (
    <div className="flex items-center gap-0.5">
      {onOpen && (
        <IconBtn title="Open" onClick={onOpen} className="text-gray-400 hover:text-brand-600 hover:bg-brand-50">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
        </IconBtn>
      )}
      {onOpenAccount && (
        <IconBtn title="Open Account" onClick={onOpenAccount} className="text-gray-400 hover:text-blue-600 hover:bg-blue-50">
          <AccountIcon />
        </IconBtn>
      )}
      {onEdit && (
        <IconBtn title={editLabel || 'Edit'} onClick={onEdit} className="text-gray-400 hover:text-amber-600 hover:bg-amber-50">
          <EditIcon />
        </IconBtn>
      )}
      {onDelete && (
        <IconBtn title={deleteLabel || 'Delete'} onClick={onDelete} className="text-gray-400 hover:text-red-600 hover:bg-red-50">
          <TrashIcon />
        </IconBtn>
      )}
      <IconBtn title="Remove from watchlist" onClick={onRemove} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100">
        <EyeOffIcon />
      </IconBtn>
    </div>
  );
}

/* ── Tab row components ─────────────────────────────────────────────── */
function AccountRows({ rows, onNavigate, onRemove, onDelete, onEdit }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/80">
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Account</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">CSM</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">RAG</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">MRR</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(a => (
            <tr key={a.id} className="hover:bg-gray-50 cursor-pointer transition" onClick={() => onNavigate(`/accounts/${a.id}`)}>
              <td className="px-5 py-3.5">
                <p className="font-medium text-gray-900">{a.account_name}</p>
                <p className="text-xs text-gray-400">{a.tenant_id || '—'}</p>
              </td>
              <td className="px-4 py-3.5 text-gray-600">{a.csm || '—'}</td>
              <td className="px-4 py-3.5">
                {a.rag_status
                  ? <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${RAG_BADGE[a.rag_status] || ''}`}>{a.rag_status}</span>
                  : <span className="text-gray-300">—</span>}
              </td>
              <td className="px-4 py-3.5 text-right font-medium text-gray-800">{fmt(a.mrr)}</td>
              <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                <Actions
                  onRemove={() => onRemove('accounts', a.id)}
                  onEdit={() => onNavigate(`/accounts/${a.id}/edit`)}
                  editLabel="Edit account"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IssueRows({ rows, onNavigate, onRemove, onDelete, onEdit }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/80">
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Issue</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Account</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Priority</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(issue => (
            <tr key={issue.id} className="hover:bg-gray-50 transition">
              <td className="px-5 py-3.5">
                <p className="font-medium text-gray-900 max-w-xs truncate">{issue.description || issue.issue_type || '—'}</p>
                <p className="text-xs text-gray-400">{issue.issue_type}{issue.issue_sub_type ? ` · ${issue.issue_sub_type}` : ''}</p>
              </td>
              <td className="px-4 py-3.5 text-gray-600">{issue.accounts?.account_name || '—'}</td>
              <td className="px-4 py-3.5">
                {issue.priority
                  ? <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PRIORITY_BADGE[issue.priority] || 'bg-gray-100 text-gray-600'}`}>{issue.priority}</span>
                  : <span className="text-gray-300">—</span>}
              </td>
              <td className="px-4 py-3.5">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${issue.status === 'Open' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{issue.status}</span>
              </td>
              <td className="px-4 py-3.5">
                <Actions
                  onRemove={() => onRemove('issues', issue.id)}
                  onEdit={() => onEdit('issues', issue)}
                  onDelete={() => onDelete('issues', issue.id, 'this issue')}
                  onOpenAccount={issue.account_id ? () => onNavigate(`/accounts/${issue.account_id}`) : null}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EscalationRows({ rows, onNavigate, onRemove, onDelete, onEdit }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/80">
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Account</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Trigger</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(esc => (
            <tr key={esc.id} className="hover:bg-gray-50 transition">
              <td className="px-5 py-3.5">
                <p className="font-medium text-gray-900">{esc.accounts?.account_name || esc.account_name || '—'}</p>
                <p className="text-xs text-gray-400">{esc.csm || '—'}</p>
              </td>
              <td className="px-4 py-3.5 text-gray-600 max-w-xs truncate">{esc.trigger_reason || '—'}</td>
              <td className="px-4 py-3.5">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${esc.status === 'Open' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{esc.status}</span>
              </td>
              <td className="px-4 py-3.5 text-gray-500 text-xs">{fmtDate(esc.date_of_escalation)}</td>
              <td className="px-4 py-3.5">
                <Actions
                  onRemove={() => onRemove('escalations', esc.id)}
                  onEdit={() => onEdit('escalations', esc)}
                  onDelete={() => onDelete('escalations', esc.id, 'this escalation')}
                  onOpenAccount={esc.account_id ? () => onNavigate(`/accounts/${esc.account_id}`) : null}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TaskRows({ rows, onNavigate, onRemove, onDelete, onEdit }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/80">
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Task</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Account</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Assigned To</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Due</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(task => (
            <tr key={task.id} className="hover:bg-gray-50 transition">
              <td className="px-5 py-3.5">
                <p className="font-medium text-gray-900 max-w-xs truncate">{task.task_subject || '—'}</p>
                <p className="text-xs text-gray-400">{task.nature_of_task || '—'}</p>
              </td>
              <td className="px-4 py-3.5 text-gray-600">{task.accounts?.account_name || task.account_name || '—'}</td>
              <td className="px-4 py-3.5 text-gray-600">{task.assigned_to || '—'}</td>
              <td className="px-4 py-3.5 text-gray-500 text-xs">{fmtDate(task.due_date)}</td>
              <td className="px-4 py-3.5">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${task.status === 'Open' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>{task.status}</span>
              </td>
              <td className="px-4 py-3.5">
                <Actions
                  onRemove={() => onRemove('tasks', task.id)}
                  onEdit={() => onEdit('tasks', task)}
                  onDelete={() => onDelete('tasks', task.id, 'this task')}
                  onOpenAccount={task.account_id ? () => onNavigate(`/accounts/${task.account_id}`) : null}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FeatureRequestRows({ rows, onNavigate, onRemove, onDelete, onEdit }) {
  function reqId(fr) { return fr.request_id || `FR-${String(fr.id).padStart(5, '0')}`; }
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/80">
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Request</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Priority</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(fr => (
            <tr key={fr.id} className="hover:bg-gray-50 transition">
              <td className="px-5 py-3.5">
                <p className="text-xs text-gray-400 font-mono mb-0.5">{reqId(fr)}</p>
                <p className="font-medium text-gray-900 max-w-xs truncate">{fr.feature_name || fr.title || '—'}</p>
              </td>
              <td className="px-4 py-3.5">
                {fr.priority
                  ? <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PRIORITY_BADGE[fr.priority] || 'bg-gray-100 text-gray-600'}`}>{fr.priority}</span>
                  : <span className="text-gray-300">—</span>}
              </td>
              <td className="px-4 py-3.5">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  fr.status === 'approved' ? 'bg-green-100 text-green-700' :
                  fr.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>{fr.status}</span>
              </td>
              <td className="px-4 py-3.5 text-gray-500 text-xs">{fmtDate(fr.date_requested)}</td>
              <td className="px-4 py-3.5">
                <Actions
                  onRemove={() => onRemove('feature_requests', fr.id)}
                  onEdit={() => onEdit('feature_requests', fr)}
                  onDelete={() => onDelete('feature_requests', fr.id, 'this feature request')}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Edit side panel (renders right-side drawer for each type) ───────── */
function EditPanel({ type, item, onClose, onSaved, navigate }) {
  if (type === 'accounts') {
    // Accounts have a dedicated edit route
    navigate(`/accounts/${item.id}/edit`);
    onClose();
    return null;
  }
  return createPortal(
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-[520px] max-w-[90vw] bg-white h-full shadow-2xl border-l border-gray-200 flex flex-col overflow-y-auto">
        {type === 'issues'           && <IssueEditForm item={item} onClose={onClose} onSaved={updated => onSaved('issues', updated)} />}
        {type === 'escalations'      && <EscalationEditForm item={item} onClose={onClose} onSaved={updated => onSaved('escalations', updated)} />}
        {type === 'tasks'            && <TaskEditForm item={item} onClose={onClose} onSaved={updated => onSaved('tasks', updated)} />}
        {type === 'feature_requests' && <FREditForm item={item} onClose={onClose} onSaved={updated => onSaved('feature_requests', updated)} />}
      </div>
    </div>,
    document.body
  );
}

/* ── Minimal inline edit forms ──────────────────────────────────────── */
function PanelHeader({ title, onClose }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
      <h2 className="text-base font-bold text-gray-900">{title}</h2>
      <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function inputCls() { return 'w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-200 focus:border-brand-400 outline-none transition'; }
function selectCls() { return 'w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-200 focus:border-brand-400 outline-none transition appearance-none'; }

function SaveBar({ saving, onClose, onSave }) {
  return (
    <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3 justify-end">
      <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition">Cancel</button>
      <button onClick={onSave} disabled={saving} className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-60">
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
}

function IssueEditForm({ item, onClose, onSaved }) {
  const [form, setForm] = useState({
    description: item.description || '',
    priority: item.priority || '',
    status: item.status || 'Open',
    next_steps: item.next_steps || '',
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const { data } = await axios.put(`/api/issues?id=${item.id}`, form);
      onSaved(data?.issue || { ...item, ...form });
    } catch (e) { alert(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  }

  return (
    <>
      <PanelHeader title="Edit Issue" onClose={onClose} />
      <div className="p-6 space-y-4 flex-1">
        <Field label="Description">
          <textarea rows={3} value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} className={inputCls()} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Priority">
            <select value={form.priority} onChange={e => setForm(f => ({...f, priority: e.target.value}))} className={selectCls()}>
              <option value="">—</option>
              {['P0','P1','P2','P3'].map(p => <option key={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))} className={selectCls()}>
              {['Open','In Progress','Resolved','Closed'].map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Next Steps">
          <textarea rows={2} value={form.next_steps} onChange={e => setForm(f => ({...f, next_steps: e.target.value}))} className={inputCls()} />
        </Field>
      </div>
      <SaveBar saving={saving} onClose={onClose} onSave={save} />
    </>
  );
}

function EscalationEditForm({ item, onClose, onSaved }) {
  const [form, setForm] = useState({
    trigger_reason: item.trigger_reason || '',
    status: item.status || 'Open',
    action_plan: item.action_plan || '',
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const { data } = await axios.put(`/api/escalations/${item.id}`, form);
      onSaved(data?.escalation || { ...item, ...form });
    } catch (e) { alert(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  }

  return (
    <>
      <PanelHeader title="Edit Escalation" onClose={onClose} />
      <div className="p-6 space-y-4 flex-1">
        <Field label="Trigger / Reason">
          <textarea rows={3} value={form.trigger_reason} onChange={e => setForm(f => ({...f, trigger_reason: e.target.value}))} className={inputCls()} />
        </Field>
        <Field label="Status">
          <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))} className={selectCls()}>
            {['Open','Monitoring','Resolved','Closed'].map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Action Plan">
          <textarea rows={3} value={form.action_plan} onChange={e => setForm(f => ({...f, action_plan: e.target.value}))} className={inputCls()} />
        </Field>
      </div>
      <SaveBar saving={saving} onClose={onClose} onSave={save} />
    </>
  );
}

function TaskEditForm({ item, onClose, onSaved }) {
  const [form, setForm] = useState({
    task_subject: item.task_subject || '',
    status: item.status || 'Open',
    assigned_to: item.assigned_to || '',
    due_date: item.due_date ? item.due_date.slice(0, 10) : '',
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const { data } = await axios.put(`/api/tasks?id=${item.id}`, form);
      onSaved(data?.task || { ...item, ...form });
    } catch (e) { alert(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  }

  return (
    <>
      <PanelHeader title="Edit Task" onClose={onClose} />
      <div className="p-6 space-y-4 flex-1">
        <Field label="Subject">
          <input value={form.task_subject} onChange={e => setForm(f => ({...f, task_subject: e.target.value}))} className={inputCls()} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Status">
            <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))} className={selectCls()}>
              {['Open','In Progress','Completed','Cancelled'].map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Due Date">
            <input type="date" value={form.due_date} onChange={e => setForm(f => ({...f, due_date: e.target.value}))} className={inputCls()} />
          </Field>
        </div>
        <Field label="Assigned To">
          <input value={form.assigned_to} onChange={e => setForm(f => ({...f, assigned_to: e.target.value}))} className={inputCls()} />
        </Field>
      </div>
      <SaveBar saving={saving} onClose={onClose} onSave={save} />
    </>
  );
}

function FREditForm({ item, onClose, onSaved }) {
  const [form, setForm] = useState({
    feature_name: item.feature_name || item.title || '',
    priority: item.priority || '',
    status: item.status || 'pending',
    description: item.description || '',
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const { data } = await axios.put(`/api/feature-requests?id=${item.id}`, form);
      onSaved(data?.feature_request || { ...item, ...form });
    } catch (e) { alert(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  }

  return (
    <>
      <PanelHeader title="Edit Feature Request" onClose={onClose} />
      <div className="p-6 space-y-4 flex-1">
        <Field label="Feature Name">
          <input value={form.feature_name} onChange={e => setForm(f => ({...f, feature_name: e.target.value}))} className={inputCls()} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Priority">
            <select value={form.priority} onChange={e => setForm(f => ({...f, priority: e.target.value}))} className={selectCls()}>
              <option value="">—</option>
              {['P0','P1','P2','P3'].map(p => <option key={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))} className={selectCls()}>
              {['pending','approved','rejected','in_progress','shipped'].map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Description">
          <textarea rows={3} value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} className={inputCls()} />
        </Field>
      </div>
      <SaveBar saving={saving} onClose={onClose} onSave={save} />
    </>
  );
}
