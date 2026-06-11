import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';

function fmt(n) {
  if (!n) return '—';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString()}`;
}

const RAG_DOT = {
  Green: 'bg-green-500',
  Amber: 'bg-amber-400',
  Red:   'bg-red-500',
};

export default function AccountMappingReport() {
  const [accounts, setAccounts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [sortField, setSortField] = useState('total_mrr');
  const [sortDir,   setSortDir]   = useState('desc');

  useEffect(() => {
    axios.get('/api/accounts')
      .then(r => setAccounts(r.data || []))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => {
    const map = {};
    for (const a of accounts) {
      const csm = a.csm || '(Unassigned)';
      if (!map[csm]) map[csm] = { csm, count: 0, total_mrr: 0, green: 0, amber: 0, red: 0, unset: 0 };
      map[csm].count++;
      map[csm].total_mrr += a.mrr || 0;
      if (a.rag_status === 'Green')      map[csm].green++;
      else if (a.rag_status === 'Amber') map[csm].amber++;
      else if (a.rag_status === 'Red')   map[csm].red++;
      else                               map[csm].unset++;
    }
    const list = Object.values(map).map(r => ({ ...r, avg_mrr: r.count ? r.total_mrr / r.count : 0 }));

    list.sort((a, b) => {
      const va = a[sortField], vb = b[sortField];
      if (sortDir === 'asc') return va > vb ? 1 : va < vb ? -1 : 0;
      return va < vb ? 1 : va > vb ? -1 : 0;
    });
    return list;
  }, [accounts, sortField, sortDir]);

  const totals = useMemo(() => ({
    count:     accounts.length,
    total_mrr: accounts.reduce((s, a) => s + (a.mrr || 0), 0),
    green:     accounts.filter(a => a.rag_status === 'Green').length,
    amber:     accounts.filter(a => a.rag_status === 'Amber').length,
    red:       accounts.filter(a => a.rag_status === 'Red').length,
    unset:     accounts.filter(a => !a.rag_status).length,
  }), [accounts]);

  const maxMrr = rows.length ? rows[0].total_mrr || 1 : 1;

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const Th = ({ field, children, right }) => (
    <th
      onClick={() => handleSort(field)}
      className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700 transition select-none whitespace-nowrap
        ${right ? 'text-right' : 'text-left'}`}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortField === field && (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d={sortDir === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
          </svg>
        )}
      </span>
    </th>
  );

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Total Accounts</p>
          <p className="text-2xl font-bold text-gray-900 mt-0.5">{totals.count}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Total MRR</p>
          <p className="text-2xl font-bold text-gray-900 mt-0.5">{fmt(totals.total_mrr)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">CSMs</p>
          <p className="text-2xl font-bold text-gray-900 mt-0.5">{rows.filter(r => r.csm !== '(Unassigned)').length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">RAG at Risk</p>
          <p className="text-2xl font-bold text-red-600 mt-0.5">{totals.amber + totals.red}</p>
          <p className="text-xs text-gray-400 mt-0.5">{totals.amber} amber · {totals.red} red</p>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <Th field="csm">CSM</Th>
              <Th field="count" right>Accounts</Th>
              <Th field="total_mrr" right>Total MRR</Th>
              <Th field="avg_mrr" right>Avg MRR</Th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">MRR Share</th>
              <Th field="green" right>Green</Th>
              <Th field="amber" right>Amber</Th>
              <Th field="red" right>Red</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map(r => (
              <tr key={r.csm} className="hover:bg-gray-50 transition">
                <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">
                  {r.csm}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-700">{r.count}</td>
                <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-800 whitespace-nowrap">
                  {fmt(r.total_mrr)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-500 whitespace-nowrap">
                  {fmt(r.avg_mrr)}
                </td>
                <td className="px-4 py-3 w-40">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-brand-500 h-full rounded-full"
                        style={{ width: `${maxMrr ? Math.round((r.total_mrr / maxMrr) * 100) : 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-8 text-right tabular-nums">
                      {totals.total_mrr ? Math.round((r.total_mrr / totals.total_mrr) * 100) : 0}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {r.green > 0 ? <span className="text-green-700 font-medium">{r.green}</span> : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {r.amber > 0 ? <span className="text-amber-600 font-medium">{r.amber}</span> : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {r.red > 0 ? <span className="text-red-600 font-medium">{r.red}</span> : <span className="text-gray-300">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-gray-200 bg-gray-50">
            <tr>
              <td className="px-4 py-3 font-bold text-gray-800">Total</td>
              <td className="px-4 py-3 text-right font-bold tabular-nums text-gray-800">{totals.count}</td>
              <td className="px-4 py-3 text-right font-bold tabular-nums text-gray-800 whitespace-nowrap">{fmt(totals.total_mrr)}</td>
              <td className="px-4 py-3 text-right tabular-nums text-gray-500 whitespace-nowrap">
                {fmt(totals.count ? totals.total_mrr / totals.count : 0)}
              </td>
              <td className="px-4 py-3" />
              <td className="px-4 py-3 text-right font-bold text-green-700 tabular-nums">{totals.green || '—'}</td>
              <td className="px-4 py-3 text-right font-bold text-amber-600 tabular-nums">{totals.amber || '—'}</td>
              <td className="px-4 py-3 text-right font-bold text-red-600 tabular-nums">{totals.red || '—'}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
