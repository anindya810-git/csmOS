import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

// Normalize any stored date value (ISO date, full timestamp, or date string)
// to a YYYY-MM-DD calendar-day key for timezone-safe range comparison.
export function dayKey(value) {
  if (!value) return '';
  const s = String(value);
  const m = s.match(/^\d{4}-\d{2}-\d{2}/);
  if (m) return m[0];
  const d = new Date(s);
  return isNaN(d) ? '' : d.toISOString().slice(0, 10);
}

// True when `value`'s day falls within [from, to] (either bound optional).
export function inDateRange(value, from, to) {
  if (!from && !to) return true;
  const k = dayKey(value);
  if (!k) return false;
  if (from && k < from) return false;
  if (to && k > to) return false;
  return true;
}

function fmt(d) {
  if (!d) return '…';
  const dt = new Date(d + 'T00:00:00');
  return isNaN(dt) ? d : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

// Chip-style date-range filter matching MultiSelectDropdown. `onChange(from, to)`
// receives YYYY-MM-DD strings (either may be '').
export default function DateRangeFilter({ from = '', to = '', onChange, placeholder = 'All dates' }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const active = !!(from || to);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const panelH = 210, width = 240;
    const top = window.innerHeight - r.bottom > panelH + 8 ? r.bottom + 4 : Math.max(8, r.top - panelH - 4);
    const left = Math.min(r.left, window.innerWidth - width - 8);
    setPos({ top, left: Math.max(8, left) });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (triggerRef.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onScroll = (e) => { if (panelRef.current?.contains(e.target)) return; setOpen(false); };
    document.addEventListener('mousedown', handler);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  const label = active ? `${fmt(from)} – ${fmt(to)}` : placeholder;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 !py-1.5 px-3 text-sm border rounded-lg transition whitespace-nowrap
          ${active ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
      >
        <svg className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-brand-400' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="truncate max-w-[170px]">{label}</span>
        <svg className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''} ${active ? 'text-brand-400' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: 240, zIndex: 9999 }}
          className="bg-white border border-gray-200 rounded-xl shadow-xl p-3 space-y-2.5"
        >
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">From</label>
            <input type="date" value={from} max={to || undefined} onChange={e => onChange(e.target.value, to)} className="w-full !py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">To</label>
            <input type="date" value={to} min={from || undefined} onChange={e => onChange(from, e.target.value)} className="w-full !py-1.5 text-sm" />
          </div>
          {active && (
            <button type="button" onClick={() => onChange('', '')} className="w-full text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg py-1.5 transition">
              Clear dates
            </button>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
