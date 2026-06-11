import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';

const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function weekOfMonth(d) {
  return Math.ceil(d.getDate() / 7);
}

function shiftWeek(year, month, week, delta) {
  let y = year, m = month, w = week;
  const abs = Math.abs(delta);
  const dir = delta >= 0 ? 1 : -1;
  for (let i = 0; i < abs; i++) {
    w += dir;
    if (dir > 0) {
      const maxW = Math.ceil(new Date(y, m + 1, 0).getDate() / 7);
      if (w > maxW) { w = 1; m++; if (m > 11) { m = 0; y++; } }
    } else {
      if (w < 1) { m--; if (m < 0) { m = 11; y--; } w = Math.ceil(new Date(y, m + 1, 0).getDate() / 7); }
    }
  }
  return { year: y, month: m, week: w };
}

const WINDOW_SIZE = 5;

function makeWeekWindow(pageOffset) {
  const today = new Date();
  let end = shiftWeek(today.getFullYear(), today.getMonth(), weekOfMonth(today), pageOffset * WINDOW_SIZE);
  const weeks = [];
  let cur = { ...end };
  for (let i = 0; i < WINDOW_SIZE; i++) {
    const startDay = (cur.week - 1) * 7 + 1;
    const daysInMonth = new Date(cur.year, cur.month + 1, 0).getDate();
    const endDay = Math.min(cur.week * 7, daysInMonth);
    weeks.unshift({
      key: `${cur.year}-${cur.month}-${cur.week}`,
      label: `Week ${cur.week} (${MON[cur.month]} ${String(cur.year).slice(2)})`,
      start: new Date(cur.year, cur.month, startDay, 0, 0, 0),
      end:   new Date(cur.year, cur.month, endDay,   23, 59, 59),
    });
    cur = shiftWeek(cur.year, cur.month, cur.week, -1);
  }
  return weeks;
}

function pct(n, d) {
  if (!d) return '—';
  return Math.round(n / d * 100) + '%';
}

function pctColor(n, d) {
  if (!d) return 'text-gray-400';
  const v = n / d;
  if (v >= 0.8) return 'text-green-700';
  if (v >= 0.5) return 'text-amber-600';
  return 'text-red-600';
}

function SectionHeader({ label, colSpan, bg }) {
  return (
    <tr>
      <td colSpan={colSpan}
        className={`px-5 py-2.5 font-bold text-gray-800 text-sm border-b border-gray-200 ${bg}`}>
        {label}
      </td>
    </tr>
  );
}

function Row({ label, values, cls = '', valueCls = 'text-gray-800', bold = false, perCellCls }) {
  return (
    <tr className={`border-b border-gray-100 last:border-b-0 ${cls}`}>
      <td className={`px-5 py-3 border-r border-gray-200 text-sm ${bold ? 'font-bold text-gray-800' : 'text-gray-600'}`}>
        {label}
      </td>
      {values.map((v, i) => (
        <td key={i} className={`text-center px-4 py-3 tabular-nums text-sm border-r border-gray-200 last:border-r-0 ${bold ? 'font-bold' : ''} ${perCellCls ? perCellCls[i] : valueCls}`}>
          {v}
        </td>
      ))}
    </tr>
  );
}

