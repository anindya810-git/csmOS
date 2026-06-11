import React, { useState, useRef, useEffect } from 'react';

export default function SelectDropdown({ options, value, onChange, placeholder = '— Select —', className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const select = (opt) => { onChange(opt); setOpen(false); };
  const hasValue = value !== '' && value != null;

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition cursor-pointer text-left"
      >
        <span className={hasValue ? 'text-gray-800' : 'text-gray-400'}>{hasValue ? value : placeholder}</span>
        <svg className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''} text-gray-400`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="py-1 max-h-60 overflow-y-auto">
            <button type="button" onClick={() => select('')}
              className={`w-full text-left px-3.5 py-2.5 text-sm transition ${!hasValue ? 'bg-brand-50 text-brand-600 font-medium' : 'text-gray-400 hover:bg-gray-50'}`}>
              {placeholder}
            </button>
            {options.map(opt => (
              <button key={opt} type="button" onClick={() => select(opt)}
                className={`w-full text-left px-3.5 py-2.5 text-sm transition ${value === opt ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}>
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
