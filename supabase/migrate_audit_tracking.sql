-- Last-edited tracking + active-user tracking
-- Run this in the Supabase SQL editor BEFORE deploying the matching code.
-- All statements are idempotent (IF NOT EXISTS), so it is safe to re-run.

-- "Last edited by" stamps. (updated_at already exists on these tables.)
ALTER TABLE issues      ADD COLUMN IF NOT EXISTS updated_by TEXT;
ALTER TABLE escalations ADD COLUMN IF NOT EXISTS updated_by TEXT;
ALTER TABLE accounts    ADD COLUMN IF NOT EXISTS updated_by TEXT;

-- Active / last-active tracking for Manage Users.
ALTER TABLE users       ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;
