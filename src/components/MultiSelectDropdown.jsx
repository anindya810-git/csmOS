import React, { useState, useRef, useEffect } from 'react';

export default function MultiSelectDropdown({ options, value = [], onChange, placeholder = 'All' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggle = (opt) => {
    onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt]);
  };

  const label = value.length === 0 ? placeholder : value.length === 1 ? value[0] : `${value.length} selected`;
  const active = value.length > 0;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 !py-1.5 px-3 text-sm border rounded-lg transition whitespace-nowrap
          ${active
            ? 'border-brand-400 bg-brand-50 text-brand-700'
            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
          }`}
      >
        <span>{label}</span>
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''} ${active ? 'text-brand-400' : 'text-gray-400'}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[170px] overflow-hidden">
          {active && (
            <button type="button" onClick={() => onChange([])}
              className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition border-b border-gray-100">
              Clear selection
            </button>
          )}
          <div className="py-1 max-h-60 overflow-y-auto">
            {options.map(opt => (
              <label key={opt} className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer transition">
                <input type="checkbox" checked={value.includes(opt)} onChange={() => toggle(opt)}
                  className="!w-auto !h-4 !p-0 !border-0 !rounded !ring-0 shrink-0 accent-brand-600" />
                <span className="text-sm text-gray-700">{opt}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
