import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

// Custom field labels live in dropdown_config as:
//   field_name='field_label', value='<object>.<field>', parent_value='<custom label>'
const FieldLabelsContext = createContext({ label: (o, k, fb) => fb, rows: [], reload: () => {} });

export function FieldLabelsProvider({ children }) {
  const { user } = useAuth();
  const [map, setMap] = useState({});
  const [rows, setRows] = useState([]);

  const reload = useCallback(() => {
    axios.get('/api/dropdown-config')
      .then(r => {
        const list = r.data?.field_label || [];
        const m = {};
        list.forEach(row => { if (row.parent_value) m[row.value] = row.parent_value; });
        setMap(m);
        setRows(list);
      })
      .catch(() => {});
  }, []);

  useEffect(() => { if (user) reload(); }, [user, reload]);

  const label = useCallback((object, key, fallback) => map[`${object}.${key}`] || fallback, [map]);

  return (
    <FieldLabelsContext.Provider value={{ label, rows, reload }}>
      {children}
    </FieldLabelsContext.Provider>
  );
}

export const useFieldLabels = () => useContext(FieldLabelsContext);
