import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_S = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_LABELS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function parse(str) {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  return (!y || isNaN(d)) ? null : { y, m: m - 1, d };
}

function toISO(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export default function DatePicker({ value, onChange, placeholder = 'Select date', className = '' }) {
  const now = new Date();
  const todayY = now.getFullYear(), todayM = now.getMonth(), todayD = now.getDate();
  const parsed = parse(value);

  const [open, setOpen] = useState(false);
  const [viewY, setViewY] = useState(parsed?.y ?? todayY);
  const [viewM, setViewM] = useState(parsed?.m ?? todayM);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    // Flip up if not enough space below
    const panelH = 330;
    const top = window.innerHeight - r.bottom > panelH ? r.bottom + 4 : r.top - panelH - 4;
    setPos({ top, left: r.left });
    const p = parse(value);
    if (p) { setViewY(p.y); setViewM(p.m); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
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

  const prevM = () => {
    if (viewM === 0) { setViewM(11); setViewY(y => y - 1); }
    else setViewM(m => m - 1);
  };
  const nextM = () => {
    if (viewM === 11) { setViewM(0); setViewY(y => y + 1); }
    else setViewM(m => m + 1);
  };

  const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
  const firstDay = new Date(viewY, viewM, 1).getDay();
  const daysInPrev = new Date(viewY, viewM, 0).getDate();

  const cells = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ d: daysInPrev - i, m: viewM - 1, y: viewY, faded: true });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ d, m: viewM, y: viewY, faded: false });
  while (cells.length % 7 !== 0) cells.push({ d: cells.length - firstDay - daysInMonth + 1, m: viewM + 1, y: viewY, faded: true });

  const norm = (cell) => {
    let { y, m } = cell;
    if (m < 0) { m = 11; y--; } else if (m > 11) { m = 0; y++; }
    return { y, m };
  };

  const isSel = (cell) => {
    if (!parsed) return false;
    const { y, m } = norm(cell);
    return cell.d === parsed.d && m === parsed.m && y === parsed.y;
  };

  const isToday = (cell) => !cell.faded && cell.d === todayD && cell.m === todayM && cell.y === todayY;

  const selectDay = (cell) => {
    const { y, m } = norm(cell);
    onChange(toISO(y, m, cell.d));
    setOpen(false);
  };

  const displayText = parsed ? `${parsed.d} ${MONTHS_S[parsed.m]} ${parsed.y}` : null;

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition cursor-pointer"
      >
        <span className={displayText ? 'text-gray-800' : 'text-gray-400'}>{displayText || placeholder}</span>
        <div className="flex items-center gap-1.5">
          {displayText && (
            <span role="button" onMouseDown={e => { e.stopPropagation(); onChange(''); }}
              className="text-gray-300 hover:text-red-400 transition cursor-pointer rounded p-0.5">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </span>
          )}
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: 280, zIndex: 9999 }}
          className="bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Month / year nav */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
            <button type="button" onClick={prevM}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-white border border-gray-200 transition">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-bold text-gray-800">{MONTHS[viewM]} {viewY}</span>
            <button type="button" onClick={nextM}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-white border border-gray-200 transition">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day-of-week labels */}
          <div className="grid grid-cols-7 px-3 pt-3 pb-1">
            {DAY_LABELS.map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-gray-400 tracking-widest uppercase">{d}</div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 px-3 pb-2 gap-y-0.5">
            {cells.map((cell, i) => {
              const sel = isSel(cell);
              const tod = isToday(cell);
              let cls = 'h-8 w-full flex items-center justify-center text-[12px] rounded-lg transition font-medium ';
              if (sel) cls += 'bg-brand-600 text-white shadow-sm font-bold ';
              else if (tod) cls += 'ring-2 ring-inset ring-brand-400 text-brand-700 font-bold bg-brand-50/60 ';
              else if (cell.faded) cls += 'text-gray-300 hover:bg-gray-50 ';
              else cls += 'text-gray-700 hover:bg-brand-50 hover:text-brand-700 ';
              return (
                <button key={i} type="button" onClick={() => selectDay(cell)} className={cls}>
                  {cell.d}
                </button>
              );
            })}
          </div>

          {/* Today shortcut */}
          <div className="px-3 pb-3 pt-1 border-t border-gray-50">
            <button type="button"
              onClick={() => { onChange(toISO(todayY, todayM, todayD)); setOpen(false); }}
              className="w-full py-1.5 text-xs font-semibold text-brand-600 border border-brand-200 rounded-lg hover:bg-brand-50 transition">
              Today
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
