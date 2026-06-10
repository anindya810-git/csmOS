import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const RAG_ORDER  = ['Red', 'Amber', 'Green'];
const RAG_CONFIG = {
  Red:   { bg: 'bg-red-50',    border: 'border-red-200',   dot: 'bg-red-500',   badge: 'bg-red-100 text-red-800',   label: 'Red'   },
  Amber: { bg: 'bg-amber-50',  border: 'border-amber-200', dot: 'bg-amber-400', badge: 'bg-amber-100 text-amber-800', label: 'Amber' },
  Green: { bg: 'bg-green-50',  border: 'border-green-200', dot: 'bg-green-500', badge: 'bg-green-100 text-green-800', label: 'Green' },
};

export default function RAGDashboard() {
  const [accounts,     setAccounts]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [activeRag,    setActiveRag]    = useState('');   // '' = all
  const [filterCsm,    setFilterCsm]    = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  const [search,       setSearch]       = useState('');

  useEffect(() => {
    axios.get('/api/accounts')
      .then(r => { setAccounts(Array.isArray(r.data) ? r.data : []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const csms    = useMemo(() => [...new Set(accounts.map(a => a.csm).filter(Boolean))].sort(), [accounts]);
  const regions = useMemo(() => [...new Set(accounts.map(a => a.region).filter(Boolean))].sort(), [accounts]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return accounts.filter(a => {
      if (activeRag    && a.rag_status !== activeRag)    return false;
      if (filterCsm    && a.csm        !== filterCsm)    return false;
      if (filterRegion && a.region     !== filterRegion) return false;
      if (q && !a.account_name.toLowerCase().includes(q) &&
               !(a.rag_reason   || '').toLowerCase().includes(q) &&
               !(a.actions_taken || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [accounts, activeRag, filterCsm, filterRegion, search]);

  // Group for display: Red → Amber → Green
  const grouped = useMemo(() => {
    const order = activeRag ? [activeRag] : RAG_ORDER;
    return order.map(rag => ({
      rag,
      items: filtered.filter(a => a.rag_status === rag).sort((a, b) => a.account_name.localeCompare(b.account_name)),
    })).filter(g => g.items.length > 0);
  }, [filtered, activeRag]);

  // Summary counts (unfiltered by rag tab so the KPI cards always show totals)
  const summary = useMemo(() => {
    const base = accounts.filter(a => {
      if (filterCsm    && a.csm    !== filterCsm)    return false;
      if (filterRegion && a.region !== filterRegion) return false;
      return true;
    });
    return RAG_ORDER.map(r => ({
      rag:   r,
      count: base.filter(a => a.rag_status === r).length,
      mrr:   base.filter(a => a.rag_status === r).reduce((s, a) => s + (a.mrr || 0), 0),
    }));
  }, [accounts, filterCsm, filterRegion]);

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <h1 className="text-2xl font-bold text-gray-800">RAG Dashboard</h1>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-3 gap-4">
        {summary.map(({ rag, count, mrr }) => {
          const cfg = RAG_CONFIG[rag];
          return (
            <button key={rag}
              onClick={() => setActiveRag(a => a === rag ? '' : rag)}
              className={`card text-left transition ring-2 ${activeRag === rag ? 'ring-gray-400' : 'ring-transparent'} hover:shadow-md`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-3 h-3 rounded-full ${cfg.dot}`} />
                <span className="text-sm font-semibold text-gray-700">{rag}</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{count}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                ₹{(mrr / 100000).toFixed(1)}L MRR
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text" placeholder="Search accounts, reasons, actions…"
          value={search} onChange={e => setSearch(e.target.value)}
          className="!w-full sm:!w-64 text-sm"
        />
        <select value={filterCsm} onChange={e => setFilterCsm(e.target.value)}
          className="!w-auto text-sm border border-gray-200 rounded-lg px-3 py-1.5">
          <option value="">All CSMs</option>
          {csms.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterRegion} onChange={e => setFilterRegion(e.target.value)}
          className="!w-auto text-sm border border-gray-200 rounded-lg px-3 py-1.5">
          <option value="">All Regions</option>
          {regions.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        {(filterCsm || filterRegion || activeRag || search) && (
          <button onClick={() => { setFilterCsm(''); setFilterRegion(''); setActiveRag(''); setSearch(''); }}
            className="text-xs text-red-500 hover:text-red-700 hover:underline">
            Clear all
          </button>
        )}
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} accounts</span>
      </div>

      {/* ── Account list grouped by RAG ── */}
      <div className="space-y-6">
        {grouped.length === 0 && (
          <div className="text-center py-12 text-gray-400">No accounts match the current filters</div>
        )}
        {grouped.map(({ rag, items }) => {
          const cfg = RAG_CONFIG[rag];
          return (
            <div key={rag}>
              {/* Group header */}
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-3 h-3 rounded-full ${cfg.dot}`} />
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">{rag}</h2>
                <span className="text-xs text-gray-400">({items.length})</span>
              </div>

              <div className="space-y-2">
                {items.map(acc => (
                  <div key={acc.id} className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4`}>
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                      {/* Account name + meta */}
                      <div>
                        <Link to={`/accounts/${acc.id}`}
                          className="text-sm font-bold text-gray-900 hover:text-brand-700 transition">
                          {acc.account_name}
                        </Link>
                        <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500">
                          {acc.csm    && <span>CSM: <span className="font-medium text-gray-700">{acc.csm}</span></span>}
                          {acc.region && <span>· Region: <span className="font-medium text-gray-700">{acc.region}</span></span>}
                          {acc.mrr    > 0 && <span>· MRR: <span className="font-medium text-gray-700">₹{(acc.mrr / 100000).toFixed(1)}L</span></span>}
                          {acc.renewal_date && <span>· Renewal: <span className="font-medium text-gray-700">{acc.renewal_date}</span></span>}
                        </div>
                      </div>
                      {/* Badges */}
                      <div className="flex flex-wrap gap-1.5 shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>{rag}</span>
                        {acc.churn_status && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">{acc.churn_status}</span>
                        )}
                        {acc.renewal_status && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">{acc.renewal_status}</span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {/* RAG Reason */}
                      <div>
                        <p className="font-semibold text-gray-500 uppercase tracking-wide mb-1">RAG Reason</p>
                        <p className="text-gray-700 leading-relaxed">
                          {acc.rag_reason || <span className="italic text-gray-400">Not specified</span>}
                        </p>
                      </div>
                      {/* Next Steps */}
                      <div>
                        <p className="font-semibold text-gray-500 uppercase tracking-wide mb-1">Next Steps / Actions</p>
                        <p className="text-gray-700 leading-relaxed">
                          {acc.actions_taken || <span className="italic text-gray-400">No actions recorded</span>}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
