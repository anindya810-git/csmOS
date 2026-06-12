import React from 'react';
import { useNavigate } from 'react-router-dom';

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

// Shared account-list modal: clickable rows that open the account detail.
// Used by the Account Mapping report and the Feature Request report.
export default function AccountListModal({ title, accounts, onClose }) {
  const navigate = useNavigate();
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[70vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{accounts.length} account{accounts.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto divide-y divide-gray-50">
          {accounts.map(a => (
            <button key={a.id} type="button"
              onClick={() => { onClose(); navigate(`/accounts/${a.id}`); }}
              className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition text-left">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{a.account_name}</p>
                <p className="text-xs text-gray-400 truncate">{a.industry || '—'} · {a.region || '—'} · {fmt(a.mrr)}</p>
              </div>
              {a.rag_status && (
                <span className={`shrink-0 w-2.5 h-2.5 rounded-full ${RAG_DOT[a.rag_status] || 'bg-gray-300'}`} />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
