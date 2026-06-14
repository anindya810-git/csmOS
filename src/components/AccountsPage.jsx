import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Pagination from './Pagination';
import MultiSelectDropdown from './MultiSelectDropdown';
import SelectDropdown from './SelectDropdown';
import DatePicker from './DatePicker';
import TagInput from './TagInput';
import ColumnToggle from './ColumnToggle';
import { useColumnPrefs } from '../hooks/useColumnPrefs';
import { ACCOUNT_FIELDS, toFieldDef, toBulkFieldDefs } from '../fieldCatalog';
import { useFieldLabels } from '../context/FieldLabelsContext';
import { usePermissions } from '../context/PermissionsContext';
import { useFeatures } from '../hooks/useFeatures';
import { useMyTeam } from '../hooks/useMyTeam';
import { useWatchlist } from '../hooks/useWatchlist';
import { evalConditions } from '../utils/conditions';
import ExportButton from './ExportButton';

// Every account field is available as a column; only these start visible.
const DEFAULT_ON = ['account_name', 'industry', 'mrr', 'csm', 'rag_status', 'renewal_date', 'churn_status', 'region'];
const ACCOUNTS_COLS = ACCOUNT_FIELDS.map(f => ({
  ...f,
  alwaysVisible: f.key === 'account_name',
  off: !DEFAULT_ON.includes(f.key),
}));

function fmt(n) {
  if (!n) return '—';
  if (n >= 10000000) return `₹${(n/10000000).toFixed(1)}Cr`;
  if (n >= 100000)   return `₹${(n/100000).toFixed(1)}L`;
  return `₹${n.toLocaleString()}`;
}

const RAG_BADGE = {
  Green: 'bg-green-100 text-green-800 border border-green-200',
  Amber: 'bg-amber-100 text-amber-800 border border-amber-200',
  Red:   'bg-red-100 text-red-800 border border-red-200',
};

const CHURN_BADGE = {
  'Churn Activated':       'bg-red-100 text-red-700 border border-red-200',
  'Churn Predicted':       'bg-orange-100 text-orange-700 border border-orange-200',
  'Churn Executed':        'bg-gray-100 text-gray-600 border border-gray-200',
  'Contraction Predicted': 'bg-yellow-100 text-yellow-700 border border-yellow-200',
};

function AccountCell({ a, k }) {
  if (k === 'mrr') return <span className="font-medium text-gray-800">{fmt(a.mrr)}</span>;
  if (k === 'rag_status') {
    return a.rag_status
      ? <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${RAG_BADGE[a.rag_status] || ''}`}>{a.rag_status}</span>
      : <span className="text-gray-300">—</span>;
  }
  if (k === 'churn_status') {
    return a.churn_status
      ? <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CHURN_BADGE[a.churn_status] || 'bg-gray-100 text-gray-600'}`}>{a.churn_status}</span>
      : <span className="text-gray-300">—</span>;
  }
  const v = a[k];
  if (v === null || v === undefined || v === '') return <span className="text-gray-300">—</span>;
  return <span className="block max-w-[240px] truncate" title={String(v)}>{String(v)}</span>;
}

const OPS_TEXT   = ['contains','does not contain','is','is not','is empty','is not empty'];
const OPS_SELECT = ['is','is not','is one of','is empty','is not empty'];
const OPS_NUM    = ['=','>','<','>=','<=','is empty','is not empty'];
const OPS_DATE   = ['is','before','after','is empty','is not empty'];
const OPS_BOOL   = ['is yes','is no'];

function getOps(type) {
  if (type === 'number') return OPS_NUM;
  if (type === 'select') return OPS_SELECT;
  if (type === 'date')   return OPS_DATE;
  if (type === 'bool')   return OPS_BOOL;
  return OPS_TEXT;
}

function needsValue(op) {
  return !['is empty','is not empty','is yes','is no'].includes(op);
}

