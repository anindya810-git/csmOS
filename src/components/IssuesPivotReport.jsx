import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import MultiSelectDropdown from './MultiSelectDropdown';

const STATUS_STYLE = {
  Resolved:      'bg-green-100 text-green-700',
  'In Progress': 'bg-amber-100 text-amber-700',
  Open:          'bg-red-100 text-red-700',
};

const PRIORITY_STYLE = (p) => {
  if (p === 'P1' || p === 'High')   return 'bg-red-50 text-red-600 border-red-200';
  if (p === 'P2' || p === 'Medium') return 'bg-amber-50 text-amber-600 border-amber-200';
  return 'bg-gray-50 text-gray-500 border-gray-200';
};

function fmtDate(s) {
  if (!s) return null;
  try { return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return s; }
}

export default function IssuesPivotReport() {
  const [issues,  setIssues]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [csms,    setCsms]    = useState([]);

  const [filterCsm,      setFilterCsm]      = useState('');
  const [filterStatus,   setFilterStatus]   = useState([]);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo,   setFilterDateTo]   = useState('');

  const [expandedTypes,    setExpandedTypes]    = useState(new Set());
  const [expandedSubTypes, setExpandedSubTypes] = useState(new Set());

  useEffect(() => {
    setLoading(true);
    axios.get('/api/issues')
      .then(r => {
        const data = r.data || [];
        setIssues(data);
        setCsms([...new Set(data.map(i => i.csm).filter(Boolean))].sort());
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => issues.filter(i => {
    if (filterCsm                && i.csm    !== filterCsm)              return false;
    if (filterStatus.length > 0  && !filterStatus.includes(i.status))   return false;
    if (filterDateFrom && i.reported_date && i.reported_date < filterDateFrom) return false;
    if (filterDateTo   && i.reported_date && i.reported_date > filterDateTo)   return false;
    return true;
  }), [issues, filterCsm, filterStatus, filterDateFrom, filterDateTo]);

  const pivot = useMemo(() => {
    const map = {};
    for (const issue of filtered) {
      const type    = issue.issue_type     || '(No Type)';
      const subType = issue.issue_sub_type || '(No Sub-Type)';
      if (!map[type]) map[type] = { count: 0, subTypes: {} };
      map[type].count++;
      if (!map[type].subTypes[subType]) map[type].subTypes[subType] = { count: 0, issues: [] };
      map[type].subTypes[subType].count++;
      map[type].subTypes[subType].issues.push(issue);
    }
    return Object.entries(map)
      .sort(([, a], [, b]) => b.count - a.count)
      .map(([type, { count, subTypes }]) => ({
        type,
        count,
        subTypes: Object.entries(subTypes)
          .sort(([, a], [, b]) => b.count - a.count)
          .map(([subType, { count: sc, issues: iss }]) => ({
            subType, count: sc,
            issues: [...iss].sort((a, b) => (b.reported_date || '').localeCompare(a.reported_date || '')),
          })),
      }));
  }, [filtered]);

  const toggleType    = (t) => setExpandedTypes(s => { const n = new Set(s); n.has(t) ? n.delete(t) : n.add(t); return n; });
  const toggleSubType = (k) => setExpandedSubTypes(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  const allExpanded = pivot.length > 0 && pivot.every(r => expandedTypes.has(r.type));
  const toggleAll   = () => {
    if (allExpanded) { setExpandedTypes(new Set()); setExpandedSubTypes(new Set()); }
    else             { setExpandedTypes(new Set(pivot.map(r => r.type))); }
  };

  const clearFilters = () => { setFilterCsm(''); setFilterStatus([]); setFilterDateFrom(''); setFilterDateTo(''); };
  const hasFilters   = !!(filterCsm || filterStatus.length || filterDateFrom || filterDateTo);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[150px]">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">CSM</p>
            <select value={filterCsm} onChange={e => setFilterCsm(e.target.value)} className="!py-1.5 text-sm">
              <option value="">All CSMs</option>
              {csms.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Status</p>
            <MultiSelectDropdown
              placeholder="All Statuses"
              options={['Open','In Progress','Deferred','Resolved','Closed']}
              value={filterStatus}
              onChange={setFilterStatus}
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Reported From</p>
            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="!py-1.5 text-sm" />
          </div>
          <div className="flex-1 min-w-[140px]">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Reported To</p>
            <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="!py-1.5 text-sm" />
          </div>
          {hasFilters && (
            <button onClick={clearFilters}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition">
              Clear
            </button>
          )}
        </div>
        <p className="text-xs text-gray-400">
          {filtered.length} issue{filtered.length !== 1 ? 's' : ''}{hasFilters ? ` of ${issues.length}` : ''}
          {' · '}{pivot.length} issue type{pivot.length !== 1 ? 's' : ''}
        </p>
      </div>

      {loading ? (
        <div className="card py-16 text-center text-gray-400">Loading…</div>
      ) : pivot.length === 0 ? (
        <div className="card py-16 text-center text-gray-400">No issues match the selected filters.</div>
      ) : (
        <div className="card p-0 overflow-hidden">
          {/* Table header */}
          <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
            <button onClick={toggleAll}
              className="text-xs text-brand-600 hover:underline font-medium shrink-0">
              {allExpanded ? 'Collapse all' : 'Expand all'}
            </button>
            <span className="flex-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Issue Type / Sub-Type / Issue
            </span>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-14 text-right">Count</span>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-16 text-right pr-1">Share</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-gray-50">
            {pivot.map(({ type, count, subTypes }) => {
              const isOpen = expandedTypes.has(type);
              const pct    = filtered.length ? Math.round((count / filtered.length) * 100) : 0;

              return (
                <div key={type}>
                  {/* Level 1 — Issue Type */}
                  <button type="button" onClick={() => toggleType(type)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left">
                    <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="flex-1 text-sm font-semibold text-gray-800">{type}</span>
                    <span className="text-sm font-bold text-gray-700 w-14 text-right">{count}</span>
                    <div className="flex items-center gap-1.5 w-16 justify-end">
                      <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden max-w-[36px]">
                        <div className="bg-brand-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 w-7 text-right">{pct}%</span>
                    </div>
                  </button>

                  {/* Level 2 — Sub-Types */}
                  {isOpen && (
                    <div className="bg-gray-50/40">
                      {subTypes.map(({ subType, count: sc, issues: iss }) => {
                        const subKey  = `${type}::${subType}`;
                        const isSubOpen = expandedSubTypes.has(subKey);
                        const subPct  = filtered.length ? Math.round((sc / filtered.length) * 100) : 0;

                        return (
                          <div key={subType}>
                            {/* Level 2 row */}
                            <button type="button" onClick={() => toggleSubType(subKey)}
                              className="w-full flex items-center gap-3 pl-11 pr-4 py-2.5 hover:bg-gray-100/70 transition text-left">
                              <svg className={`w-3.5 h-3.5 text-gray-300 shrink-0 transition-transform ${isSubOpen ? 'rotate-90' : ''}`}
                                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <span className="flex-1 text-sm text-gray-600">{subType}</span>
                              <span className="text-sm font-medium text-gray-600 w-14 text-right">{sc}</span>
                              <div className="flex items-center gap-1.5 w-16 justify-end">
                                <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden max-w-[36px]">
                                  <div className="bg-brand-400 h-full rounded-full" style={{ width: `${subPct}%` }} />
                                </div>
                                <span className="text-xs text-gray-400 w-7 text-right">{subPct}%</span>
                              </div>
                            </button>

                            {/* Level 3 — Individual issues */}
                            {isSubOpen && (
                              <div className="border-y border-gray-100 bg-white">
                                {iss.map(issue => (
                                  <div key={issue.id}
                                    className="flex items-start gap-3 pl-16 pr-4 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/40 transition">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm text-gray-700 leading-snug">{issue.description}</p>
                                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-400">
                                        {issue.account_name && <span className="font-medium text-gray-500">{issue.account_name}</span>}
                                        {issue.csm         && <span>CSM: {issue.csm}</span>}
                                        {issue.reported_date && <span>{fmtDate(issue.reported_date)}</span>}
                                        {issue.support_ticket && <span className="font-mono">Support #{issue.support_ticket}</span>}
                                        {issue.dev_ticket     && <span className="font-mono">Dev #{issue.dev_ticket}</span>}
                                      </div>
                                    </div>
                                    <div className="shrink-0 flex items-center gap-1.5 mt-0.5">
                                      {issue.priority && (
                                        <span className={`text-xs px-1.5 py-0.5 rounded border ${PRIORITY_STYLE(issue.priority)}`}>
                                          {issue.priority}
                                        </span>
                                      )}
                                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[issue.status] || 'bg-gray-100 text-gray-600'}`}>
                                        {issue.status}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-t border-gray-100">
            <span className="flex-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</span>
            <span className="text-sm font-bold text-gray-800 w-14 text-right">{filtered.length}</span>
            <span className="text-xs text-gray-400 w-16 text-right pr-1">100%</span>
          </div>
        </div>
      )}
    </div>
  );
}
