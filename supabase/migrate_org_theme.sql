-- Add a single theme_color column to store the org's primary brand hex.
-- The full shade scale (50–900) is generated client-side from this value.
-- Run once in the Supabase SQL editor.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS theme_color TEXT;
