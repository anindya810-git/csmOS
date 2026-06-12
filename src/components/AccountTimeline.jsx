import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const STATUS_STYLES = {
  'Resolved':        'bg-green-100 text-green-800',
  'In Progress':     'bg-amber-100 text-amber-800',
  'Partly Resolved': 'bg-blue-100 text-blue-800',
  'Open':            'bg-red-100 text-red-800',
  'Closed':          'bg-gray-100 text-gray-700',
  'Deferred':        'bg-indigo-100 text-indigo-800',
};

const TYPE_CONFIG = {
  escalation: {
    label: 'Escalation',
    dot:   'bg-orange-500',
    border: 'border-l-orange-400',
    badge:  'bg-orange-100 text-orange-700',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  issue: {
    label: 'Issue',
    dot:   'bg-purple-500',
    border: 'border-l-purple-400',
    badge:  'bg-purple-100 text-purple-700',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  task: {
    label: 'Task',
    dot:   'bg-teal-500',
    border: 'border-l-teal-400',
    badge:  'bg-teal-100 text-teal-700',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
};

function fmtDate(s) {
  if (!s) return '—';
  try {
    const d = new Date(s);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return '—'; }
}

function fmtDateShort(s) {
  if (!s) return null;
  try {
    const d = new Date(s);
    if (isNaN(d)) return null;
    return {
      day: d.toLocaleDateString('en-IN', { day: '2-digit' }),
      mon: d.toLocaleDateString('en-IN', { month: 'short' }),
      yr:  d.toLocaleDateString('en-IN', { year: 'numeric' }),
    };
  } catch { return null; }
}

function monthLabel(dateStr) {
  if (!dateStr) return 'Unknown';
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return 'Unknown';
    return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  } catch { return 'Unknown'; }
}

export default function AccountTimeline() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [account,     setAccount]     = useState(null);
  const [escalations, setEscalations] = useState([]);
  const [issues,      setIssues]      = useState([]);
  const [tasks,       setTasks]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [expanded,    setExpanded]    = useState(null);
  const [filter,      setFilter]      = useState('all');
  const [dateFrom,    setDateFrom]    = useState('');
  const [dateTo,      setDateTo]      = useState('');

  useEffect(() => {
    Promise.all([
      axios.get(`/api/accounts/${id}`),
      axios.get(`/api/escalations?account_id=${id}`),
      axios.get(`/api/issues?account_id=${id}`),
      axios.get(`/api/tasks?account_id=${id}`),
    ]).then(([acc, esc, iss, tsk]) => {
      setAccount(acc.data);
      setEscalations(esc.data || []);
      setIssues(iss.data || []);
      setTasks(tsk.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const groups = useMemo(() => {
    const fromD = dateFrom ? new Date(dateFrom + 'T00:00:00') : null;
    const toD   = dateTo   ? new Date(dateTo   + 'T23:59:59') : null;

    const raw = [
      ...escalations.map(e => ({
        ...e,
        _type:    'escalation',
        _sortDate: new Date(e.date_of_escalation || e.created_at || 0),
        _dateStr:  e.date_of_escalation,
      })),
      ...issues.map(i => ({
        ...i,
        _type:    'issue',
        _sortDate: new Date(i.reported_date || i.created_at || 0),
        _dateStr:  i.reported_date,
      })),
      ...tasks.map(t => {
        const dateStr = t.derived_status === 'Completed' ? (t.completed_at || t.due_date) : t.due_date;
        return { ...t, _type: 'task', _sortDate: new Date(dateStr || 0), _dateStr: dateStr };
      }),
    ]
      .filter(ev => filter === 'all' || ev._type === filter)
      .filter(ev => {
        if (!fromD && !toD) return true;
        const d = ev._sortDate;
        if (isNaN(d)) return true;
        if (fromD && d < fromD) return false;
        if (toD   && d > toD)   return false;
        return true;
      })
      .sort((a, b) => b._sortDate - a._sortDate);

    const result = [];
    let lastMonth = null;
    for (const item of raw) {
      const mk = monthLabel(item._dateStr);
      if (mk !== lastMonth) { result.push({ kind: 'month', label: mk }); lastMonth = mk; }
      result.push({ kind: 'event', data: item });
    }
    return result;
  }, [escalations, issues, tasks, filter, dateFrom, dateTo]);

  const total = escalations.length + issues.length + tasks.length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate(`/accounts/${id}`)} className="mt-1 text-gray-400 hover:text-gray-600 transition shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{account?.account_name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">Activity Timeline · {total} event{total !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        {/* Type filter pills */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: 'all',        label: `All (${total})`,                    color: 'brand' },
            { key: 'escalation', label: `Escalations (${escalations.length})`, color: 'orange' },
            { key: 'issue',      label: `Issues (${issues.length})`,           color: 'purple' },
            { key: 'task',       label: `Tasks (${tasks.length})`,             color: 'teal' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${
                filter === f.key
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Date range filter */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium text-gray-500 shrink-0">Date range:</span>
          <div className="flex items-center gap-2">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="!py-1.5 !text-sm w-36 sm:w-40" placeholder="From" />
            <span className="text-gray-400 text-xs">–</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="!py-1.5 !text-sm w-36 sm:w-40" placeholder="To" />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); }}
                className="text-xs text-gray-400 hover:text-gray-600 transition px-1">
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <svg className="w-10 h-10 mx-auto mb-3 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-medium">No activity found</p>
          <p className="text-sm mt-1">{dateFrom || dateTo ? 'Try adjusting the date range.' : 'No events recorded yet.'}</p>
        </div>
      ) : (
        <div className="relative pb-4">
          {/* Vertical rail */}
          <div className="absolute left-[19px] top-3 bottom-3 w-0.5 bg-gray-150 rounded-full" />

          <div className="space-y-1.5">
            {groups.map((row, idx) => {
              if (row.kind === 'month') {
                return (
                  <div key={`m-${idx}`} className="relative pl-16 py-3 first:pt-0">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{row.label}</span>
                  </div>
                );
              }

              const ev   = row.data;
              const tc   = TYPE_CONFIG[ev._type] || TYPE_CONFIG.task;
              const key  = `${ev._type}-${ev.id}`;
              const open = expanded === key;
              const dateInfo = fmtDateShort(ev._dateStr);

              return (
                <div key={key} className="relative pl-16 pb-1">
                  {/* Timeline dot */}
                  <div className={`absolute left-[15px] top-5 w-[9px] h-[9px] rounded-full border-2 border-white z-10 shadow-sm ${tc.dot}`} />

                  <div className={`card !p-0 overflow-hidden border-l-4 ${tc.border}`}>
                    <button type="button"
                      className="w-full flex items-start gap-3 px-4 py-3.5 hover:bg-gray-50/80 transition text-left"
                      onClick={() => setExpanded(open ? null : key)}
                    >
                      {/* Date block */}
                      {dateInfo ? (
                        <div className="shrink-0 w-12 text-center">
                          <p className="text-lg font-bold text-gray-800 leading-none">{dateInfo.day}</p>
                          <p className="text-xs font-semibold text-gray-500 uppercase">{dateInfo.mon}</p>
                          <p className="text-[10px] text-gray-400">{dateInfo.yr}</p>
                        </div>
                      ) : (
                        <div className="shrink-0 w-12 text-center text-gray-300 text-xs">—</div>
                      )}

                      {/* Divider */}
                      <div className="w-px self-stretch bg-gray-100 shrink-0" />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${tc.badge}`}>
                            {tc.icon}
                            {tc.label}
                          </span>
                          {ev._type === 'task' ? (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              ev.derived_status === 'Completed' ? 'bg-green-100 text-green-800'
                              : ev.derived_status === 'Overdue' ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                            }`}>
                              {ev.derived_status}
                            </span>
                          ) : (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[ev.status] || 'bg-gray-100 text-gray-700'}`}>
                              {ev.status || 'Open'}
                            </span>
                          )}
                          {ev._type !== 'escalation' && ev._type !== 'task' && ev.priority && (
                            <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${
                              ev.priority === 'High' || ev.priority === 'P0' || ev.priority === 'P1'
                                ? 'bg-red-50 text-red-600 border-red-200'
                                : ev.priority === 'Medium' || ev.priority === 'P2'
                                ? 'bg-amber-50 text-amber-600 border-amber-200'
                                : 'bg-gray-50 text-gray-500 border-gray-200'
                            }`}>
                              {ev.priority}
                            </span>
                          )}
                          {ev._type === 'task' && ev.nature_of_task && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{ev.nature_of_task}</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-800 line-clamp-2">{ev._type === 'task' ? ev.task_subject : ev.description}</p>
                        <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-400">
                          {ev._type !== 'task' && ev.csm && <span>CSM: {ev.csm}</span>}
                          {ev._type === 'escalation' && ev.ownership && <span>Owner: {ev.ownership}</span>}
                          {ev._type === 'issue' && ev.issue_type && (
                            <span>{ev.issue_type}{ev.issue_sub_type ? ` › ${ev.issue_sub_type}` : ''}</span>
                          )}
                          {ev._type === 'task' && ev.assigned_to && <span>Assigned to: {ev.assigned_to}</span>}
                        </div>
                      </div>

                      <svg className={`w-4 h-4 text-gray-300 shrink-0 mt-1 transition-transform ${open ? '' : '-rotate-90'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {open && (
                      <div className="px-4 pb-4 pt-2 bg-gray-50 border-t border-gray-100 text-sm space-y-2.5">
                        {ev._type === 'task' ? (
                          <>
                            {ev.task_description && <p className="text-gray-700 whitespace-pre-wrap">{ev.task_description}</p>}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 pt-0.5">
                              {ev.assigned_to && <span><span className="font-medium text-gray-600">Assigned to:</span> {ev.assigned_to}</span>}
                              {ev.assigned_by && <span><span className="font-medium text-gray-600">By:</span> {ev.assigned_by}</span>}
                              {ev.due_date && <span><span className="font-medium text-gray-600">Due:</span> {fmtDate(ev.due_date)}</span>}
                              {ev.completed_at && <span><span className="font-medium text-gray-600">Completed:</span> {fmtDate(ev.completed_at)}</span>}
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-gray-700 whitespace-pre-wrap">{ev.description}</p>
                            {ev._type === 'escalation' && ev.action_taken && (
                              <div>
                                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Action Taken</p>
                                <p className="text-gray-700 whitespace-pre-wrap">{ev.action_taken}</p>
                              </div>
                            )}
                            {ev._type === 'issue' && ev.next_steps && (
                              <div>
                                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Next Steps</p>
                                <p className="text-gray-700 whitespace-pre-wrap">{ev.next_steps}</p>
                              </div>
                            )}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 pt-0.5">
                              {ev._type === 'escalation' && ev.escalated_by && <span><span className="font-medium text-gray-600">Escalated by:</span> {ev.escalated_by}</span>}
                              {ev._type === 'escalation' && ev.eta && <span><span className="font-medium text-gray-600">ETA:</span> {fmtDate(ev.eta)}</span>}
                              {ev._type === 'escalation' && ev.ps_leader && <span><span className="font-medium text-gray-600">PS Leader:</span> {ev.ps_leader}</span>}
                              {ev._type === 'escalation' && ev.trigger_reason && <span><span className="font-medium text-gray-600">Trigger:</span> {ev.trigger_reason}</span>}
                              {ev._type === 'escalation' && ev.source_of_escalation && <span><span className="font-medium text-gray-600">Source:</span> {ev.source_of_escalation}</span>}
                              {ev._type === 'issue' && ev.owner_team && <span><span className="font-medium text-gray-600">Owner Team:</span> {ev.owner_team}</span>}
                              {ev._type === 'issue' && ev.closure_date && <span><span className="font-medium text-gray-600">Closed:</span> {fmtDate(ev.closure_date)}</span>}
                              {ev._type === 'issue' && (ev.support_ticket || ev.dev_ticket) && (
                                <span className="flex gap-2">
                                  {ev.support_ticket && <span className="font-mono text-blue-600">Support #{ev.support_ticket}</span>}
                                  {ev.dev_ticket && <span className="font-mono text-purple-600">Dev #{ev.dev_ticket}</span>}
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
