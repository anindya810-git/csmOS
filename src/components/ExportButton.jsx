import React, { useState, useRef, useEffect } from 'react';
import { exportToExcel, exportToPdf } from '../utils/exportData';

export default function ExportButton({ filename, columns, getRows, disabled }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  async function run(type) {
    setOpen(false);
    setBusy(type);
    try {
      const rows = typeof getRows === 'function' ? getRows() : getRows;
      if (type === 'excel') await exportToExcel(filename, columns, rows);
      else await exportToPdf(filename, columns, rows);
    } catch (e) {
      alert('Export failed: ' + e.message);
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        disabled={!!busy || disabled}
        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition disabled:opacity-50"
      >
        {busy ? (
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        )}
        {busy === 'excel' ? 'Exporting…' : busy === 'pdf' ? 'Generating PDF…' : 'Export'}
        {!busy && (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-44 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
          <button
            onClick={() => run('excel')}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
          >
            <span className="text-green-600 font-bold text-xs w-8 text-center bg-green-50 rounded px-1 py-0.5">XLS</span>
            Export to Excel
          </button>
          <button
            onClick={() => run('pdf')}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
          >
            <span className="text-red-600 font-bold text-xs w-8 text-center bg-red-50 rounded px-1 py-0.5">PDF</span>
            Export to PDF
          </button>
        </div>
      )}
    </div>
  );
}
