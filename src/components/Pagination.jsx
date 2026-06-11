import React from 'react';

export default function Pagination({ page, perPage, total, onPage, onPerPage }) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to   = Math.min(page * perPage, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-3 border-t border-gray-100 mt-2">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span>Rows per page:</span>
        <select
          value={perPage}
          onChange={e => { onPerPage(Number(e.target.value)); onPage(1); }}
          className="!w-auto !py-1 text-sm border-gray-200"
        >
          {[25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-1">
        <span className="text-sm text-gray-500 mr-2 tabular-nums">
          {from}–{to} of {total}
        </span>
        {[
          { label: '«', action: () => onPage(1),              disabled: page === 1 },
          { label: '‹', action: () => onPage(p => p - 1),    disabled: page === 1 },
          { label: '›', action: () => onPage(p => p + 1),    disabled: page >= totalPages },
          { label: '»', action: () => onPage(totalPages),     disabled: page >= totalPages },
        ].map(({ label, action, disabled }) => (
          <button
            key={label}
            onClick={action}
            disabled={disabled}
            className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
