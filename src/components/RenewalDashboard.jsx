import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import SelectDropdown from './SelectDropdown';

const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function parseRenewalDate(str) {
  if (!str) return null;
  const m1 = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m1) {
    const y = m1[3].length === 2 ? 2000 + +m1[3] : +m1[3];
    return new Date(y, +m1[2] - 1, +m1[1]);
  }
  const m2 = str.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
  if (m2) {
    const y = m2[3].length === 2 ? 2000 + +m2[3] : +m2[3];
    const mo = MON.findIndex(n => n.toLowerCase() === m2[2].toLowerCase());
    if (mo >= 0) return new Date(y, mo, +m2[1]);
  }
  return null;
}

const isChurnRisk = a =>
  a.churn_risk === 'Yes' ||
  ['Churn Activated', 'Churn Predicted', 'Churn Executed'].includes(a.churn_status);

const RAG_DOT = { Red: 'bg-red-500', Amber: 'bg-amber-400', Green: 'bg-green-500' };

const SUMMARY_ROWS = [
  { label: 'Total Due for Renewal',  fn: a => a.length,                                                      filterFn: null,                                        cls: 'font-semibold text-gray-800' },
  { label: 'Renewed',                fn: a => a.filter(x => x.renewal_status === 'Renewed').length,          filterFn: x => x.renewal_status === 'Renewed',          cls: 'text-green-700' },
  { label: 'Pending Renewal',        fn: a => a.filter(x => x.renewal_status === 'Renewal Pending').length,  filterFn: x => x.renewal_status === 'Renewal Pending',  cls: 'text-amber-700' },
  null,
  { label: 'Churn Executed',         fn: a => a.filter(x => x.churn_status === 'Churn Executed').length,     filterFn: x => x.churn_status === 'Churn Executed',     cls: 'text-red-800' },
  { label: 'Churn Activated',        fn: a => a.filter(x => x.churn_status === 'Churn Activated').length,    filterFn: x => x.churn_status === 'Churn Activated',    cls: 'text-red-600' },
  { label: 'Churn Predicted',        fn: a => a.filter(x => x.churn_status === 'Churn Predicted').length,    filterFn: x => x.churn_status === 'Churn Predicted',    cls: 'text-orange-600' },
  null,
  { label: 'Contraction Activated',  fn: a => a.filter(x => x.contraction_risk === 'Yes').length,            filterFn: x => x.contraction_risk === 'Yes',            cls: 'text-purple-600' },
];

