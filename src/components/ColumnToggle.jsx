import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

export default function ColumnToggle({ columns, prefs, onToggle }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (triggerRef.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const optional = columns.filter(c => !c.alwaysVisible);
  const hiddenCount = optional.filter(c => prefs[c.key] === false).length;
  const showAll = () => optional.filter(c => prefs[c.key] === false).forEach(c => onToggle(c.key));

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 !py-1.5 px-3 text-sm rounded-lg border transition whitespace-nowrap
          ${hiddenCount > 0
            ? 'border-brand-300 bg-brand-50 text-brand-700'
            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
          }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
        Columns
        {hiddenCount > 0 && (
          <span className="text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full font-semibold">
            {optional.length - hiddenCount}/{optional.length}
          </span>
        )}
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          style={{ position: 'fixed', top: pos.top, right: pos.right, minWidth: 210, zIndex: 9999 }}
          className="bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-3 pt-2.5 pb-2 border-b border-gray-100">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Columns</span>
            {hiddenCount > 0 && (
              <button type="button" onClick={showAll}
                className="text-xs text-brand-600 hover:text-brand-700 hover:underline transition">
                Show all
              </button>
            )}
          </div>
          <div className="py-1.5">
            {columns.map(col => (
              <label key={col.key}
                className={`flex items-center gap-2.5 px-3 py-2.5 select-none transition
                  ${col.alwaysVisible ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}`}>
                <input
                  type="checkbox"
                  checked={prefs[col.key] !== false}
                  disabled={col.alwaysVisible}
                  onChange={() => !col.alwaysVisible && onToggle(col.key)}
                  className="!w-4 !h-4 !p-0 !border-0 !ring-0 shrink-0 accent-brand-600"
                />
                <span className="text-sm text-gray-700">{col.label}</span>
                {col.alwaysVisible && (
                  <span className="ml-auto text-[10px] text-gray-300 font-medium">always</span>
                )}
              </label>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
