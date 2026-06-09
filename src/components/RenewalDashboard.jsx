import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function parseRenewalDate(str) {
  if (!str) return null;
  // DD/MM/YY or DD/MM/YYYY
  const m1 = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m1) {
    const y = m1[3].length === 2 ? 2000 + +m1[3] : +m1[3];
    return new Date(y, +m1[2] - 1, +m1[1]);
  }
  // DD-Mon-YY like "18-Apr-26"
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

const SUMMARY_ROWS = [
  { label: 'Total Due for Renewal',  fn: a => a.length,                                                       cls: 'font-semibold text-gray-800' },
  { label: 'Renewed',                fn: a => a.filter(x => x.renewal_status === 'Renewed').length,           cls: 'text-green-700' },
  { label: 'Pending Renewal',        fn: a => a.filter(x => x.renewal_status === 'Renewal Pending').length,   cls: 'text-amber-700' },
  null,
  { label: 'Churn Executed',         fn: a => a.filter(x => x.churn_status === 'Churn Executed').length,      cls: 'text-red-800' },
  { label: 'Churn Activated',        fn: a => a.filter(x => x.churn_status === 'Churn Activated').length,     cls: 'text-red-600' },
  { label: 'Churn Predicted',        fn: a => a.filter(x => x.churn_status === 'Churn Predicted').length,     cls: 'text-orange-600' },
  null,
  { label: 'Contraction Activated',  fn: a => a.filter(x => x.contraction_risk === 'Yes').length,             cls: 'text-purple-600' },
];

export default function RenewalDashboard() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    axios.get('/api/accounts')
      .then(r => { setAccounts(Array.isArray(r.data) ? r.data : []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  // 6-month window: 2 months back → 3 months ahead
  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 2 + i, 1);
      return { year: d.getFullYear(), month: d.getMonth(), key: `${d.getFullYear()}-${d.getMonth()}`,
               label: `${MON[d.getMonth()]} ${String(d.getFullYear()).slice(2)}` };
    });
  }, []);

  const byMonth = useMemo(() => months.map(m => ({
    ...m,
    accounts: accounts
      .filter(a => { const d = parseRenewalDate(a.renewal_date); return d && d.getFullYear() === m.year && d.getMonth() === m.month; })
      .sort((a, b) => a.account_name.localeCompare(b.account_name)),
  })), [accounts, months]);

  const maxRows = Math.max(...byMonth.map(m => m.accounts.length), 0);

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-800">Renewal Dashboard</h1>

      {/* ── Summary matrix ── */}
      <div className="card overflow-x-auto">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Renewal Summary</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-2 pr-8 text-gray-400 font-medium min-w-[200px]" />
              {byMonth.map(m => (
                <th key={m.key} className="text-center py-2 px-4 font-semibold text-gray-700 min-w-[72px]">{m.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SUMMARY_ROWS.map((row, i) =>
              row === null ? (
                <tr key={i}><td colSpan={7} className="py-1" /></tr>
              ) : (
                <tr key={i} className="border-b border-gray-100 last:border-0">
                  <td className={`py-2 pr-8 ${row.cls}`}>{row.label}</td>
                  {byMonth.map(m => {
                    const val = row.fn(m.accounts);
                    return (
                      <td key={m.key} className={`text-center py-2 px-4 font-semibold tabular-nums ${val > 0 ? row.cls : 'text-gray-200'}`}>
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

      {/* ── Account grid by month ── */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Accounts by Renewal Month</h2>
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
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
                        <td key={m.key} className={`px-2 py-2 align-top border-b border-gray-100 ${churn ? 'bg-yellow-100' : 'bg-white'}`}>
                          <Link to={`/accounts/${acc.id}`} className="block hover:opacity-75 transition-opacity">
                            <div className={`font-semibold leading-snug ${churn ? 'text-yellow-900' : 'text-gray-800'}`}>
                              {acc.account_name}
                            </div>
                            {acc.churn_status && (
                              <div className="text-red-600 mt-0.5">{acc.churn_status}</div>
                            )}
                            {!acc.churn_status && acc.renewal_status && (
                              <div className={`mt-0.5 ${acc.renewal_status === 'Renewed' ? 'text-green-600' : 'text-amber-600'}`}>
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
        <p className="mt-2 text-xs text-gray-400 flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-yellow-100 border border-yellow-300" />
          Yellow = churn_risk flagged or churn status activated/predicted/executed
        </p>
      </div>
    </div>
  );
}
