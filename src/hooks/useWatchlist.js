import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

function storageKey(userId) {
  return `watchlist_${userId}`;
}

function load(userId) {
  if (!userId) return {};
  try { return JSON.parse(localStorage.getItem(storageKey(userId)) || '{}'); }
  catch { return {}; }
}

export function useWatchlist() {
  const { user } = useAuth();
  const userId = user?.id;
  const [wl, setWl] = useState(() => load(userId));

  useEffect(() => {
    setWl(load(userId));
  }, [userId]);

  useEffect(() => {
    const handler = () => setWl(load(userId));
    window.addEventListener('watchlist-change', handler);
    return () => window.removeEventListener('watchlist-change', handler);
  }, [userId]);

  function isWatched(type, id) {
    return !!(wl[type]?.includes(String(id)));
  }

  function toggle(type, id) {
    if (!userId) return;
    const sid = String(id);
    setWl(prev => {
      const arr = prev[type] || [];
      const next = arr.includes(sid) ? arr.filter(x => x !== sid) : [...arr, sid];
      const newWl = { ...prev, [type]: next };
      localStorage.setItem(storageKey(userId), JSON.stringify(newWl));
      window.dispatchEvent(new Event('watchlist-change'));
      return newWl;
    });
  }

  function getIds(type) {
    return wl[type] || [];
  }

  function totalCount() {
    return Object.values(wl).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
  }

  return { isWatched, toggle, getIds, totalCount };
}
