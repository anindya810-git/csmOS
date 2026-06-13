import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/superadminAxios';

const SuperadminAuthContext = createContext(null);

export function SuperadminAuthProvider({ children }) {
  const [admin, setAdmin]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem('superadmin_admin');
    if (raw && localStorage.getItem('superadmin_token')) {
      try { setAdmin(JSON.parse(raw)); } catch {}
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/api/superadmin?action=login', { email, password });
    localStorage.setItem('superadmin_token', data.token);
    localStorage.setItem('superadmin_admin', JSON.stringify(data.admin));
    setAdmin(data.admin);
    return data.admin;
  };

  const logout = () => {
    localStorage.removeItem('superadmin_token');
    localStorage.removeItem('superadmin_admin');
    setAdmin(null);
  };

  return (
    <SuperadminAuthContext.Provider value={{ admin, loading, login, logout }}>
      {children}
    </SuperadminAuthContext.Provider>
  );
}

export const useSuperadminAuth = () => useContext(SuperadminAuthContext);
