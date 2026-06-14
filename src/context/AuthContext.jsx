import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { applyTheme } from '../utils/colorTheme';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      axios.get('/api/auth/me')
        .then(r => setUser(r.data))
        .catch(() => { localStorage.removeItem('token'); delete axios.defaults.headers.common['Authorization']; })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Heartbeat: re-ping /api/auth/me so the server keeps last_active_at fresh
  // while the tab is open. Skips while the tab is hidden to avoid noise.
  useEffect(() => {
    const beat = () => {
      if (document.visibilityState === 'hidden') return;
      if (!localStorage.getItem('token')) return;
      axios.get('/api/auth/me').catch(() => {});
    };
    const interval = setInterval(beat, 120000);
    document.addEventListener('visibilitychange', beat);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', beat); };
  }, []);

  // Apply or remove the org's brand color whenever the user changes.
  useEffect(() => { applyTheme(user?.org_theme || null); }, [user?.org_theme]);

  const login = async (email, password) => {
    const r = await axios.post('/api/auth/login', { email, password });
    localStorage.setItem('token', r.data.token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${r.data.token}`;
    setUser(r.data.user);
    applyTheme(r.data.user?.org_theme || null);
    return r.data.user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    applyTheme(null);
  };

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
