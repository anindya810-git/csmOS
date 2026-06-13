-- ============================================================
-- Per-organisation logo.
--
-- Stores a public URL to the org's uploaded logo (in the `org-logos`
-- Supabase Storage bucket, created automatically on first upload). When set,
-- it replaces the Custally logo in the app header for that org's users.
--
-- Run once in the Supabase SQL editor.
-- ============================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS logo_url TEXT;
