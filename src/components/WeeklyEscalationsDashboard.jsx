import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
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

// pageOffset 0 → most recent WINDOW_SIZE weeks; -1 → previous page; etc.
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

function Row({ label, values, cls = '', valueCls = 'text-gray-800', bold = false }) {
  return (
    <tr className={`border-b border-gray-100 last:border-b-0 ${cls}`}>
      <td className={`px-5 py-3 border-r border-gray-200 text-sm ${bold ? 'font-bold text-gray-800' : 'text-gray-600'}`}>
        {label}
      </td>
      {values.map((v, i) => (
        <td key={i} className={`text-center px-4 py-3 tabular-nums text-sm border-r border-gray-200 last:border-r-0 ${bold ? 'font-bold' : ''} ${valueCls}`}>
          {v}
        </td>
      ))}
    </tr>
  );
}

export default function WeeklyEscalationsDashboard() {
  const [accounts,    setAccounts]    = useState([]);
  const [escalations, setEscalations] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [pageOffset,  setPageOffset]  = useState(0);

  useEffect(() => {
    Promise.all([
      axios.get('/api/accounts'),
      axios.get('/api/escalations'),
    ]).then(([accR, escR]) => {
      setAccounts(accR.data || []);
      setEscalations(escR.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const weeks = useMemo(() => makeWeekWindow(pageOffset), [pageOffset]);

  const totalCustomers   = accounts.length;
  const ringFenceCovered = accounts.filter(a => a.meeting_done === 'Yes').length;

  const weekData = useMemo(() => weeks.map(w => {
    const count = escalations.filter(e => {
      if (!e.date_of_escalation) return false;
      const d = new Date(e.date_of_escalation);
      return d >= w.start && d <= w.end;
    }).length;
    return { ...w, escalations: count };
  }), [weeks, escalations]);

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const cols = weekData.length + 1; // label col + week cols

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/escalations" className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Weekly Escalations</h1>
            <p className="text-sm text-gray-500 mt-0.5">Coverage and impact metrics by week</p>
          </div>
        </div>

        {/* Week navigator */}
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setPageOffset(p => p - 1)}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition text-gray-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-sm font-semibold text-gray-700 min-w-[150px] text-center">
            {weekData[0]?.label} – {weekData[weekData.length - 1]?.label}
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
          <p className="text-2xl font-bold text-orange-700 mt-1">{weekData[weekData.length - 1]?.escalations ?? '—'}</p>
        </div>
      </div>

      {/* Main table */}
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left px-5 py-3 font-bold text-gray-700 bg-gray-50 border-r border-gray-200 min-w-[200px]">
                Description
              </th>
              {weekData.map(w => (
                <th key={w.key}
                  className="text-center px-4 py-3 font-bold text-gray-700 bg-gray-50 border-r border-gray-200 last:border-r-0 min-w-[120px] whitespace-nowrap">
                  {w.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Coverage section */}
            <SectionHeader label="Coverage Metrics" colSpan={cols} bg="bg-sky-100" />

            <Row
              label="Total customers"
              values={weekData.map(() => totalCustomers)}
            />
            <Row
              label="Ring Fence covered"
              values={weekData.map(() => ringFenceCovered)}
            />
            <Row
              label="Overall Coverage %"
              values={weekData.map(() => pct(ringFenceCovered, totalCustomers))}
              cls="bg-green-50"
              valueCls="text-green-700"
              bold
            />

            {/* Impact section */}
            <SectionHeader label="Impact Metrics" colSpan={cols} bg="bg-orange-100" />

            <Row
              label="Escalation during RF"
              values={weekData.map(w => w.escalations)}
            />
            <Row
              label="Post RF Escalation %"
              values={weekData.map(w => pct(w.escalations, totalCustomers))}
              cls="bg-orange-50"
              valueCls="text-orange-700"
              bold
            />
          </tbody>
        </table>
      </div>

      {/* Weekly escalation breakdown */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Escalations per week</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {weekData.map(w => (
            <div key={w.key} className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-center">
              <p className="text-xs text-gray-500 mb-1 leading-tight">{w.label}</p>
              <p className={`text-2xl font-bold ${w.escalations > 0 ? 'text-orange-600' : 'text-gray-300'}`}>{w.escalations}</p>
              <p className="text-xs text-gray-400 mt-0.5">{pct(w.escalations, totalCustomers)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
