-- ============================================================
-- Per-organisation custom domain (white-label entry point).
--
-- When an org has a custom_domain (e.g. "projectnext.me"), visiting that
-- domain skips the public Custally landing page entirely and lands the
-- visitor directly on a login screen branded with the org's own logo/name.
-- The canonical domain (custally.com) and the Vercel default domain show
-- the normal Custally landing page.
--
-- Stored normalized: lowercase, no protocol, no path/port, no leading "www.".
-- The unique index guarantees one domain maps to at most one org.
--
-- Run once in the Supabase SQL editor.
-- ============================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS custom_domain TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_org_custom_domain
  ON organizations (lower(custom_domain))
  WHERE custom_domain IS NOT NULL;
