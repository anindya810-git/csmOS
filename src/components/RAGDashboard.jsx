import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import MultiSelectDropdown from './MultiSelectDropdown';
import AiPanel from './AiPanel';

const RAG_ORDER  = ['Red', 'Amber', 'Green'];
const RAG_CONFIG = {
  Red:   { bg: 'bg-red-50',    border: 'border-red-200',   dot: 'bg-red-500',   badge: 'bg-red-100 text-red-800',   label: 'Red'   },
  Amber: { bg: 'bg-amber-50',  border: 'border-amber-200', dot: 'bg-amber-400', badge: 'bg-amber-100 text-amber-800', label: 'Amber' },
  Green: { bg: 'bg-green-50',  border: 'border-green-200', dot: 'bg-green-500', badge: 'bg-green-100 text-green-800', label: 'Green' },
};

export default function RAGDashboard() {
  const [searchParams] = useSearchParams();
  const ragParam = searchParams.get('rag');
  const [accounts,         setAccounts]         = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState(null);
  const [activeRag,        setActiveRag]        = useState(RAG_ORDER.includes(ragParam) ? ragParam : '');
  const [filterCsm,        setFilterCsm]        = useState([]);
  const [filterRegion,     setFilterRegion]     = useState([]);
  const [filterIndustry,   setFilterIndustry]   = useState([]);
  const [filterMrrTier,    setFilterMrrTier]    = useState([]);
  const [filterRenewal,    setFilterRenewal]    = useState([]);
  const [filterChurn,      setFilterChurn]      = useState([]);
  const [search,           setSearch]           = useState('');

  useEffect(() => {
    axios.get('/api/accounts')
      .then(r => { setAccounts(Array.isArray(r.data) ? r.data : []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const csms           = useMemo(() => [...new Set(accounts.map(a => a.csm).filter(Boolean))].sort(), [accounts]);
  const regions        = useMemo(() => [...new Set(accounts.map(a => a.region).filter(Boolean))].sort(), [accounts]);
  const industries     = useMemo(() => [...new Set(accounts.map(a => a.industry).filter(Boolean))].sort(), [accounts]);
  const mrrTiers       = useMemo(() => [...new Set(accounts.map(a => a.mrr_tier).filter(Boolean))].sort(), [accounts]);
  const renewalStatuses= useMemo(() => [...new Set(accounts.map(a => a.renewal_status).filter(Boolean))].sort(), [accounts]);
  const churnStatuses  = useMemo(() => [...new Set(accounts.map(a => a.churn_status).filter(Boolean))].sort(), [accounts]);

  const applyBase = (list) => list.filter(a => {
    if (filterCsm.length > 0        && !filterCsm.includes(a.csm))              return false;
    if (filterRegion.length > 0     && !filterRegion.includes(a.region))        return false;
    if (filterIndustry.length > 0   && !filterIndustry.includes(a.industry))    return false;
    if (filterMrrTier.length > 0    && !filterMrrTier.includes(a.mrr_tier))     return false;
    if (filterRenewal.length > 0    && !filterRenewal.includes(a.renewal_status)) return false;
    if (filterChurn.length > 0      && !filterChurn.includes(a.churn_status))   return false;
    return true;
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return applyBase(accounts).filter(a => {
      if (activeRag && a.rag_status !== activeRag) return false;
      if (q && !a.account_name.toLowerCase().includes(q) &&
               !(a.rag_reason    || '').toLowerCase().includes(q) &&
               !(a.actions_taken || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [accounts, activeRag, filterCsm, filterRegion, filterIndustry, filterMrrTier, filterRenewal, filterChurn, search]);

  const grouped = useMemo(() => {
    const order = activeRag ? [activeRag] : RAG_ORDER;
    return order.map(rag => ({
      rag,
      items: filtered.filter(a => a.rag_status === rag).sort((a, b) => a.account_name.localeCompare(b.account_name)),
    })).filter(g => g.items.length > 0);
  }, [filtered, activeRag]);

  const summary = useMemo(() => {
    const base = applyBase(accounts);
    return RAG_ORDER.map(r => ({
      rag:   r,
      count: base.filter(a => a.rag_status === r).length,
      mrr:   base.filter(a => a.rag_status === r).reduce((s, a) => s + (a.mrr || 0), 0),
    }));
  }, [accounts, filterCsm, filterRegion, filterIndustry, filterMrrTier, filterRenewal, filterChurn]);

  const hasFilters = filterCsm.length > 0 || filterRegion.length > 0 || filterIndustry.length > 0 ||
    filterMrrTier.length > 0 || filterRenewal.length > 0 || filterChurn.length > 0 || activeRag || search;
  function clearAll() {
    setFilterCsm([]); setFilterRegion([]); setFilterIndustry([]); setFilterMrrTier([]);
    setFilterRenewal([]); setFilterChurn([]); setActiveRag(''); setSearch('');
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  return (
    <div className="space-y-6">
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
      <div className="card p-3 space-y-2">
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="text" placeholder="Search accounts, reasons, actions…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="!py-1.5 text-sm flex-1 min-w-[200px]"
          />
          <MultiSelectDropdown options={csms}           value={filterCsm}      onChange={setFilterCsm}      placeholder="All CSMs"      className="w-44" />
          <MultiSelectDropdown options={regions}        value={filterRegion}   onChange={setFilterRegion}   placeholder="All Regions"   className="w-40" />
          <MultiSelectDropdown options={industries}     value={filterIndustry} onChange={setFilterIndustry} placeholder="All Industries" className="w-44" />
          <MultiSelectDropdown options={mrrTiers}       value={filterMrrTier}  onChange={setFilterMrrTier}  placeholder="All MRR Tiers" className="w-44" />
          <MultiSelectDropdown options={renewalStatuses}value={filterRenewal}  onChange={setFilterRenewal}  placeholder="Renewal Status" className="w-48" />
          <MultiSelectDropdown options={churnStatuses}  value={filterChurn}    onChange={setFilterChurn}    placeholder="Churn Status"  className="w-44" />
        </div>
        <div className="flex items-center justify-between">
          {hasFilters ? (
            <button onClick={clearAll} className="text-xs text-red-500 hover:text-red-700 hover:underline">Clear all filters</button>
          ) : <span />}
          <span className="text-xs text-gray-400">{filtered.length} accounts</span>
        </div>
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

              {/* AI analysis for this RAG band */}
              <div className="mb-3">
                <AiPanel
                  section="rag"
                  title={`AI Analysis — ${rag}`}
                  compact
                  getPayload={() => ({ rag })}
                  hint={`Analyzes the ${rag} accounts (drivers, MRR concentration, recommended plays). Click Generate.`}
                />
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
