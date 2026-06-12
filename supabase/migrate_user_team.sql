-- User "Team" field (India EV, India FS, US, ROW)
-- Run this in the Supabase SQL editor BEFORE deploying the matching code.
-- Idempotent — safe to re-run.

ALTER TABLE users ADD COLUMN IF NOT EXISTS team TEXT;
