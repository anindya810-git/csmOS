-- ============================================================
-- Rename stale CSM names in data tables — run in Supabase SQL Editor
--
-- migrate_update_users.sql renamed users' csm_name
-- ('Vaibhav' → 'Vaibhav Bali', 'Amarjeet' → 'Amarjeet Ghatak')
-- but the csm columns on accounts / escalations / issues still
-- hold the old short names, so reports show stale names and the
-- renamed CSMs see no data when they log in.
--
-- Also: CSM Lead must be an admin, not a CSM. Fix Anindya's
-- display name and clear any accounts/issues where a CSM was
-- incorrectly set as CSM Lead.
-- ============================================================

-- 1. Fix Anindya's csm_name to match her updated display name
UPDATE public.users
SET csm_name = 'Anindya Roy Chowdhury'
WHERE email = 'anindya.roy@leadsquared.com';

-- 2. Rename stale CSM short-names in accounts.csm column
UPDATE public.accounts SET csm      = 'Vaibhav Bali'    WHERE csm      = 'Vaibhav';
UPDATE public.accounts SET csm      = 'Amarjeet Ghatak' WHERE csm      = 'Amarjeet';

-- 3. Fix Anindya's name as CSM Lead (rename old short name)
UPDATE public.accounts SET csm_lead = 'Anindya Roy Chowdhury' WHERE csm_lead = 'Anindya';

-- 4. CSM Lead must be an admin. Clear any CSM set as CSM Lead.
UPDATE public.accounts SET csm_lead = NULL
WHERE csm_lead IN ('Vaibhav','Vaibhav Bali','Amarjeet','Amarjeet Ghatak',
                   'Abhishek Bhargav','Bhoomit Ahlawat','Nikhil Chand',
                   'Poorva Pandya','Suchi Chadha');

-- 5. Rename stale CSM short-names in escalations.csm column
UPDATE public.escalations SET csm = 'Vaibhav Bali'    WHERE csm = 'Vaibhav';
UPDATE public.escalations SET csm = 'Amarjeet Ghatak' WHERE csm = 'Amarjeet';

-- 6. Rename stale CSM short-names in issues.csm column
UPDATE public.issues SET csm      = 'Vaibhav Bali'    WHERE csm      = 'Vaibhav';
UPDATE public.issues SET csm      = 'Amarjeet Ghatak' WHERE csm      = 'Amarjeet';

-- 7. Fix Anindya's name as CSM Lead in issues; clear CSMs as CSM Lead
UPDATE public.issues SET csm_lead = 'Anindya Roy Chowdhury' WHERE csm_lead = 'Anindya';
UPDATE public.issues SET csm_lead = NULL
WHERE csm_lead IN ('Vaibhav','Vaibhav Bali','Amarjeet','Amarjeet Ghatak',
                   'Abhishek Bhargav','Bhoomit Ahlawat','Nikhil Chand',
                   'Poorva Pandya','Suchi Chadha');

-- Verify: every distinct csm in accounts should match a users.csm_name
SELECT a.csm, COUNT(*) AS accounts,
       EXISTS (SELECT 1 FROM public.users u WHERE u.csm_name = a.csm) AS matches_user
FROM public.accounts a
GROUP BY a.csm
ORDER BY a.csm;

-- Verify: csm_lead in accounts should only be admin users
SELECT DISTINCT a.csm_lead, u.role
FROM public.accounts a
LEFT JOIN public.users u ON u.name = a.csm_lead
WHERE a.csm_lead IS NOT NULL
ORDER BY a.csm_lead;
