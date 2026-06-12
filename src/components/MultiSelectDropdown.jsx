import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

export default function MultiSelectDropdown({ options = [], value = [], onChange, placeholder = 'All' }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [search, setSearch] = useState('');
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const searchable = options.length > 8;
  const filtered = search
    ? options.filter(o => String(o).toLowerCase().includes(search.toLowerCase()))
    : options;

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const panelH = Math.min(filtered.length * 36 + (searchable ? 50 : 10) + 40, 330);
    const top = window.innerHeight - r.bottom > panelH + 8 ? r.bottom + 4 : Math.max(8, r.top - panelH - 4);
    // Keep panel inside viewport horizontally
    const width = 210;
    const left = Math.min(r.left, window.innerWidth - width - 8);
    setPos({ top, left: Math.max(8, left) });
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

  const toggle = (opt) => {
    onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt]);
  };

  const label = value.length === 0 ? placeholder : value.length === 1 ? value[0] : `${value.length} selected`;
  const active = value.length > 0;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 !py-1.5 px-3 text-sm border rounded-lg transition whitespace-nowrap max-w-[180px]
          ${active
            ? 'border-brand-400 bg-brand-50 text-brand-700'
            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
          }`}
      >
        <span className="truncate">{label}</span>
        {active && (
          <span className="shrink-0 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold bg-brand-600 text-white rounded-full">
            {value.length}
          </span>
        )}
        <svg className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''} ${active ? 'text-brand-400' : 'text-gray-400'}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: 210, zIndex: 9999 }}
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
          {active && (
            <button type="button" onClick={() => onChange([])}
              className="w-full text-left px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 transition border-b border-gray-100">
              Clear selection ({value.length})
            </button>
          )}
          <div className="py-1 max-h-60 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-sm text-gray-400 italic">No matches</p>
            )}
            {filtered.map(opt => {
              const checked = value.includes(opt);
              return (
                <label key={opt} className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition ${checked ? 'bg-brand-50/60' : 'hover:bg-gray-50'}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggle(opt)}
                    className="!w-auto !h-4 !p-0 !border-0 !rounded !ring-0 shrink-0 accent-brand-600" />
                  <span className={`text-sm truncate ${checked ? 'text-brand-700 font-medium' : 'text-gray-700'}`}>{opt}</span>
                </label>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
