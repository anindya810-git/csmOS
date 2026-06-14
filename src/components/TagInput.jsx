import React, { useRef, useState } from 'react';

// Multi-value chip input. Stores and emits a comma-separated string so it stays
// fully compatible with the existing TEXT tenant_id column and every place that
// displays or searches it as plain text — no schema or API change needed.
//
//   value:    comma-separated string  (e.g. "5528, 5529")
//   onChange: receives the updated comma-separated string
export default function TagInput({ value = '', onChange, placeholder = '', className = '' }) {
  const [input, setInput] = useState('');
  const inputRef = useRef(null);

  const tags = String(value || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  // De-dupe (case-insensitive) while preserving order, then emit.
  const commit = (next) => {
    const seen = new Set();
    const clean = next
      .map(s => s.trim())
      .filter(s => {
        if (!s) return false;
        const k = s.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    onChange(clean.join(', '));
  };

  const addFromText = (text) => {
    const parts = text.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length) commit([...tags, ...parts]);
  };

  const handleChange = (e) => {
    const v = e.target.value;
    // Typing or pasting a comma finalises the segments before it.
    if (v.includes(',')) {
      const segs = v.split(',');
      const trailing = segs.pop();
      const additions = segs.map(s => s.trim()).filter(Boolean);
      if (additions.length) commit([...tags, ...additions]);
      setInput(trailing);
    } else {
      setInput(v);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (input.trim()) { addFromText(input); setInput(''); }
    } else if (e.key === 'Backspace' && !input && tags.length) {
      e.preventDefault();
      commit(tags.slice(0, -1));
    }
  };

  const handleBlur = () => {
    if (input.trim()) { addFromText(input); setInput(''); }
  };

  const removeAt = (i) => commit(tags.filter((_, idx) => idx !== i));

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className={`w-full flex flex-wrap items-center gap-1.5 px-2.5 py-2 min-h-[42px] border border-gray-200 rounded-xl bg-gray-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-200 focus-within:border-brand-400 transition cursor-text ${className}`}
    >
      {tags.map((t, i) => (
        <span key={`${t}-${i}`} className="inline-flex items-center gap-1 bg-brand-50 text-brand-700 text-xs font-medium pl-2.5 pr-1 py-1 rounded-lg">
          <span className="font-mono">{t}</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeAt(i); }}
            className="w-4 h-4 flex items-center justify-center rounded text-brand-400 hover:text-brand-700 hover:bg-brand-100 transition"
            aria-label={`Remove ${t}`}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={tags.length ? 'Add another…' : placeholder}
        className="flex-1 !w-auto min-w-[80px] !border-0 !bg-transparent !px-0 !py-0 !rounded-none !ring-0 focus:!ring-0 outline-none text-sm placeholder:text-gray-300"
      />
    </div>
  );
}