export default function WeeklyEscalationsDashboard() {
  const [accounts,    setAccounts]    = useState([]);
  const [escalations, setEscalations] = useState([]);
  const [issues,      setIssues]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [pageOffset,  setPageOffset]  = useState(0);

  useEffect(() => {
    Promise.all([
      axios.get('/api/accounts'),
      axios.get('/api/escalations'),
      axios.get('/api/issues'),
    ]).then(([accR, escR, issR]) => {
      setAccounts(accR.data || []);
      setEscalations(escR.data || []);
      setIssues(issR.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const weeks = useMemo(() => makeWeekWindow(pageOffset), [pageOffset]);

  const totalCustomers   = accounts.length;
  const ringFenceCovered = accounts.filter(a => a.meeting_done === 'Yes').length;

  const weekEscalations = useMemo(() => weeks.map(w => {
    const count = escalations.filter(e => {
      if (!e.date_of_escalation) return false;
      const d = new Date(e.date_of_escalation);
      return d >= w.start && d <= w.end;
    }).length;
    return { ...w, count };
  }), [weeks, escalations]);

  // Issues pivot: for each week, group by issue_type → {total, resolved}
  const issueTypes = useMemo(() => {
    const inWindow = issues.filter(i => {
      if (!i.reported_date) return false;
      const d = new Date(i.reported_date);
      return d >= weeks[0].start && d <= weeks[weeks.length - 1].end;
    });
    return [...new Set(inWindow.map(i => i.issue_type).filter(Boolean))].sort();
  }, [issues, weeks]);

  const issuePivot = useMemo(() => weeks.map(w => {
    const weekIssues = issues.filter(i => {
      if (!i.reported_date) return false;
      const d = new Date(i.reported_date);
      return d >= w.start && d <= w.end;
    });
    const byType = {};
    for (const t of issueTypes) {
      const ti = weekIssues.filter(i => i.issue_type === t);
      byType[t] = { total: ti.length, resolved: ti.filter(i => i.status === 'Resolved').length };
    }
    const total    = weekIssues.length;
    const resolved = weekIssues.filter(i => i.status === 'Resolved').length;
    return { ...w, byType, total, resolved };
  }), [weeks, issues, issueTypes]);

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const cols = weeks.length + 1;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Weekly View</h1>
          <p className="text-sm text-gray-500 mt-0.5">Coverage, escalations and issue themes by week</p>
        </div>

        {/* Week navigator */}
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setPageOffset(p => p - 1)}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition text-gray-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-sm font-semibold text-gray-700 min-w-[180px] text-center">
            {weekEscalations[0]?.label} – {weekEscalations[weekEscalations.length - 1]?.label}
          </span>
          <button onClick={() => setPageOffset(p => p + 1)}
            disabled={pageOffset >= 0}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
          {pageOffset < 0 && (
            <button onClick={() => setPageOffset(0)} className="text-xs text-brand-600 hover:underline ml-1">Current</button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">Total Accounts</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalCustomers}</p>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
          <p className="text-xs font-medium text-sky-600">Ring Fence Covered</p>
          <p className="text-2xl font-bold text-sky-700 mt-1">{ringFenceCovered}</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-xs font-medium text-green-600">Coverage %</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{pct(ringFenceCovered, totalCustomers)}</p>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
          <p className="text-xs font-medium text-orange-600">This Week Escalations</p>
          <p className="text-2xl font-bold text-orange-700 mt-1">{weekEscalations[weekEscalations.length - 1]?.count ?? '—'}</p>
        </div>
      </div>

      {/* Coverage + Escalation table */}
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left px-5 py-3 font-bold text-gray-700 bg-gray-50 border-r border-gray-200 min-w-[200px]">Description</th>
              {weeks.map(w => (
                <th key={w.key} className="text-center px-4 py-3 font-bold text-gray-700 bg-gray-50 border-r border-gray-200 last:border-r-0 min-w-[120px] whitespace-nowrap">
                  {w.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <SectionHeader label="Coverage Metrics" colSpan={cols} bg="bg-sky-100" />
            <Row label="Total customers"    values={weeks.map(() => totalCustomers)} />
            <Row label="Ring Fence covered" values={weeks.map(() => ringFenceCovered)} />
            <Row label="Overall Coverage %" values={weeks.map(() => pct(ringFenceCovered, totalCustomers))}
              cls="bg-green-50" valueCls="text-green-700" bold />

            <SectionHeader label="Impact Metrics" colSpan={cols} bg="bg-orange-100" />
            <Row label="Escalation during RF"
              values={weekEscalations.map(w => w.count)} />
            <Row label="Post RF Escalation %"
              values={weekEscalations.map(w => pct(w.count, totalCustomers))}
              cls="bg-orange-50" valueCls="text-orange-700" bold />
          </tbody>
        </table>
      </div>

      {/* Thematic Issues table */}
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left px-5 py-3 font-bold text-gray-700 bg-gray-50 border-r border-gray-200 min-w-[200px]">
                Thematic Customer Issues
              </th>
              {weeks.map(w => (
                <th key={w.key} className="text-center px-4 py-3 font-bold text-gray-700 bg-gray-50 border-r border-gray-200 last:border-r-0 min-w-[120px] whitespace-nowrap">
                  {w.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {issueTypes.length === 0 ? (
              <tr>
                <td colSpan={cols} className="px-5 py-6 text-sm text-gray-400 text-center italic">
                  No issues with a reported date in this window.
                </td>
              </tr>
            ) : (
              <>
                {issueTypes.map(type => (
                  <Row
                    key={type}
                    label={type}
                    values={issuePivot.map(w => w.byType[type]?.total || 0)}
                  />
                ))}

                {/* Total issues */}
                <Row
                  label="Total Issues"
                  values={issuePivot.map(w => w.total)}
                  bold
                  cls="border-t-2 border-gray-300"
                />

                {/* Resolved count */}
                <Row
                  label="Resolved"
                  values={issuePivot.map(w => w.resolved)}
                  bold
                />

                {/* Resolved % */}
                <Row
                  label="Resolved %"
                  values={issuePivot.map(w => pct(w.resolved, w.total))}
                  perCellCls={issuePivot.map(w => `font-bold ${pctColor(w.resolved, w.total)}`)}
                  cls="bg-green-50/60"
                  bold
                />
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