export default function RenewalDashboard() {
  const [accounts,     setAccounts]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [periodOffset, setPeriodOffset] = useState(0); // each step = 6 months
  const [filterCsm,    setFilterCsm]    = useState('');
  const [filterRag,    setFilterRag]    = useState('');
  const [filterRegion, setFilterRegion] = useState('');

  const desktopRefs = useRef({});
  const mobileRefs  = useRef({});
  const gridRef     = useRef(null);

  useEffect(() => {
    axios.get('/api/accounts')
      .then(r => { setAccounts(Array.isArray(r.data) ? r.data : []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  // Unique values for filter dropdowns
  const csms    = useMemo(() => [...new Set(accounts.map(a => a.csm).filter(Boolean))].sort(), [accounts]);
  const regions = useMemo(() => [...new Set(accounts.map(a => a.region).filter(Boolean))].sort(), [accounts]);

  // Filtered account pool
  const filteredAccounts = useMemo(() => accounts.filter(a => {
    if (filterCsm    && a.csm        !== filterCsm)    return false;
    if (filterRag    && a.rag_status !== filterRag)    return false;
    if (filterRegion && a.region     !== filterRegion) return false;
    return true;
  }), [accounts, filterCsm, filterRag, filterRegion]);

  // 6-month window: default starts 2 months back, shifts by periodOffset * 6
  const months = useMemo(() => {
    const now  = new Date();
    const base = new Date(now.getFullYear(), now.getMonth() - 2 + periodOffset * 6, 1);
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
      return { year: d.getFullYear(), month: d.getMonth(),
               key: `${d.getFullYear()}-${d.getMonth()}`,
               label: `${MON[d.getMonth()]} ${String(d.getFullYear()).slice(2)}` };
    });
  }, [periodOffset]);

  const byMonth = useMemo(() => months.map(m => ({
    ...m,
    accounts: filteredAccounts
      .filter(a => { const d = parseRenewalDate(a.renewal_date); return d && d.getFullYear() === m.year && d.getMonth() === m.month; })
      .sort((a, b) => a.account_name.localeCompare(b.account_name)),
  })), [filteredAccounts, months]);

  const maxRows = Math.max(...byMonth.map(m => m.accounts.length), 0);

  const periodLabel = `${months[0].label} – ${months[5].label}`;

  function handleSummaryClick(monthKey, filterFn) {
    const m = byMonth.find(x => x.key === monthKey);
    if (!m) return;
    const matching = filterFn ? m.accounts.filter(filterFn) : m.accounts;
    if (matching.length === 0) return;
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    matching.forEach((acc, i) => {
      // Flash whichever view is mounted (desktop table cell or mobile card)
      [desktopRefs.current[acc.id], mobileRefs.current[acc.id]].forEach(el => {
        if (!el) return;
        el.classList.remove('flash-card');
        void el.offsetWidth;
        el.classList.add('flash-card');
        setTimeout(() => el.classList.remove('flash-card'), 2100);
      });
      if (i === 0) {
        const visible = [desktopRefs.current[acc.id], mobileRefs.current[acc.id]].find(el => el && el.offsetParent !== null);
        if (visible) setTimeout(() => visible.scrollIntoView({ behavior: 'smooth', block: 'center' }), 350);
      }
    });
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* ── Header row: title + period nav ── */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Renewal Dashboard</h1>

        {/* Period navigator */}
        <div className="flex items-center gap-2">
          <button onClick={() => setPeriodOffset(p => p - 1)}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition text-gray-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-sm font-semibold text-gray-700 min-w-[130px] sm:min-w-[140px] text-center">{periodLabel}</span>
          <button onClick={() => setPeriodOffset(p => p + 1)}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition text-gray-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
          {periodOffset !== 0 && (
            <button onClick={() => setPeriodOffset(0)}
              className="text-xs text-brand-600 hover:underline ml-1">Today</button>
          )}
        </div>
      </div>

      {/* ── Filter row ── */}
      <div className="flex flex-wrap gap-2 sm:gap-3">
        <SelectDropdown
          value={filterCsm}
          onChange={v => setFilterCsm(v ?? '')}
          options={csms}
          placeholder="All CSMs"
          className="w-44"
          compact
        />
        <SelectDropdown
          value={filterRag}
          onChange={v => setFilterRag(v ?? '')}
          options={['Green', 'Amber', 'Red']}
          placeholder="All RAG"
          className="w-36"
          compact
        />
        <SelectDropdown
          value={filterRegion}
          onChange={v => setFilterRegion(v ?? '')}
          options={regions}
          placeholder="All Regions"
          className="w-40"
          compact
        />
        {(filterCsm || filterRag || filterRegion) && (
          <button onClick={() => { setFilterCsm(''); setFilterRag(''); setFilterRegion(''); }}
            className="text-xs text-red-500 hover:text-red-700 hover:underline self-center">
            Clear filters
          </button>
        )}
      </div>

      {/* ── Summary matrix ── */}
      <div className="card overflow-x-auto">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Renewal Summary</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-2 pr-4 sm:pr-8 text-gray-400 font-medium min-w-[150px] sm:min-w-[200px]" />
              {byMonth.map(m => (
                <th key={m.key} className="text-center py-2 px-3 sm:px-4 font-semibold text-gray-700 min-w-[56px] sm:min-w-[72px]">{m.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SUMMARY_ROWS.map((row, i) =>
              row === null ? (
                <tr key={i}><td colSpan={7} className="py-1" /></tr>
              ) : (
                <tr key={i} className="border-b border-gray-100 last:border-0">
                  <td className={`py-2 pr-4 sm:pr-8 ${row.cls}`}>{row.label}</td>
                  {byMonth.map(m => {
                    const val = row.fn(m.accounts);
                    const clickable = val > 0;
                    return (
                      <td key={m.key}
                        className={`text-center py-2 px-3 sm:px-4 font-semibold tabular-nums ${clickable ? `${row.cls} cursor-pointer hover:underline underline-offset-2` : 'text-gray-200'}`}
                        onClick={() => clickable && handleSummaryClick(m.key, row.filterFn)}
                      >
                        {val}
                      </td>
                    );
                  })}
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      {/* ── Accounts by renewal month ── */}
      <div ref={gridRef} className="scroll-mt-20">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Accounts by Renewal Month</h2>

        {/* Desktop: side-by-side month grid */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="border-collapse text-xs w-full">
            <thead>
              <tr>
                {byMonth.map(m => (
                  <th key={m.key} className="bg-gray-700 text-white px-3 py-2.5 text-center font-semibold border-r border-gray-600 last:border-r-0 min-w-[170px]">
                    {m.label}&ensp;<span className="font-normal opacity-60">({m.accounts.length})</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {maxRows === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400 bg-white">
                    No accounts with renewal dates in this period
                  </td>
                </tr>
              ) : (
                Array.from({ length: maxRows }, (_, ri) => (
                  <tr key={ri} className="divide-x divide-gray-200">
                    {byMonth.map(m => {
                      const acc = m.accounts[ri];
                      if (!acc) return <td key={m.key} className="px-2 py-1.5 bg-white border-b border-gray-100" />;
                      const churn = isChurnRisk(acc);
                      return (
                        <td key={m.key}
                          ref={el => { desktopRefs.current[acc.id] = el; }}
                          className={`px-2 py-2 align-top border-b border-gray-100 ${churn ? 'bg-yellow-100' : 'bg-white'}`}>
                          <Link to={`/accounts/${acc.id}`} className="block hover:opacity-75 transition-opacity">
                            <div className="flex items-start gap-1.5">
                              {acc.rag_status && (
                                <span className={`mt-0.5 shrink-0 w-2.5 h-2.5 rounded-full ${RAG_DOT[acc.rag_status] ?? 'bg-gray-300'}`} title={acc.rag_status} />
                              )}
                              <span className={`font-semibold leading-snug ${churn ? 'text-yellow-900' : 'text-gray-800'}`}>
                                {acc.account_name}
                              </span>
                            </div>
                            {acc.churn_status && (
                              <div className="text-red-600 mt-0.5 pl-4">{acc.churn_status}</div>
                            )}
                            {!acc.churn_status && acc.renewal_status && (
                              <div className={`mt-0.5 pl-4 ${acc.renewal_status === 'Renewed' ? 'text-green-600' : 'text-amber-600'}`}>
                                {acc.renewal_status}
                              </div>
                            )}
                          </Link>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile: stacked month sections */}
        <div className="md:hidden space-y-4">
          {maxRows === 0 ? (
            <div className="card text-center py-8 text-gray-400 text-sm">No accounts with renewal dates in this period</div>
          ) : (
            byMonth.filter(m => m.accounts.length > 0).map(m => (
              <div key={m.key}>
                <div className="flex items-center gap-2 mb-2 px-0.5">
                  <h3 className="text-sm font-bold text-gray-700">{m.label}</h3>
                  <span className="text-xs text-gray-400">({m.accounts.length})</span>
                </div>
                <div className="space-y-2">
                  {m.accounts.map(acc => {
                    const churn = isChurnRisk(acc);
                    return (
                      <Link key={acc.id} to={`/accounts/${acc.id}`}
                        ref={el => { mobileRefs.current[acc.id] = el; }}
                        className={`block rounded-xl border p-3 transition active:opacity-80 ${churn ? 'bg-yellow-100 border-yellow-300' : 'bg-white border-gray-200'}`}>
                        <div className="flex items-start gap-2">
                          {acc.rag_status && (
                            <span className={`mt-1 shrink-0 w-2.5 h-2.5 rounded-full ${RAG_DOT[acc.rag_status] ?? 'bg-gray-300'}`} title={acc.rag_status} />
                          )}
                          <div className="min-w-0">
                            <p className={`text-sm font-semibold ${churn ? 'text-yellow-900' : 'text-gray-800'}`}>{acc.account_name}</p>
                            <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-xs">
                              {acc.churn_status && <span className="text-red-600 font-medium">{acc.churn_status}</span>}
                              {!acc.churn_status && acc.renewal_status && (
                                <span className={acc.renewal_status === 'Renewed' ? 'text-green-600 font-medium' : 'text-amber-600 font-medium'}>{acc.renewal_status}</span>
                              )}
                              {acc.csm && <span className="text-gray-400">· {acc.csm}</span>}
                              {acc.renewal_date && <span className="text-gray-400">· {acc.renewal_date}</span>}
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded bg-yellow-100 border border-yellow-300" />
            Yellow = churn risk flagged
          </span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> Green</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Amber</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Red</span>
        </div>
      </div>
    </div>
  );
}
