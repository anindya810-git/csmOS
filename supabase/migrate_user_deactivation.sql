-- ============================================================
-- User deactivation.
--
-- Adds an `is_active` flag to users. Deactivated users (is_active = false)
-- are blocked at login and on every /api/auth/me check, so any open session
-- is ended within ~2 minutes. Default true, so all existing users stay active.
--
-- Run once in the Supabase SQL editor.
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
