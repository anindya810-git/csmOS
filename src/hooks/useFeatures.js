import { useAuth } from '../context/AuthContext';

// Per-organisation feature entitlements, set by the superadmin and delivered
// on the user object (login + /api/auth/me). Default-on: a feature is enabled
// unless the org explicitly turned it off, so nothing breaks pre-migration.
export const FEATURE_DEFS = [
  { key: 'permissions',      label: 'Permissions',        desc: 'Role-based permission controls in Settings' },
  { key: 'api_access',       label: 'API Access',         desc: 'REST API keys and the API Access tab' },
  { key: 'ai',               label: 'AI',                 desc: 'AI summaries, next steps and analysis' },
  { key: 'custom_reports',   label: 'Custom Reports',     desc: 'The no-code custom report builder' },
  { key: 'advanced_search',  label: 'Advanced Search',    desc: 'Advanced filter / conditions builder' },
  { key: 'bulk_updates',     label: 'Bulk Updates',       desc: 'Bulk-edit rows across dashboards' },
  { key: 'field_management', label: 'Field Management',   desc: 'Dropdown values & field renaming in Settings' },
  { key: 'user_tree_view',   label: 'User Tree View',     desc: 'Org-chart tree view in Manage Users' },
];

export function useFeatures() {
  const { user } = useAuth();
  const features = user?.features || {};
  const isEnabled = (key) => features[key] !== false;
  return { features, isEnabled };
}
