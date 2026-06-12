-- AI (BYOK) configuration + per-object generated summaries.
-- Run in the Supabase SQL editor BEFORE deploying. Idempotent.

-- Flat key/value store for AI settings: provider, key_<provider>,
-- model_<provider>, prompt_<section>. Raw keys never leave the server.
CREATE TABLE IF NOT EXISTS ai_config (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- Persisted, manually-refreshed AI outputs.
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS ai_summary_at TIMESTAMPTZ;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS ai_summary_by TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS ai_esc_iss_summary TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS ai_esc_iss_summary_at TIMESTAMPTZ;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS ai_esc_iss_summary_by TEXT;

ALTER TABLE feature_requests ADD COLUMN IF NOT EXISTS ai_recommendation TEXT;
ALTER TABLE feature_requests ADD COLUMN IF NOT EXISTS ai_recommendation_at TIMESTAMPTZ;
ALTER TABLE feature_requests ADD COLUMN IF NOT EXISTS ai_recommendation_by TEXT;

ALTER TABLE issues ADD COLUMN IF NOT EXISTS ai_next_steps TEXT;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS ai_next_steps_at TIMESTAMPTZ;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS ai_next_steps_by TEXT;

ALTER TABLE escalations ADD COLUMN IF NOT EXISTS ai_next_steps TEXT;
ALTER TABLE escalations ADD COLUMN IF NOT EXISTS ai_next_steps_at TIMESTAMPTZ;
ALTER TABLE escalations ADD COLUMN IF NOT EXISTS ai_next_steps_by TEXT;
