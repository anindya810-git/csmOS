-- Sanitize issues.csm to match the CSM tagged to each account.
-- Run once in the Supabase SQL editor.
UPDATE issues i
SET    csm = a.csm
FROM   accounts a
WHERE  i.account_id = a.id
  AND  a.csm IS NOT NULL
  AND  a.csm <> ''
  AND  (i.csm IS DISTINCT FROM a.csm);
