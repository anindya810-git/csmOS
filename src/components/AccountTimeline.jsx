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

function fmtDate(s) {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return s; }
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
  const [loading,     setLoading]     = useState(true);
  const [expanded,    setExpanded]    = useState(null);
  const [filter,      setFilter]      = useState('all'); // all | escalation | issue

  useEffect(() => {
    Promise.all([
      axios.get(`/api/accounts/${id}`),
      axios.get(`/api/escalations?account_id=${id}`),
      axios.get(`/api/issues?account_id=${id}`),
    ]).then(([acc, esc, iss]) => {
      setAccount(acc.data);
      setEscalations(esc.data || []);
      setIssues(iss.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const groups = useMemo(() => {
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
    ]
      .filter(ev => filter === 'all' || ev._type === filter)
      .sort((a, b) => b._sortDate - a._sortDate);

    const result = [];
    let lastMonth = null;
    for (const item of raw) {
      const mk = monthLabel(item._dateStr);
      if (mk !== lastMonth) { result.push({ kind: 'month', label: mk }); lastMonth = mk; }
      result.push({ kind: 'event', data: item });
    }
    return result;
  }, [escalations, issues, filter]);

  const total = escalations.length + issues.length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate(`/accounts/${id}`)}
          className="mt-1 text-gray-400 hover:text-gray-600 transition shrink-0"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{account?.account_name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">Activity Timeline · {total} event{total !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Filter + summary row */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: 'all',        label: `All (${total})` },
          { key: 'escalation', label: `Escalations (${escalations.length})` },
          { key: 'issue',      label: `Issues (${issues.length})` },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${
              filter === f.key
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <svg className="w-10 h-10 mx-auto mb-3 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-medium">No activity recorded yet</p>
          <p className="text-sm mt-1">Escalations and issues will appear here as a timeline.</p>
        </div>
      ) : (
        <div className="relative pb-4">
          {/* Vertical rail */}
          <div className="absolute left-[15px] top-3 bottom-3 w-0.5 bg-gray-200 rounded-full" />

          <div className="space-y-1">
            {groups.map((row, idx) => {
              if (row.kind === 'month') {
                return (
                  <div key={`m-${idx}`} className="relative pl-14 py-2 first:pt-0">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{row.label}</span>
                  </div>
                );
              }

              const ev   = row.data;
              const isEsc = ev._type === 'escalation';
              const key   = `${ev._type}-${ev.id}`;
              const open  = expanded === key;

              return (
                <div key={key} className="relative pl-14 pb-2">
                  {/* Timeline dot */}
                  <div className={`absolute left-[11px] top-4 w-[9px] h-[9px] rounded-full border-2 border-white z-10 shadow-sm ${isEsc ? 'bg-red-500' : 'bg-purple-500'}`} />

                  <div className="card !p-0 overflow-hidden">
                    <button
                      type="button"
                      className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50/80 transition text-left"
                      onClick={() => setExpanded(open ? null : key)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${isEsc ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-700'}`}>
                            {isEsc ? 'Escalation' : 'Issue'}
                          </span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[ev.status] || 'bg-gray-100 text-gray-700'}`}>
                            {ev.status || 'Open'}
                          </span>
                          {!isEsc && ev.priority && (
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
                        </div>
                        <p className="text-sm text-gray-800 line-clamp-2">{ev.description}</p>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400">
                          <span>{fmtDate(ev._dateStr)}</span>
                          {ev.csm && <span>CSM: {ev.csm}</span>}
                          {isEsc && ev.ownership && <span>Owner: {ev.ownership}</span>}
                          {!isEsc && ev.issue_type && (
                            <span>{ev.issue_type}{ev.issue_sub_type ? ` › ${ev.issue_sub_type}` : ''}</span>
                          )}
                        </div>
                      </div>
                      <svg className={`w-4 h-4 text-gray-300 shrink-0 mt-1 transition-transform ${open ? '' : '-rotate-90'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {open && (
                      <div className="px-4 pb-4 pt-2 bg-gray-50 border-t border-gray-100 text-sm space-y-2.5">
                        <p className="text-gray-700 whitespace-pre-wrap">{ev.description}</p>

                        {isEsc && ev.action_taken && (
                          <div>
                            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Action Taken</p>
                            <p className="text-gray-700 whitespace-pre-wrap">{ev.action_taken}</p>
                          </div>
                        )}
                        {!isEsc && ev.next_steps && (
                          <div>
                            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Next Steps</p>
                            <p className="text-gray-700 whitespace-pre-wrap">{ev.next_steps}</p>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 pt-0.5">
                          {isEsc && ev.escalated_by && <span><span className="font-medium text-gray-600">Escalated by:</span> {ev.escalated_by}</span>}
                          {isEsc && ev.eta && <span><span className="font-medium text-gray-600">ETA:</span> {fmtDate(ev.eta)}</span>}
                          {isEsc && ev.ps_leader && <span><span className="font-medium text-gray-600">PS Leader:</span> {ev.ps_leader}</span>}
                          {isEsc && ev.trigger_reason && <span><span className="font-medium text-gray-600">Trigger:</span> {ev.trigger_reason}</span>}
                          {isEsc && ev.source_of_escalation && <span><span className="font-medium text-gray-600">Source:</span> {ev.source_of_escalation}</span>}
                          {!isEsc && ev.owner_team && <span><span className="font-medium text-gray-600">Owner Team:</span> {ev.owner_team}</span>}
                          {!isEsc && ev.closure_date && <span><span className="font-medium text-gray-600">Closed:</span> {fmtDate(ev.closure_date)}</span>}
                          {!isEsc && (ev.support_ticket || ev.dev_ticket) && (
                            <span className="flex gap-2">
                              {ev.support_ticket && <span className="font-mono text-blue-600">Support #{ev.support_ticket}</span>}
                              {ev.dev_ticket && <span className="font-mono text-purple-600">Dev #{ev.dev_ticket}</span>}
                            </span>
                          )}
                        </div>
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
