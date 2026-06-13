-- ============================================================
-- Sanitize escalations & issues so CSM / CSM Lead / Tenant ID /
-- Account name always match the linked account.
--
-- The API now derives these from the account at read time, so the
-- dashboards are already correct. This one-time backfill makes the
-- STORED values consistent too, so saved reports, advanced filters,
-- the CSM access filter and AI context all line up with the account.
--
-- Safe to re-run. Run once in the Supabase SQL editor.
-- ============================================================

-- ---- ESCALATIONS ----
UPDATE escalations e
SET    account_name = a.account_name,
       tenant_id    = a.tenant_id,
       csm          = COALESCE(NULLIF(a.csm, ''), e.csm)
FROM   accounts a
WHERE  e.account_id = a.id
  AND (e.account_name IS DISTINCT FROM a.account_name
    OR e.tenant_id    IS DISTINCT FROM a.tenant_id
    OR (a.csm IS NOT NULL AND a.csm <> '' AND e.csm IS DISTINCT FROM a.csm));

-- ---- ISSUES ----
UPDATE issues i
SET    account_name = a.account_name,
       tenant_id    = a.tenant_id,
       csm          = COALESCE(NULLIF(a.csm, ''), i.csm),
       csm_lead     = COALESCE(NULLIF(a.csm_lead, ''), i.csm_lead)
FROM   accounts a
WHERE  i.account_id = a.id
  AND (i.account_name IS DISTINCT FROM a.account_name
    OR i.tenant_id    IS DISTINCT FROM a.tenant_id
    OR (a.csm IS NOT NULL AND a.csm <> '' AND i.csm IS DISTINCT FROM a.csm)
    OR (a.csm_lead IS NOT NULL AND a.csm_lead <> '' AND i.csm_lead IS DISTINCT FROM a.csm_lead));
