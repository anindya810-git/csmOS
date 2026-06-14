import supabase from './supabase.js';

// Per-organisation feature entitlements, toggled by the superadmin.
// Default-on semantics: a feature is enabled unless explicitly set to false,
// so orgs created before this column existed keep everything on.
export const FEATURE_KEYS = [
  'permissions',
  'api_access',
  'ai',
  'custom_reports',
  'advanced_search',
  'bulk_updates',
  'field_management',
  'user_tree_view',
  'column_selection',
  'watchlist',
  'export',
];

// Fetch an org's feature map. Missing column (pre-migration), missing row,
// or missing key all resolve to "enabled".
export async function getOrgFeatures(orgId) {
  if (!orgId) return {};
  const { data } = await supabase
    .from('organizations')
    .select('features')
    .eq('id', orgId)
    .maybeSingle();
  return (data && data.features) || {};
}

export function featureEnabled(features, key) {
  return !features || features[key] !== false;
}

// Org metadata for the app shell (features + branding) in a single round-trip.
// select('*') so a not-yet-migrated column (features / logo_url) never errors
// the whole query — missing fields simply come back undefined.
export async function getOrgMeta(orgId) {
  if (!orgId) return { features: {}, logo_url: null, org_name: null };
  const { data } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .maybeSingle();
  return {
    features: (data && data.features) || {},
    logo_url: (data && data.logo_url) || null,
    org_name: (data && data.name) || null,
  };
}
