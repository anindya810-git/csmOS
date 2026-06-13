-- ============================================================
-- Per-organisation feature entitlements.
--
-- Adds a JSONB `features` map to organizations. The superadmin panel
-- toggles individual features off for an org; an absent key means ON
-- (default-on), so existing orgs keep every feature enabled.
--
-- Feature keys:
--   permissions, api_access, ai, custom_reports,
--   advanced_search, bulk_updates, field_management, user_tree_view
--
-- Run once in the Supabase SQL editor.
-- ============================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS features JSONB NOT NULL DEFAULT '{}'::jsonb;
