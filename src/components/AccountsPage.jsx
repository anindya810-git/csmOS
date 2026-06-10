import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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

const OPS_TEXT   = ['contains','does not contain','is','is not','is empty','is not empty'];
const OPS_SELECT = ['is','is not','is empty','is not empty'];
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
  const [accounts,         setAccounts]         = useState([]);
  const [filters,          setFilters]          = useState({});
  const [loading,          setLoading]          = useState(true);
  const [query,            setQuery]            = useState({ csm: '', industry: '', region: '', rag_status: '', mrr_tier: '' });
  const [search,           setSearch]           = useState('');
  const [showAdd,          setShowAdd]          = useState(false);
  const [sortField,        setSortField]        = useState('account_name');
  const [sortDir,          setSortDir]          = useState('asc');
  const [advancedOpen,     setAdvancedOpen]     = useState(false);
  const [conditions,       setConditions]       = useState([]);
  const [conditionLogic,   setConditionLogic]   = useState('AND');
  const [escalationMap,    setEscalationMap]    = useState({});
  const [escalationsReady, setEscalationsReady] = useState(false);
  const [ddConfig,         setDdConfig]         = useState({});
  const [bulkOpen,         setBulkOpen]         = useState(false);
  const [bulkField,        setBulkField]        = useState('csm');
  const [bulkValue,        setBulkValue]        = useState('');
  const [bulkConfirm,      setBulkConfirm]      = useState(false);
  const [bulkSaving,       setBulkSaving]       = useState(false);

  // Field definitions with dynamic options from filters
  const fieldDefs = useMemo(() => [
    { key: 'account_name',          label: 'Account Name',             type: 'text' },
    { key: 'tenant_id',             label: 'Tenant ID',                type: 'text' },
    { key: 'industry',              label: 'Industry',                 type: 'select', opts: filters.industries || [] },
    { key: 'region',                label: 'Region',                   type: 'select', opts: filters.regions   || ['North','South','East','West'] },
    { key: 'rag_status',            label: 'RAG Status',               type: 'select', opts: ['Green','Amber','Red'] },
    { key: 'csm',                   label: 'CSM',                      type: 'select', opts: filters.csms      || [] },
    { key: 'csm_lead',              label: 'CSM Lead',                 type: 'text' },
    { key: 'mrr',                   label: 'MRR (₹)',                  type: 'number' },
    { key: 'mrr_tier',              label: 'MRR Tier',                 type: 'select', opts: filters.tiers     || [] },
    { key: 'renewal_date',          label: 'Renewal Date',             type: 'date' },
    { key: 'renewal_status',        label: 'Renewal Status',           type: 'text' },
    { key: 'churn_status',          label: 'Churn Status',             type: 'select', opts: ['Churn Activated','Churn Predicted','Churn Executed','Contraction Predicted'] },
    { key: 'implementation_status', label: 'Implementation Status',    type: 'text' },
    { key: 'meeting_done',          label: 'Ring Fence Meeting Done',  type: 'select', opts: ['Yes','No'] },
    { key: 'adoption_score',        label: 'Adoption Score',           type: 'number' },
    { key: 'stickiness_score',      label: 'Stickiness Score',         type: 'number' },
    { key: 'poc_name',              label: 'POC Name',                 type: 'text' },
    { key: 'poc_email',             label: 'POC Email',                type: 'text' },
    { key: 'escalation_status',     label: 'Escalation Status',        type: 'select', opts: ['Open','In Progress','Partly Resolved','Resolved'] },
    { key: 'escalation_date',       label: 'Escalation Date',          type: 'date' },
    { key: 'has_escalation',        label: 'Has Any Escalation',       type: 'bool' },
  ], [filters]);

  const bulkFieldDefs = useMemo(() => {
    const dd = (key, fb) => ddConfig[key]?.length ? ddConfig[key].map(o => o.value) : fb;
    return [
      { key: 'csm',                  label: 'CSM',                   opts: filters.csms   || [] },
      { key: 'csm_lead',             label: 'CSM Lead',              opts: filters.csmLeads || [] },
      { key: 'rag_status',           label: 'RAG Status',            opts: dd('rag_status', ['Green','Amber','Red']) },
      { key: 'region',               label: 'Region',                opts: filters.regions || [] },
      { key: 'mrr_tier',             label: 'MRR Tier',              opts: filters.tiers  || [] },
      { key: 'renewal_status',       label: 'Renewal Status',        opts: dd('renewal_status', ['Renewed','At Risk','Lost','Pending']) },
      { key: 'churn_status',         label: 'Churn Status',          opts: dd('churn_status', ['Churn Activated','Churn Predicted','Churn Executed','Contraction Predicted']) },
      { key: 'implementation_status',label: 'Implementation Status', opts: dd('implementation_status', ['Not Started','In Progress','Completed','On Hold']) },
      { key: 'contraction_risk',     label: 'Contraction Risk',      opts: dd('contraction_risk', ['High','Medium','Low','None']) },
      { key: 'churn_risk',           label: 'Churn Risk',            opts: dd('churn_risk', ['High','Medium','Low','None']) },
    ];
  }, [filters, ddConfig]);

  useEffect(() => {
    axios.get('/api/accounts/filters').then(r => setFilters(r.data));
    axios.get('/api/dropdown-config').then(r => setDdConfig(r.data || {})).catch(() => {});
  }, []);

  const fetchAccounts = useCallback(() => {
    setLoading(true);
    const params = Object.fromEntries(Object.entries(query).filter(([, v]) => v));
    axios.get('/api/accounts', { params }).then(r => setAccounts(r.data)).finally(() => setLoading(false));
  }, [query]);

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

  const sorted = [...accounts].sort((a, b) => {
    let va = a[sortField], vb = b[sortField];
    if (sortField === 'mrr') { va = va || 0; vb = vb || 0; return sortDir === 'asc' ? va - vb : vb - va; }
    return sortDir === 'asc' ? String(va||'').localeCompare(String(vb||'')) : String(vb||'').localeCompare(String(va||''));
  });

  const activeConditions = conditions.filter(c => c.field && c.operator);

  const displayed = sorted.filter(a => {
    if (search) {
      const q = search.toLowerCase();
      const blob = [a.account_name, a.tenant_id, a.csm, a.industry, a.region,
        a.poc1_name, a.poc2_name, a.poc3_name, a.poc1_email, a.poc2_email, a.poc3_email,
      ].filter(Boolean).join(' ').toLowerCase();
      if (!blob.includes(q)) return false;
    }
    if (activeConditions.length === 0) return true;
    const results = activeConditions.map(c => matchesCondition(a, c, escalationMap, fieldDefs));
    return conditionLogic === 'OR' ? results.some(Boolean) : results.every(Boolean);
  });

  const addCondition = () =>
    setConditions(c => [...c, { id: Date.now(), field: 'account_name', operator: 'contains', value: '' }]);

  const updateCondition = (id, updates) =>
    setConditions(c => c.map(cond => cond.id === id ? { ...cond, ...updates } : cond));

  const removeCondition = (id) =>
    setConditions(c => c.filter(cond => cond.id !== id));

  const clearAll = () => {
    setSearch('');
    setQuery({ csm: '', industry: '', region: '', rag_status: '', mrr_tier: '' });
    setConditions([]);
  };

  const hasFilters = search || Object.values(query).some(Boolean) || conditions.length > 0;

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const handleBulkApply = async () => {
    setBulkSaving(true);
    try {
      await axios.patch('/api/accounts', { ids: displayed.map(a => a.id), field: bulkField, value: bulkValue });
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
          {user?.role === 'admin' && (
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
          <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Account
          </button>
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
          <select value={query.rag_status} onChange={e => setQuery(q => ({...q, rag_status: e.target.value}))} className="!w-auto text-sm !py-1.5">
            <option value="">All RAG</option>
            <option>Green</option><option>Amber</option><option>Red</option>
          </select>
          <select value={query.csm} onChange={e => setQuery(q => ({...q, csm: e.target.value}))} className="!w-auto text-sm !py-1.5">
            <option value="">All CSMs</option>
            {filters.csms?.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={query.industry} onChange={e => setQuery(q => ({...q, industry: e.target.value}))} className="!w-auto text-sm !py-1.5">
            <option value="">All Industries</option>
            {filters.industries?.map(i => <option key={i}>{i}</option>)}
          </select>
          <select value={query.region} onChange={e => setQuery(q => ({...q, region: e.target.value}))} className="!w-auto text-sm !py-1.5">
            <option value="">All Regions</option>
            {filters.regions?.map(r => <option key={r}>{r}</option>)}
          </select>
          <select value={query.mrr_tier} onChange={e => setQuery(q => ({...q, mrr_tier: e.target.value}))} className="!w-auto text-sm !py-1.5">
            <option value="">All Tiers</option>
            {filters.tiers?.map(t => <option key={t}>{t}</option>)}
          </select>
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
          {hasFilters && (
            <button onClick={clearAll} className="text-sm text-gray-400 hover:text-gray-600 underline">Clear all</button>
          )}
        </div>

        {/* Advanced conditions panel */}
        {advancedOpen && (
          <div className="border-t border-gray-100 pt-3 space-y-2">
            {/* AND / OR toggle */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Match</span>
              <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden text-sm font-medium">
                <button
                  onClick={() => setConditionLogic('AND')}
                  className={`px-3 py-1 transition ${conditionLogic === 'AND' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >AND</button>
                <button
                  onClick={() => setConditionLogic('OR')}
                  className={`px-3 py-1 border-l border-gray-200 transition ${conditionLogic === 'OR' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >OR</button>
              </div>
              <span className="text-xs text-gray-400">
                {conditionLogic === 'AND' ? 'all conditions must match' : 'any condition must match'}
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
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${conditionLogic === 'AND' ? 'text-brand-700 bg-brand-50' : 'text-amber-700 bg-amber-50'}`}>
                        {conditionLogic}
                      </span>
                      <div className="flex-1 border-t border-dashed border-gray-200" />
                    </div>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Field selector */}
                    <select
                      value={cond.field}
                      onChange={e => {
                        const nd = fieldDefs.find(f => f.key === e.target.value);
                        const no = getOps(nd?.type || 'text');
                        updateCondition(cond.id, { field: e.target.value, operator: no[0], value: '' });
                      }}
                      className="!w-auto text-sm !py-1.5"
                    >
                      {fieldDefs.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                    </select>

                    {/* Operator selector */}
                    <select
                      value={cond.operator}
                      onChange={e => updateCondition(cond.id, { operator: e.target.value, value: '' })}
                      className="!w-auto text-sm !py-1.5"
                    >
                      {ops.map(op => <option key={op}>{op}</option>)}
                    </select>

                    {/* Value input — type-aware */}
                    {needsValue(cond.operator) && (
                      def?.type === 'select' ? (
                        <select
                          value={cond.value}
                          onChange={e => updateCondition(cond.id, { value: e.target.value })}
                          className="!w-auto text-sm !py-1.5"
                        >
                          <option value="">Select…</option>
                          {(def.opts || []).map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : def?.type === 'number' ? (
                        <input
                          type="number"
                          value={cond.value}
                          onChange={e => updateCondition(cond.id, { value: e.target.value })}
                          className="!w-36 text-sm !py-1.5"
                          placeholder="Enter number"
                        />
                      ) : def?.type === 'date' ? (
                        <input
                          type="date"
                          value={cond.value}
                          onChange={e => updateCondition(cond.id, { value: e.target.value })}
                          className="!w-auto text-sm !py-1.5"
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
            <select
              value={bulkField}
              onChange={e => { setBulkField(e.target.value); setBulkValue(''); }}
              className="!w-auto text-sm !py-1.5 border-amber-200 bg-white"
            >
              {bulkFieldDefs.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
            <span className="text-sm text-amber-700">to</span>
            <select
              value={bulkValue}
              onChange={e => setBulkValue(e.target.value)}
              className="!w-auto text-sm !py-1.5 border-amber-200 bg-white"
            >
              <option value="">— Select value —</option>
              {(bulkFieldDefs.find(f => f.key === bulkField)?.opts || []).map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
            <span className="text-sm text-amber-700">
              for <strong className="text-amber-900">{displayed.length}</strong> account{displayed.length !== 1 ? 's' : ''}
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
                <Th label="Account Name" field="account_name" />
                <Th label="Industry"     field="industry" />
                <Th label="MRR"          field="mrr" />
                <Th label="CSM"          field="csm" />
                <Th label="RAG"          field="rag_status" />
                <Th label="Renewal Date" field="renewal_date" />
                <Th label="Churn Status" field="churn_status" />
                <Th label="Region"       field="region" />
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={9} className="py-12 text-center text-gray-400">Loading…</td></tr>
              ) : displayed.length === 0 ? (
                <tr><td colSpan={9} className="py-12 text-center text-gray-400">No accounts found.</td></tr>
              ) : displayed.map(a => (
                <tr key={a.id} onClick={() => navigate(`/accounts/${a.id}`)} className="hover:bg-gray-50 cursor-pointer transition">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 max-w-xs truncate">{a.account_name}</div>
                    <div className="text-xs text-gray-400">{a.tenant_id}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{a.industry || '—'}</td>
                  <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{fmt(a.mrr)}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{a.csm || '—'}</td>
                  <td className="px-4 py-3">
                    {a.rag_status ? <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${RAG_BADGE[a.rag_status] || ''}`}>{a.rag_status}</span> : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{a.renewal_date || '—'}</td>
                  <td className="px-4 py-3">
                    {a.churn_status
                      ? <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CHURN_BADGE[a.churn_status] || 'bg-gray-100 text-gray-600'}`}>{a.churn_status}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{a.region || '—'}</td>
                  <td className="px-4 py-3">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="card text-center py-10 text-gray-400">Loading…</div>
        ) : displayed.length === 0 ? (
          <div className="card text-center py-10 text-gray-400">No accounts found.</div>
        ) : displayed.map(a => (
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
              <strong>{displayed.length} account{displayed.length !== 1 ? 's' : ''}</strong>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setBulkConfirm(false)} disabled={bulkSaving} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition">
                Cancel
              </button>
              <button onClick={handleBulkApply} disabled={bulkSaving}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition disabled:opacity-60">
                {bulkSaving ? 'Updating…' : `Update ${displayed.length} account${displayed.length !== 1 ? 's' : ''}`}
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
  const [form, setForm] = useState({ account_name: '', tenant_id: '', industry: '', mrr_tier: 'Tier 1 (>500k)', mrr: '', region: '', csm_lead: 'Anindya', csm: '', rag_status: 'Green' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!form.account_name) { setError('Account name is required'); return; }
    setSaving(true);
    try {
      await axios.post('/api/accounts', { ...form, mrr: form.mrr ? parseFloat(form.mrr) : 0 });
      onSave();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to create account');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-lg font-semibold text-gray-900">Add New Account</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition text-lg leading-none">✕</button>
        </div>
        <div className="p-5 sm:p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1">Account Name *</label><input value={form.account_name} onChange={e => setForm(f=>({...f, account_name: e.target.value}))} /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Tenant ID</label><input value={form.tenant_id} onChange={e => setForm(f=>({...f, tenant_id: e.target.value}))} /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Industry</label><input value={form.industry} onChange={e => setForm(f=>({...f, industry: e.target.value}))} /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">MRR (₹)</label><input type="number" value={form.mrr} onChange={e => setForm(f=>({...f, mrr: e.target.value}))} /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Region</label>
              <select value={form.region} onChange={e => setForm(f=>({...f, region: e.target.value}))}>
                <option value="">—</option>
                {['North','South','East','West'].map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">CSM</label><input value={form.csm} onChange={e => setForm(f=>({...f, csm: e.target.value}))} /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">RAG Status</label>
              <select value={form.rag_status} onChange={e => setForm(f=>({...f, rag_status: e.target.value}))}>
                <option>Green</option><option>Amber</option><option>Red</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-60">
            {saving ? 'Saving…' : 'Create Account'}
          </button>
        </div>
      </div>
    </div>
  );
}
