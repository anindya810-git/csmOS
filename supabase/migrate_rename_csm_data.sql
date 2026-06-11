-- ============================================================
-- Rename stale CSM names in data tables — run in Supabase SQL Editor
--
-- migrate_update_users.sql renamed users' csm_name
-- ('Vaibhav' → 'Vaibhav Bali', 'Amarjeet' → 'Amarjeet Ghatak')
-- but the csm columns on accounts / escalations / issues still
-- hold the old short names, so reports show stale names and the
-- renamed CSMs see no data when they log in.
-- ============================================================

UPDATE public.accounts    SET csm      = 'Vaibhav Bali'    WHERE csm      = 'Vaibhav';
UPDATE public.accounts    SET csm      = 'Amarjeet Ghatak' WHERE csm      = 'Amarjeet';
UPDATE public.accounts    SET csm_lead = 'Vaibhav Bali'    WHERE csm_lead = 'Vaibhav';
UPDATE public.accounts    SET csm_lead = 'Amarjeet Ghatak' WHERE csm_lead = 'Amarjeet';

UPDATE public.escalations SET csm      = 'Vaibhav Bali'    WHERE csm      = 'Vaibhav';
UPDATE public.escalations SET csm      = 'Amarjeet Ghatak' WHERE csm      = 'Amarjeet';

UPDATE public.issues      SET csm      = 'Vaibhav Bali'    WHERE csm      = 'Vaibhav';
UPDATE public.issues      SET csm      = 'Amarjeet Ghatak' WHERE csm      = 'Amarjeet';
UPDATE public.issues      SET csm_lead = 'Vaibhav Bali'    WHERE csm_lead = 'Vaibhav';
UPDATE public.issues      SET csm_lead = 'Amarjeet Ghatak' WHERE csm_lead = 'Amarjeet';

-- Verify: every distinct csm in accounts should match a users.csm_name
SELECT a.csm, COUNT(*) AS accounts,
       EXISTS (SELECT 1 FROM public.users u WHERE u.csm_name = a.csm) AS matches_user
FROM public.accounts a
GROUP BY a.csm
ORDER BY a.csm;