function matchesCondition(account, cond, escalationMap, fieldDefs) {
  const { field, operator, value } = cond;
  const def = fieldDefs.find(f => f.key === field);
  if (!def) return true;

  if (field === 'poc_name') {
    const all = [account.poc1_name, account.poc2_name, account.poc3_name].filter(Boolean).join(' ').toLowerCase();
    if (operator === 'contains')          return all.includes(value.toLowerCase());
    if (operator === 'does not contain')  return !all.includes(value.toLowerCase());
    if (operator === 'is empty')          return !all;
    if (operator === 'is not empty')      return !!all;
    return all === value.toLowerCase();
  }
  if (field === 'poc_email') {
    const all = [account.poc1_email, account.poc2_email, account.poc3_email].filter(Boolean).join(' ').toLowerCase();
    if (operator === 'contains')          return all.includes(value.toLowerCase());
    if (operator === 'does not contain')  return !all.includes(value.toLowerCase());
    if (operator === 'is empty')          return !all;
    if (operator === 'is not empty')      return !!all;
    return all === value.toLowerCase();
  }
  if (field === 'has_escalation') {
    const has = !!(escalationMap[account.id]?.length);
    return operator === 'is yes' ? has : !has;
  }
  if (field === 'escalation_status') {
    const escs = escalationMap[account.id] || [];
    if (operator === 'is empty')     return escs.length === 0;
    if (operator === 'is not empty') return escs.length > 0;
    if (operator === 'is one of') {
      const vals = Array.isArray(value) ? value : [];
      return vals.length === 0 || vals.some(v => escs.some(e => e.status === v));
    }
    if (operator === 'is')           return escs.some(e => e.status === value);
    if (operator === 'is not')       return !escs.some(e => e.status === value);
    return true;
  }
  if (field === 'escalation_date') {
    const escs = escalationMap[account.id] || [];
    if (operator === 'is empty')     return escs.length === 0;
    if (operator === 'is not empty') return escs.length > 0;
    if (!value) return true;
    const vD = new Date(value);
    if (operator === 'is')     return escs.some(e => e.date_of_escalation && new Date(e.date_of_escalation).toDateString() === vD.toDateString());
    if (operator === 'before') return escs.some(e => e.date_of_escalation && new Date(e.date_of_escalation) < vD);
    if (operator === 'after')  return escs.some(e => e.date_of_escalation && new Date(e.date_of_escalation) > vD);
    return true;
  }

  const raw = account[field];
  if (operator === 'is empty')     return raw === null || raw === undefined || raw === '';
  if (operator === 'is not empty') return raw !== null && raw !== undefined && raw !== '';
  if (operator === 'is one of') {
    const vals = Array.isArray(value) ? value : [];
    if (vals.length === 0) return true;
    return vals.some(v => String(raw ?? '').toLowerCase() === v.toLowerCase());
  }

  if (def.type === 'number') {
    const v = parseFloat(value), r = parseFloat(raw);
    if (isNaN(v) || isNaN(r)) return true;
    if (operator === '=')  return r === v;
    if (operator === '>')  return r > v;
    if (operator === '<')  return r < v;
    if (operator === '>=') return r >= v;
    if (operator === '<=') return r <= v;
  }
  if (def.type === 'date') {
    if (!raw) return false;
    const rD = new Date(raw), vD = new Date(value);
    if (operator === 'is')     return rD.toDateString() === vD.toDateString();
    if (operator === 'before') return rD < vD;
    if (operator === 'after')  return rD > vD;
  }
  const r = String(raw ?? '').toLowerCase();
  const v = String(value ?? '').toLowerCase();
  if (operator === 'contains')         return r.includes(v);
  if (operator === 'does not contain') return !r.includes(v);
  if (operator === 'is')               return r === v;
  if (operator === 'is not')           return r !== v;
  return true;
}

