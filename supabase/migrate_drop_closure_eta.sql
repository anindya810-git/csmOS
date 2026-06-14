-- Remove the deprecated Closure ETA field from accounts.
-- Run once against the live database (e.g. Supabase SQL editor).
ALTER TABLE accounts DROP COLUMN IF EXISTS closure_eta;
