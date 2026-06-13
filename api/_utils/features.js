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
