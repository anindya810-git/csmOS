import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';

// Options can be plain strings or { value, label } objects
const norm = (opt) => (opt && typeof opt === 'object') ? opt : { value: opt, label: String(opt) };

export default function SelectDropdown({
  options = [], value, onChange,
  placeholder = '— Select —',
  className = '',
  compact = false,
  clearable = true,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const [search, setSearch] = useState('');
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const opts = useMemo(() => options.map(norm), [options]);
  const searchable = opts.length > 10;
  const filtered = search
    ? opts.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : opts;

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const panelH = Math.min(filtered.length * 38 + (searchable ? 50 : 10) + (clearable ? 38 : 0), 290);
    const top = window.innerHeight - r.bottom > panelH + 8 ? r.bottom + 4 : Math.max(8, r.top - panelH - 4);
    setPos({ top, left: r.left, width: Math.max(r.width, compact ? 160 : r.width) });
  }, [open]);

  useEffect(() => {
    if (!open) { setSearch(''); return; }
    const handler = (e) => {
      if (triggerRef.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onScroll = (e) => {
      if (panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  const select = (v) => { onChange(v); setOpen(false); };
  const hasValue = value !== '' && value != null;
  const selectedLabel = hasValue ? (opts.find(o => String(o.value) === String(value))?.label ?? String(value)) : null;

  const triggerCls = compact
    ? 'w-full flex items-center justify-between gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed'
    : 'w-full flex items-center justify-between px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className={`relative ${className}`}>
      <button ref={triggerRef} type="button" disabled={disabled} onClick={() => setOpen(o => !o)} className={triggerCls}>
        <span className={`truncate ${hasValue ? 'text-gray-800' : 'text-gray-400'}`}>{hasValue ? selectedLabel : placeholder}</span>
        <svg className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''} text-gray-400`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
          className="bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
        >
          {searchable && (
            <div className="p-2 border-b border-gray-100">
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-full !py-1.5 !px-2.5 text-sm !rounded-lg"
                onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }}
              />
            </div>
          )}
          <div className="py-1 max-h-60 overflow-y-auto">
            {clearable && !search && (
              <button type="button" onClick={() => select('')}
                className={`w-full text-left px-3.5 py-2.5 text-sm transition ${!hasValue ? 'bg-brand-50 text-brand-600 font-medium' : 'text-gray-400 hover:bg-gray-50'}`}>
                {placeholder}
              </button>
            )}
            {filtered.length === 0 && (
              <p className="px-3.5 py-2.5 text-sm text-gray-400 italic">No matches</p>
            )}
            {filtered.map(o => (
              <button key={String(o.value)} type="button" onClick={() => select(o.value)}
                className={`w-full text-left px-3.5 py-2.5 text-sm transition ${String(value) === String(o.value) ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
