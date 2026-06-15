import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function fmt(n) {
  if (!n) return '—';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

const RAG_DOT = {
  Red: '#ef4444',
  Amber: '#f59e0b',
  Green: '#22c55e',
};

const RAG_PILLS = ['All', 'Red', 'Amber', 'Green'];

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
    </div>
  );
}

export default function MobileAccountsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ragFilter, setRagFilter] = useState('All');

  useEffect(() => {
    axios
      .get('/api/accounts')
      .then((r) => setAccounts(r.data || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return accounts.filter((a) => {
      const matchSearch = !search || a.name?.toLowerCase().includes(search.toLowerCase());
      const matchRag = ragFilter === 'All' || a.rag_status === ragFilter;
      return matchSearch && matchRag;
    });
  }, [accounts, search, ragFilter]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="sticky top-0 z-10 bg-white shadow-sm px-4 pt-4 pb-2 space-y-2">
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2.5">
          <svg
            className="w-4 h-4 text-gray-400 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
            />
          </svg>
          <input
            type="search"
            placeholder="Search accounts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {RAG_PILLS.map((pill) => (
            <button
              key={pill}
              onClick={() => setRagFilter(pill)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                ragFilter === pill
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {pill}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="flex-1 px-4 py-3 space-y-3">
          <p className="text-xs text-gray-500 font-medium">
            {filtered.length} {filtered.length === 1 ? 'account' : 'accounts'}
          </p>

          {filtered.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-gray-400 text-sm">No accounts found</p>
            </div>
          ) : (
            filtered.map((a) => (
              <button
                key={a.id}
                onClick={() => navigate(`/accounts/${a.id}`)}
                className="w-full bg-white rounded-2xl shadow-sm p-4 text-left active:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span
                      className="shrink-0 w-2.5 h-2.5 rounded-full mt-1.5"
                      style={{ backgroundColor: RAG_DOT[a.rag_status] || '#9ca3af' }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm leading-snug truncate">
                          {a.name}
                        </span>
                        {a.tier && (
                          <span className="shrink-0 text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {a.tier}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-sm font-semibold text-gray-800">{fmt(a.mrr)}</span>
                    <svg
                      className="w-4 h-4 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-2 pl-5">
                  {a.csm && (
                    <span className="text-xs text-gray-500 truncate">{a.csm}</span>
                  )}
                  {a.churn_status && (
                    <span className="shrink-0 text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                      {a.churn_status}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
