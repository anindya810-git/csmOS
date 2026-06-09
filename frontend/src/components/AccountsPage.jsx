import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function fmt(n) {
  if (!n) return '—';
  if (n >= 10000000) return `₹${(n/10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n/100000).toFixed(1)}L`;
  return `₹${n.toLocaleString()}`;
}

const RAG_BADGE = {
  Green: 'bg-green-100 text-green-800 border border-green-200',
  Amber: 'bg-amber-100 text-amber-800 border border-amber-200',
  Red: 'bg-red-100 text-red-800 border border-red-200',
};

const CHURN_BADGE = {
  'Churn Activated': 'bg-red-100 text-red-700 border border-red-200',
  'Churn Predicted': 'bg-orange-100 text-orange-700 border border-orange-200',
  'Churn Executed': 'bg-gray-100 text-gray-600 border border-gray-200',
  'Contraction Predicted': 'bg-yellow-100 text-yellow-700 border border-yellow-200',
};

export default function AccountsPage() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState({ search: '', csm: '', industry: '', region: '', rag_status: '', mrr_tier: '' });
  const [showAdd, setShowAdd] = useState(false);
  const [sortField, setSortField] = useState('account_name');
  const [sortDir, setSortDir] = useState('asc');

  useEffect(() => { axios.get('/api/accounts/filters').then(r => setFilters(r.data)); }, []);

  const fetchAccounts = useCallback(() => {
    setLoading(true);
    const params = Object.fromEntries(Object.entries(query).filter(([, v]) => v));
    axios.get('/api/accounts', { params }).then(r => setAccounts(r.data)).finally(() => setLoading(false));
  }, [query]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const sorted = [...accounts].sort((a, b) => {
    let va = a[sortField], vb = b[sortField];
    if (sortField === 'mrr') { va = va || 0; vb = vb || 0; return sortDir === 'asc' ? va - vb : vb - va; }
    return sortDir === 'asc' ? String(va||'').localeCompare(String(vb||'')) : String(vb||'').localeCompare(String(va||''));
  });

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
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
          <p className="text-gray-500 text-sm">{accounts.length} accounts</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Account
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <input placeholder="Search accounts…" value={query.search} onChange={e => setQuery(q => ({...q, search: e.target.value}))} />
          <select value={query.rag_status} onChange={e => setQuery(q => ({...q, rag_status: e.target.value}))}>
            <option value="">All RAG</option>
            <option>Green</option><option>Amber</option><option>Red</option>
          </select>
          <select value={query.csm} onChange={e => setQuery(q => ({...q, csm: e.target.value}))}>
            <option value="">All CSMs</option>
            {filters.csms?.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={query.industry} onChange={e => setQuery(q => ({...q, industry: e.target.value}))}>
            <option value="">All Industries</option>
            {filters.industries?.map(i => <option key={i}>{i}</option>)}
          </select>
          <select value={query.region} onChange={e => setQuery(q => ({...q, region: e.target.value}))}>
            <option value="">All Regions</option>
            {filters.regions?.map(r => <option key={r}>{r}</option>)}
          </select>
          <select value={query.mrr_tier} onChange={e => setQuery(q => ({...q, mrr_tier: e.target.value}))}>
            <option value="">All Tiers</option>
            {filters.tiers?.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <Th label="Account Name" field="account_name" />
                <Th label="Industry" field="industry" />
                <Th label="MRR" field="mrr" />
                <Th label="CSM" field="csm" />
                <Th label="RAG" field="rag_status" />
                <Th label="Renewal Date" field="renewal_date" />
                <Th label="Churn Status" field="churn_status" />
                <Th label="Region" field="region" />
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={9} className="py-12 text-center text-gray-400">Loading…</td></tr>
              ) : sorted.length === 0 ? (
                <tr><td colSpan={9} className="py-12 text-center text-gray-400">No accounts found.</td></tr>
              ) : sorted.map(a => (
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
                    {a.churn_status ? <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CHURN_BADGE[a.churn_status] || 'bg-gray-100 text-gray-600'}`}>{a.churn_status}</span> : <span className="text-gray-300">—</span>}
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Add New Account</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">✕</button>
        </div>
        <div className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1">Account Name *</label><input value={form.account_name} onChange={e => setForm(f=>({...f, account_name: e.target.value}))} /></div>
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
