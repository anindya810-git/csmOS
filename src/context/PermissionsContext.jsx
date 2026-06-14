import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const PermissionsContext = createContext(null);

export const PERM_OBJECTS = [
  { key: 'accounts',         label: 'Accounts' },
  { key: 'escalations',      label: 'Escalations' },
  { key: 'issues',           label: 'Issues' },
  { key: 'tasks',            label: 'Tasks' },
  { key: 'feature_requests', label: 'Feature Requests' },
];
export const PERM_ACTIONS = [
  { key: 'view',   label: 'View' },
  { key: 'create', label: 'Create' },
  { key: 'edit',   label: 'Edit' },
  { key: 'delete', label: 'Delete' },
  { key: 'export', label: 'Export' },
];

const ROLE_BASE = {
  admin:       { view: true, create: true, edit: true, delete: true, export: true },
  csm:         { view: true, create: true, edit: true, delete: true, export: true },
  sales:       { view: true, create: true, edit: true, delete: true, export: true },
  product:     { view: true, create: true, edit: true, delete: true, export: true },
  cx_strategy: { view: true, create: false, edit: false, delete: false, export: true },
  ps:          { view: true, create: true, edit: true, delete: true, export: true },
};

export function getDefaultPermsForRole(role) {
  const base = ROLE_BASE[role] || ROLE_BASE.csm;
  return PERM_OBJECTS.reduce((acc, o) => ({ ...acc, [o.key]: { ...base } }), {});
}

export function PermissionsProvider({ children }) {
  const { user } = useAuth();
  const [rawPerms, setRawPerms] = useState({});

  const loadPerms = () => {
    axios.get('/api/dropdown-config')
      .then(r => {
        const rows = r.data?.role_permissions || [];
        const parsed = {};
        rows.forEach(row => {
          try { parsed[row.value] = JSON.parse(row.parent_value); } catch {}
        });
        setRawPerms(parsed);
      })
      .catch(() => {});
  };

  useEffect(() => { if (user) loadPerms(); }, [user?.id]);

  const getPermsForRole = (role) => {
    if (role === 'admin') return getDefaultPermsForRole('admin');
    const defaults = getDefaultPermsForRole(role);
    const stored = rawPerms[role];
    if (!stored) return defaults;
    const merged = {};
    PERM_OBJECTS.forEach(o => {
      merged[o.key] = { ...defaults[o.key], ...(stored[o.key] || {}) };
    });
    return merged;
  };

  const can = (action, object) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return getPermsForRole(user.role)[object]?.[action] !== false;
  };

  return (
    <PermissionsContext.Provider value={{ can, getPermsForRole, rawPerms, reload: loadPerms }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export const usePermissions = () => useContext(PermissionsContext);
