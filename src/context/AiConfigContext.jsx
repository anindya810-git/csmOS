import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

// Frontend-safe AI config (no raw keys). Used to enable/grey-out AI controls
// and to surface the active provider + custom prompts in Settings.
const AiConfigContext = createContext({ ai: null, reload: () => {} });

export function AiConfigProvider({ children }) {
  const { user } = useAuth();
  const [ai, setAi] = useState(null);

  const reload = useCallback(() => {
    return axios.get('/api/dropdown-config')
      .then(r => { setAi(r.data?.__ai || null); return r.data?.__ai || null; })
      .catch(() => null);
  }, []);

  useEffect(() => { if (user) reload(); }, [user, reload]);

  return (
    <AiConfigContext.Provider value={{ ai, reload }}>
      {children}
    </AiConfigContext.Provider>
  );
}

export const useAiConfig = () => useContext(AiConfigContext);
