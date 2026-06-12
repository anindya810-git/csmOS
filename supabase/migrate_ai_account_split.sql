-- Split the combined account "Escalations & Issues" AI summary into two
-- separate summaries (one per section). Run in the Supabase SQL editor.
-- Idempotent — safe to re-run.

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS ai_escalations_summary TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS ai_escalations_summary_at TIMESTAMPTZ;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS ai_escalations_summary_by TEXT;

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS ai_issues_summary TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS ai_issues_summary_at TIMESTAMPTZ;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS ai_issues_summary_by TEXT;