export default function AccountsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { can } = usePermissions();
  const { isEnabled } = useFeatures();
  const { isWatched, toggle: watchToggle, getIds: getWatchIds } = useWatchlist();
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const { label: fieldLabel } = useFieldLabels();
  const { show: showCol, toggle: toggleCol, prefs: colPrefs } = useColumnPrefs(
    user?.email, 'accounts', Object.fromEntries(ACCOUNTS_COLS.map(c => [c.key, !c.off]))
  );
  const visibleCols = ACCOUNTS_COLS.filter(c => c.key !== 'account_name' && showCol(c.key));
  const exportCols  = [
    { key: 'account_name', label: fieldLabel('accounts', 'account_name', 'Account Name') },
    ...visibleCols.map(c => ({ key: c.key, label: fieldLabel('accounts', c.key, c.label) })),
  ];
  const colCount = visibleCols.length + 2 + (user?.role === 'admin' ? 1 : 0); // +account_name +actions
  const [accounts,         setAccounts]         = useState([]);
  const [filters,          setFilters]          = useState({});
  const [loading,          setLoading]          = useState(true);
  const [query,            setQuery]            = useState({ csm: [], industry: [], region: [], rag_status: [], mrr_tier: [], churn_status: [] });
  const [search,           setSearch]           = useState('');
  const [showAdd,          setShowAdd]          = useState(false);
  const [sortField,        setSortField]        = useState('account_name');
  const [sortDir,          setSortDir]          = useState('asc');
  const [advancedOpen,     setAdvancedOpen]     = useState(false);
  const [conditions,       setConditions]       = useState([]);
  const [escalationMap,    setEscalationMap]    = useState({});
  const [escalationsReady, setEscalationsReady] = useState(false);
  const [ddConfig,         setDdConfig]         = useState({});
  const [bulkOpen,         setBulkOpen]         = useState(false);
  const [bulkField,        setBulkField]        = useState('csm');
  const [bulkValue,        setBulkValue]        = useState('');
  const [bulkConfirm,      setBulkConfirm]      = useState(false);
  const [bulkSaving,       setBulkSaving]       = useState(false);
  const [selectedIds,   setSelectedIds]   = useState(new Set());
  const [page,             setPage]             = useState(1);
  const [perPage,          setPerPage]          = useState(100);

  // Field definitions with dynamic options from filters
  // Both lists are derived from the field catalog (single source of truth) —
  // any field added to ACCOUNT_FIELDS automatically appears as a column, in
  // advanced filters, and (when tagged with bulkGroup) in bulk update.
  const resolveOpts = useCallback(ff =>
    ff.filtersKey ? filters[ff.filtersKey]
    : ff.ddKey    ? (ddConfig[ff.ddKey] || []).map(o => o.value)
    : undefined, [filters, ddConfig]);

  // Plus a few virtual filter fields (POC across slots, escalation join)
  // that aren't real account columns.
  const fieldDefs = useMemo(() => [
    ...ACCOUNT_FIELDS.map(f => toFieldDef(f, resolveOpts)),
    { key: 'poc_name',          label: 'POC Name',           type: 'text' },
    { key: 'poc_email',         label: 'POC Email',          type: 'text' },
    { key: 'escalation_status', label: 'Escalation Status',  type: 'select', opts: ['Open','In Progress','Partly Resolved','Resolved'] },
    { key: 'escalation_date',   label: 'Escalation Date',    type: 'date' },
    { key: 'has_escalation',    label: 'Has Any Escalation', type: 'bool' },
  ], [resolveOpts]);

  const bulkFieldDefs = useMemo(() => toBulkFieldDefs(ACCOUNT_FIELDS, resolveOpts), [resolveOpts]);

  useEffect(() => {
    axios.get('/api/accounts?mode=filters').then(r => setFilters(r.data));
    axios.get('/api/dropdown-config').then(r => setDdConfig(r.data || {})).catch(() => {});
  }, []);

  const fetchAccounts = useCallback(() => {
    setLoading(true);
    axios.get('/api/accounts').then(r => setAccounts(r.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  useEffect(() => {
    if (advancedOpen && !escalationsReady) {
      axios.get('/api/escalations').then(r => {
        const map = {};
        for (const e of r.data || []) {
          if (e.account_id) {
            if (!map[e.account_id]) map[e.account_id] = [];
            map[e.account_id].push(e);
          }
        }
        setEscalationMap(map);
        setEscalationsReady(true);
      }).catch(() => {});
    }
  }, [advancedOpen, escalationsReady]);

  const NUMERIC_SORT = ['mrr', 'grr', 'nps', 'adoption_score', 'stickiness_score', 'adoption_rate'];
  const sorted = [...accounts].sort((a, b) => {
    let va = a[sortField], vb = b[sortField];
    if (NUMERIC_SORT.includes(sortField)) { va = Number(va) || 0; vb = Number(vb) || 0; return sortDir === 'asc' ? va - vb : vb - va; }
    return sortDir === 'asc' ? String(va||'').localeCompare(String(vb||'')) : String(vb||'').localeCompare(String(va||''));
  });

  const churnOptions = useMemo(
    () => [...new Set(accounts.map(a => a.churn_status).filter(Boolean))].sort(),
    [accounts]
  );

  const activeConditions = conditions.filter(c => c.field && c.operator);

  const watchedAccountIds = new Set(getWatchIds('accounts'));

  const displayed = sorted.filter(a => {
    if (watchlistOnly && !watchedAccountIds.has(String(a.id)))                   return false;
    if (query.rag_status.length > 0 && !query.rag_status.includes(a.rag_status)) return false;
    if (query.csm.length > 0        && !query.csm.includes(a.csm))               return false;
    if (query.industry.length > 0   && !query.industry.includes(a.industry))     return false;
    if (query.region.length > 0     && !query.region.includes(a.region))         return false;
    if (query.mrr_tier.length > 0   && !query.mrr_tier.includes(a.mrr_tier))     return false;
    if (query.churn_status.length > 0 && !query.churn_status.includes(a.churn_status)) return false;
    if (search) {
      const q = search.toLowerCase();
      const blob = [a.account_name, a.tenant_id, a.csm, a.industry, a.region,
        a.poc1_name, a.poc2_name, a.poc3_name, a.poc1_email, a.poc2_email, a.poc3_email,
      ].filter(Boolean).join(' ').toLowerCase();
      if (!blob.includes(q)) return false;
    }
    if (activeConditions.length === 0) return true;
    return evalConditions(activeConditions, c => matchesCondition(a, c, escalationMap, fieldDefs));
  });

  const addCondition = () =>
    setConditions(c => [...c, { id: Date.now(), field: 'account_name', operator: 'contains', value: '', connector: 'AND' }]);

  const updateCondition = (id, updates) =>
    setConditions(c => c.map(cond => cond.id === id ? { ...cond, ...updates } : cond));

  const removeCondition = (id) =>
    setConditions(c => c.filter(cond => cond.id !== id));

  useEffect(() => { setPage(1); }, [search, query, conditions]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearAll = () => {
    setSearch('');
    setQuery({ csm: [], industry: [], region: [], rag_status: [], mrr_tier: [], churn_status: [] });
    setConditions([]);
    setWatchlistOnly(false);
    setPage(1);
  };

  const hasFilters = search || Object.values(query).some(arr => arr.length > 0) || conditions.length > 0 || watchlistOnly;

  const paginated = displayed.slice((page - 1) * perPage, page * perPage);

  const toggleSelectId = (id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allPageSelected = paginated.length > 0 && paginated.every(a => selectedIds.has(a.id));
  const selectAllPage = () => { allPageSelected ? setSelectedIds(new Set()) : setSelectedIds(new Set(paginated.map(a => a.id))); };

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const handleBulkApply = async () => {
    setBulkSaving(true);
    try {
      await axios.patch('/api/accounts', { ids: selectedIds.size > 0 ? [...selectedIds] : displayed.map(a => a.id), field: bulkField, value: bulkValue });
      setBulkConfirm(false);
      setBulkOpen(false);
      setBulkValue('');
      fetchAccounts();
    } catch (e) {
      alert(e.response?.data?.error || 'Bulk update failed');
    } finally {
      setBulkSaving(false);
    }
  };

  const Th = ({ label, field }) => (
    <th onClick={() => handleSort(field)} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700 whitespace-nowrap">
      {label} {sortField === field && (sortDir === 'asc' ? '↑' : '↓')}
    </th>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
          <p className="text-gray-500 text-sm">
            {displayed.length !== accounts.length
              ? `${displayed.length} of ${accounts.length} accounts`
              : `${accounts.length} accounts`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user?.role === 'admin' && isEnabled('bulk_updates') && (
            <button
              onClick={() => { setBulkOpen(o => !o); setBulkValue(''); }}
              className={`inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border transition
                ${bulkOpen ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Bulk Update
            </button>
          )}
          {isEnabled('export') && can('export', 'accounts') && (
            <ExportButton
              filename="Accounts"
              columns={exportCols}
              getRows={() => displayed.map(a =>
                Object.fromEntries(exportCols.map(c => [c.key, a[c.key] ?? '']))
              )}
            />
          )}
          {can('create', 'accounts') && (<button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Account
          </button>)}
        </div>
      </div>

      <div className="card p-4 space-y-3">
        {/* Main search bar */}
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by account name, tenant ID, POC name or email…"
            className="pl-11 pr-10 !py-2.5 text-base w-full"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>

        {/* Quick filters */}
        <div className="flex flex-wrap items-center gap-2">
          <MultiSelectDropdown options={['Green','Amber','Red']} value={query.rag_status} onChange={v => setQuery(q => ({...q, rag_status: v}))} placeholder="All RAG" />
          <MultiSelectDropdown options={filters.csms || []} value={query.csm} onChange={v => setQuery(q => ({...q, csm: v}))} placeholder="All CSMs" />
          <MultiSelectDropdown options={filters.industries || []} value={query.industry} onChange={v => setQuery(q => ({...q, industry: v}))} placeholder="All Industries" />
          <MultiSelectDropdown options={['North','South','East','West']} value={query.region} onChange={v => setQuery(q => ({...q, region: v}))} placeholder="All Regions" />
          <MultiSelectDropdown options={filters.tiers || []} value={query.mrr_tier} onChange={v => setQuery(q => ({...q, mrr_tier: v}))} placeholder="All Tiers" />
          <MultiSelectDropdown options={churnOptions} value={query.churn_status} onChange={v => setQuery(q => ({...q, churn_status: v}))} placeholder="All Churn Status" />
          {isEnabled('watchlist') && (
            <button
              onClick={() => setWatchlistOnly(w => !w)}
              title="Show only watchlisted accounts"
              className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border transition ${watchlistOnly ? 'bg-brand-50 border-brand-400 text-brand-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              Watchlist{watchlistOnly ? ` (${watchedAccountIds.size})` : ''}
            </button>
          )}
          {isEnabled('column_selection') && <ColumnToggle columns={ACCOUNTS_COLS.map(c => ({ ...c, label: fieldLabel('accounts', c.key, c.label) }))} prefs={colPrefs} onToggle={toggleCol} />}
          {isEnabled('advanced_search') && (
          <button
            onClick={() => setAdvancedOpen(o => !o)}
            className={`ml-auto inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border transition
              ${advancedOpen || conditions.length > 0
                ? 'bg-brand-50 border-brand-300 text-brand-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            Advanced{conditions.length > 0 ? ` (${conditions.length})` : ''}
          </button>
          )}
          {hasFilters && (
            <button onClick={clearAll} className={`text-sm text-gray-400 hover:text-gray-600 underline${isEnabled('advanced_search') ? '' : ' ml-auto'}`}>Clear all</button>
          )}
        </div>

        {/* Advanced conditions panel */}
        {advancedOpen && (
          <div className="border-t border-gray-100 pt-3 space-y-2">
            {/* Mixed AND / OR — per-row connectors */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Conditions</span>
              <span className="text-xs text-gray-400">
                Joined by <b className="text-brand-700">AND</b>; switch a join to <b className="text-amber-600">OR</b> to start a new group — e.g. (A and B) or C.
              </span>
            </div>

            {conditions.length === 0 && (
              <p className="text-sm text-gray-400 italic pb-1">No conditions yet — add one below.</p>
            )}

            {conditions.map((cond, idx) => {
              const def = fieldDefs.find(f => f.key === cond.field);
              const ops = getOps(def?.type || 'text');
              return (
                <React.Fragment key={cond.id}>
                  {idx > 0 && (
                    <div className="flex items-center gap-2 py-0.5">
                      <div className="flex-1 border-t border-dashed border-gray-200" />
                      <div className="inline-flex rounded-md border border-gray-200 overflow-hidden text-[11px] font-bold">
                        <button onClick={() => updateCondition(cond.id, { connector: 'AND' })}
                          className={`px-2 py-0.5 transition ${(cond.connector || 'AND') === 'AND' ? 'bg-brand-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>AND</button>
                        <button onClick={() => updateCondition(cond.id, { connector: 'OR' })}
                          className={`px-2 py-0.5 border-l border-gray-200 transition ${cond.connector === 'OR' ? 'bg-amber-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>OR</button>
                      </div>
                      <div className="flex-1 border-t border-dashed border-gray-200" />
                    </div>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Field selector */}
                    <SelectDropdown
                      compact
                      clearable={false}
                      className="w-48"
                      options={fieldDefs.map(f => ({ value: f.key, label: f.label }))}
                      value={cond.field}
                      onChange={v => {
                        const nd = fieldDefs.find(f => f.key === v);
                        const no = getOps(nd?.type || 'text');
                        updateCondition(cond.id, { field: v, operator: no[0], value: '' });
                      }}
                    />

                    {/* Operator selector */}
                    <SelectDropdown
                      compact
                      clearable={false}
                      className="w-40"
                      options={ops}
                      value={cond.operator}
                      onChange={v => updateCondition(cond.id, { operator: v, value: v === 'is one of' ? [] : '' })}
                    />

                    {/* Value input — type-aware */}
                    {needsValue(cond.operator) && (
                      def?.type === 'select' ? (
                        cond.operator === 'is one of' ? (
                          <MultiSelectDropdown
                            placeholder="Select values…"
                            options={def.opts || []}
                            value={Array.isArray(cond.value) ? cond.value : []}
                            onChange={v => updateCondition(cond.id, { value: v })}
                          />
                        ) : (
                          <SelectDropdown
                            compact
                            className="w-48"
                            placeholder="Select…"
                            options={def.opts || []}
                            value={cond.value}
                            onChange={v => updateCondition(cond.id, { value: v })}
                          />
                        )
                      ) : def?.type === 'number' ? (
                        <input
                          type="number"
                          value={cond.value}
                          onChange={e => updateCondition(cond.id, { value: e.target.value })}
                          className="!w-36 text-sm !py-1.5"
                          placeholder="Enter number"
                        />
                      ) : def?.type === 'date' ? (
                        <DatePicker
                          compact
                          className="w-40"
                          value={cond.value}
                          onChange={v => updateCondition(cond.id, { value: v })}
                        />
                      ) : (
                        <input
                          type="text"
                          value={cond.value}
                          onChange={e => updateCondition(cond.id, { value: e.target.value })}
                          className="!w-48 text-sm !py-1.5"
                          placeholder="Enter value…"
                        />
                      )
                    )}

                    {/* Remove */}
                    <button
                      onClick={() => removeCondition(cond.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition"
                      title="Remove condition"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </React.Fragment>
              );
            })}

            <button
              onClick={addCondition}
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 mt-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add condition
            </button>
          </div>
        )}
      </div>

      {/* Bulk update toolbar */}
      {bulkOpen && (
        <div className="card border-amber-200 bg-amber-50/60 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 shrink-0">
              <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span className="text-sm font-semibold text-amber-800">Bulk Update</span>
            </div>
            <span className="text-sm text-amber-700">Set</span>
            <SelectDropdown
              compact
              clearable={false}
              className="w-56"
              options={bulkFieldDefs.map(f => ({ value: f.key, label: `${f.group} · ${f.label}` }))}
              value={bulkField}
              onChange={v => { setBulkField(v); setBulkValue(''); }}
            />
            <span className="text-sm text-amber-700">to</span>
            {(() => {
              const def = bulkFieldDefs.find(f => f.key === bulkField);
              if (!def) return null;
              if (def.type === 'select') return (
                <SelectDropdown compact className="w-48" placeholder="— Select value —" options={def.opts || []} value={bulkValue} onChange={setBulkValue} />
              );
              if (def.type === 'number') return (
                <input type="number" value={bulkValue} onChange={e => setBulkValue(e.target.value)} placeholder="Enter value…" className="!w-40 text-sm !py-1.5 border-amber-200 bg-white" />
              );
              if (def.type === 'date') return (
                <DatePicker compact className="w-40" value={bulkValue} onChange={setBulkValue} />
              );
              return (
                <input type="text" value={bulkValue} onChange={e => setBulkValue(e.target.value)} placeholder="Enter value…" className="!w-48 text-sm !py-1.5 border-amber-200 bg-white" />
              );
            })()}
            <span className="text-sm text-amber-700">
              for <strong className="text-amber-900">{selectedIds.size > 0 ? selectedIds.size : displayed.length}</strong> account{(selectedIds.size > 0 ? selectedIds.size : displayed.length) !== 1 ? 's' : ''}{selectedIds.size > 0 ? ' (selected)' : ''}
            </span>
            <button
              onClick={() => setBulkConfirm(true)}
              disabled={!bulkValue || displayed.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-sm font-medium rounded-lg transition ml-1"
            >
              Apply →
            </button>
            <button
              onClick={() => { setBulkOpen(false); setBulkValue(''); }}
              className="text-sm text-amber-600 hover:text-amber-800 transition ml-auto"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Desktop table */}
      <div className="card p-0 overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {user?.role === 'admin' && (
                  <th className="w-10 px-3 py-3">
                    <input type="checkbox" checked={allPageSelected} onChange={selectAllPage}
                      className="!w-4 !h-4 !p-0 !border-0 !ring-0 shrink-0 accent-brand-600" />
                  </th>
                )}
                <Th label={fieldLabel('accounts', 'account_name', 'Account Name')} field="account_name" />
                {visibleCols.map(c => (
                  <Th key={c.key} label={fieldLabel('accounts', c.key, c.label)} field={c.key} />
                ))}
                <th className="px-3 py-3 w-10 sticky right-0 bg-gray-50 z-10 shadow-[-2px_0_6px_rgba(0,0,0,0.05)]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={colCount} className="py-12 text-center text-gray-400">Loading…</td></tr>
              ) : displayed.length === 0 ? (
                <tr><td colSpan={colCount} className="py-12 text-center text-gray-400">No accounts found.</td></tr>
              ) : paginated.map(a => (
                <tr key={a.id} onClick={() => navigate(`/accounts/${a.id}`)} className="group hover:bg-gray-50 cursor-pointer transition">
                  {user?.role === 'admin' && (
                    <td className="w-10 px-3 py-3" onClick={ev => ev.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(a.id)} onChange={() => toggleSelectId(a.id)}
                        className="!w-4 !h-4 !p-0 !border-0 !ring-0 shrink-0 accent-brand-600" />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 max-w-xs truncate">{a.account_name}</div>
                    <div className="text-xs text-gray-400">{a.tenant_id}</div>
                  </td>
                  {visibleCols.map(c => (
                    <td key={c.key} className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      <AccountCell a={a} k={c.key} />
                    </td>
                  ))}
                  <td className="px-3 py-3 sticky right-0 z-10 bg-white group-hover:bg-gray-50 shadow-[-2px_0_6px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center gap-1">
                      {isEnabled('watchlist') && <button
                        onClick={ev => { ev.stopPropagation(); watchToggle('accounts', a.id); }}
                        className={`p-1 rounded transition ${isWatched('accounts', a.id) ? 'text-brand-600' : 'text-gray-300 hover:text-gray-500'}`}
                        title={isWatched('accounts', a.id) ? 'Remove from watchlist' : 'Add to watchlist'}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>}
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} perPage={perPage} total={displayed.length} onPage={setPage} onPerPage={setPerPage} />
        </div>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="card text-center py-10 text-gray-400">Loading…</div>
        ) : displayed.length === 0 ? (
          <div className="card text-center py-10 text-gray-400">No accounts found.</div>
        ) : paginated.map(a => (
          <button key={a.id} onClick={() => navigate(`/accounts/${a.id}`)}
            className="card w-full text-left active:bg-gray-50 transition">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{a.account_name}</p>
                <p className="text-xs text-gray-400 font-mono">{a.tenant_id || '—'}</p>
              </div>
              {a.rag_status && <span className={`shrink-0 text-xs font-semibold px-2.5 py-0.5 rounded-full ${RAG_BADGE[a.rag_status] || ''}`}>{a.rag_status}</span>}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div><span className="text-gray-400">MRR</span><p className="font-medium text-gray-800">{fmt(a.mrr)}</p></div>
              <div><span className="text-gray-400">CSM</span><p className="font-medium text-gray-700 truncate">{a.csm || '—'}</p></div>
              <div><span className="text-gray-400">Industry</span><p className="font-medium text-gray-700 truncate">{a.industry || '—'}</p></div>
              <div><span className="text-gray-400">Region</span><p className="font-medium text-gray-700">{a.region || '—'}</p></div>
              <div><span className="text-gray-400">Renewal</span><p className="font-medium text-gray-700">{a.renewal_date || '—'}</p></div>
              <div>
                <span className="text-gray-400">Churn</span>
                {a.churn_status
                  ? <p><span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${CHURN_BADGE[a.churn_status] || 'bg-gray-100 text-gray-600'}`}>{a.churn_status}</span></p>
                  : <p className="font-medium text-gray-300">—</p>}
              </div>
            </div>
          </button>
        ))}
        <Pagination page={page} perPage={perPage} total={displayed.length} onPage={setPage} onPerPage={setPerPage} />
      </div>

      {bulkConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Confirm Bulk Update</h3>
              <p className="text-sm text-gray-500 mt-0.5">This will overwrite existing values and cannot be undone.</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
              Set <strong>{bulkFieldDefs.find(f => f.key === bulkField)?.label}</strong> to{' '}
              <strong>"{bulkValue}"</strong> for{' '}
              <strong>{selectedIds.size > 0 ? selectedIds.size : displayed.length} account{(selectedIds.size > 0 ? selectedIds.size : displayed.length) !== 1 ? 's' : ''}</strong>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setBulkConfirm(false)} disabled={bulkSaving} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition">
                Cancel
              </button>
              <button onClick={handleBulkApply} disabled={bulkSaving}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition disabled:opacity-60">
                {bulkSaving ? 'Updating…' : `Update ${selectedIds.size > 0 ? selectedIds.size : displayed.length} account${(selectedIds.size > 0 ? selectedIds.size : displayed.length) !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdd && <AddAccountModal onClose={() => setShowAdd(false)} onSave={() => { setShowAdd(false); fetchAccounts(); }} />}
    </div>
  );
}

function AddAccountModal({ onClose, onSave }) {
  const { teamNames, isLead, selfName } = useMyTeam();
  const [form, setForm] = useState(() => ({
    account_name: '', tenant_id: '', industry: '', mrr_tier: 'Tier 1 (>500k)',
    mrr: '', region: '', csm_lead: '', csm: selfName, rag_status: 'Green',
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e) => {
    e?.preventDefault?.();
    if (!form.account_name) { setError('Account name is required'); return; }
    setSaving(true);
    try {
      await axios.post('/api/accounts', { ...form, mrr: form.mrr ? parseFloat(form.mrr) : 0 });
      onSave();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to create account');
    } finally { setSaving(false); }
  };

  return createPortal(
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-[520px] max-w-[90vw] bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h3 className="text-sm font-semibold text-gray-900">Add New Account</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <form id="add-account-form" onSubmit={handleSave} className="space-y-3">
            {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Account Name *</label>
              <input value={form.account_name} onChange={e => setForm(f=>({...f, account_name: e.target.value}))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tenant ID</label>
              <TagInput value={form.tenant_id} onChange={v => setForm(f=>({...f, tenant_id: v}))} placeholder="e.g. 5528" />
              <p className="text-[11px] text-gray-400 mt-1">Press Enter or comma to add multiple tenant IDs</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Industry</label>
              <input value={form.industry} onChange={e => setForm(f=>({...f, industry: e.target.value}))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">MRR (₹)</label>
              <input type="number" value={form.mrr} onChange={e => setForm(f=>({...f, mrr: e.target.value}))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Region</label>
              <SelectDropdown options={['North','South','East','West']} value={form.region} onChange={v => setForm(f=>({...f, region: v}))} placeholder="—" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">CSM</label>
              {isLead ? (
                <SelectDropdown options={teamNames} value={form.csm} onChange={v => setForm(f => ({ ...f, csm: v ?? '' }))} placeholder="— Select CSM —" />
              ) : (
                <input value={form.csm} readOnly className="bg-gray-50 text-gray-500 cursor-not-allowed" />
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">RAG Status</label>
              <SelectDropdown options={['Green','Amber','Red']} value={form.rag_status} onChange={v => setForm(f=>({...f, rag_status: v}))} clearable={false} />
            </div>
          </form>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 shrink-0">
          <button type="submit" form="add-account-form" disabled={saving} className="flex-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50">
            {saving ? 'Saving…' : 'Create Account'}
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 rounded-lg transition">
            Cancel
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
