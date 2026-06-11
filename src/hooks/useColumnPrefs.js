import { useState } from 'react';

export function useColumnPrefs(userEmail, page, defaults) {
  const key = `${userEmail || 'guest'}:cols:${page}`;

  const [prefs, setPrefs] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(key));
      if (stored && typeof stored === 'object') return { ...defaults, ...stored };
    } catch {}
    return { ...defaults };
  });

  const toggle = (col) => {
    setPrefs(p => {
      const next = { ...p, [col]: !p[col] };
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Returns true if column should be shown (defaults to true for any unset column)
  const show = (col) => prefs[col] !== false;

  return { show, toggle, prefs };
}
