import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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

function EyeOffIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}

function EmptyState({ type }) {
  const labels = {
    accounts: 'accounts', issues: 'issues', escalations: 'escalations',
    tasks: 'tasks', feature_requests: 'feature requests',
  };
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

export default function WatchlistPage() {
  const navigate = useNavigate();
  const { getIds, toggle } = useWatchlist();
  const [activeTab, setActiveTab] = useState('accounts');
  const [data, setData]     = useState({});
  const [loading, setLoading] = useState({});

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
    if (data[tab] !== undefined) return; // already loaded
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
      const filtered = allRows.filter(r => ids.includes(String(r.id)));
      setData(d => ({ ...d, [tab]: filtered }));
    } catch {
      setData(d => ({ ...d, [tab]: [] }));
    } finally {
      setLoading(l => ({ ...l, [tab]: false }));
    }
  }, [data, JSON.stringify(watchedIds)]);

  useEffect(() => {
    fetchTab(activeTab);
  }, [activeTab]);

  // Re-fetch current tab when watchlist changes (item removed)
  useEffect(() => {
    setData({});
  }, [JSON.stringify(watchedIds)]);

  function handleRemove(type, id) {
    toggle(type, id);
  }

  const rows = data[activeTab] || [];
  const isLoading = loading[activeTab];
  const watchedSet = new Set(watchedIds[activeTab]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Watchlist</h1>
        <p className="text-sm text-gray-500 mt-0.5">Items you're keeping an eye on</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto pb-px">
        {tabsWithCount.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition -mb-px ${
              activeTab === t.key
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !watchedIds[activeTab].length ? (
        <EmptyState type={activeTab} />
      ) : rows.length === 0 ? (
        <EmptyState type={activeTab} />
      ) : activeTab === 'accounts' ? (
        <AccountRows rows={rows} onNavigate={navigate} onRemove={handleRemove} />
      ) : activeTab === 'issues' ? (
        <IssueRows rows={rows} onNavigate={navigate} onRemove={handleRemove} />
      ) : activeTab === 'escalations' ? (
        <EscalationRows rows={rows} onNavigate={navigate} onRemove={handleRemove} />
      ) : activeTab === 'tasks' ? (
        <TaskRows rows={rows} onNavigate={navigate} onRemove={handleRemove} />
      ) : (
        <FeatureRequestRows rows={rows} onNavigate={navigate} onRemove={handleRemove} />
      )}
    </div>
  );
}

function RemoveButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      title="Remove from watchlist"
      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition flex-shrink-0"
    >
      <EyeOffIcon />
    </button>
  );
}

function AccountRows({ rows, onNavigate, onRemove }) {
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
                <RemoveButton onClick={() => onRemove('accounts', a.id)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const PRIORITY_BADGE = {
  P0: 'bg-red-100 text-red-700',
  P1: 'bg-orange-100 text-orange-700',
  P2: 'bg-yellow-100 text-yellow-700',
  P3: 'bg-gray-100 text-gray-600',
};

function IssueRows({ rows, onNavigate, onRemove }) {
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
                <RemoveButton onClick={() => onRemove('issues', issue.id)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EscalationRows({ rows, onNavigate, onRemove }) {
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
                <RemoveButton onClick={() => onRemove('escalations', esc.id)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TaskRows({ rows, onNavigate, onRemove }) {
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
                <RemoveButton onClick={() => onRemove('tasks', task.id)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FeatureRequestRows({ rows, onNavigate, onRemove }) {
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
                <RemoveButton onClick={() => onRemove('feature_requests', fr.id)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
