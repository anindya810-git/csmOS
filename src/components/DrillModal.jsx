import React from 'react';
import { Link } from 'react-router-dom';

// Status pill colours for escalation / issue records.
const STATUS_STYLE = {
  Resolved:          'bg-green-100 text-green-700',
  Closed:            'bg-green-100 text-green-700',
  'In Progress':     'bg-amber-100 text-amber-700',
  'Partly Resolved': 'bg-blue-100 text-blue-700',
  Open:              'bg-red-100 text-red-700',
};

function fmtDate(s) {
  if (!s) return null;
  try { return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return s; }
}

// Shared drill-down modal listing escalation or issue records.
// `drill` = { title, kind: 'escalation' | 'issue', items: [...] }.
// Used by the Weekly View and the Feature Request report so both stay identical.
export default function DrillModal({ drill, onClose }) {
  if (!drill) return null;
  const { title, kind, items } = drill;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{items.length} {kind}{items.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="overflow-y-auto divide-y divide-gray-50">
          {items.map(item => (
            <div key={item.id} className="px-5 py-3.5 hover:bg-gray-50/60 transition">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {item.account_id ? (
                    <Link to={`/accounts/${item.account_id}`} className="text-sm font-semibold text-brand-700 hover:underline">
                      {item.account_name || '(No account)'}
                    </Link>
                  ) : (
                    <span className="text-sm font-semibold text-gray-800">{item.account_name || '(No account)'}</span>
                  )}
                  <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{item.description}</p>
                </div>
                <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[item.status] || 'bg-gray-100 text-gray-600'}`}>
                  {item.status}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-xs text-gray-400">
                {kind === 'issue' && item.issue_type && <span>{item.issue_type}{item.issue_sub_type ? ` · ${item.issue_sub_type}` : ''}</span>}
                {item.csm && <span>CSM: {item.csm}</span>}
                {kind === 'issue' ? (
                  item.reported_date && <span>Reported {fmtDate(item.reported_date)}</span>
                ) : (
                  item.date_of_escalation && <span>{fmtDate(item.date_of_escalation)}</span>
                )}
                {kind === 'issue' && item.support_ticket && <span className="font-mono">Support #{item.support_ticket}</span>}
                {kind === 'issue' && item.dev_ticket && <span className="font-mono">Dev #{item.dev_ticket}</span>}
                {kind === 'escalation' && item.ownership && <span>{item.ownership}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
