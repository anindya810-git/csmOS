import React from 'react';

// Compact relative-time formatter shared by the "last edited" stamps and
// the Manage Users active indicator.
export function timeAgo(iso) {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (isNaN(then)) return null;
  const diff = Date.now() - then;
  if (diff < 0) return 'just now';
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fullTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// "Last edited by X · 3h ago" — hover shows the absolute timestamp.
export default function LastEdited({ by, at, className = '' }) {
  if (!by && !at) return null;
  const rel = timeAgo(at);
  return (
    <p className={`text-xs text-gray-400 ${className}`} title={fullTime(at)}>
      Last edited{by ? ` by ${by}` : ''}{rel ? ` · ${rel}` : ''}
    </p>
  );
}
