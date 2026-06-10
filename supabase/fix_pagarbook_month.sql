-- Fix month field mismatch: Pagarbook escalation dated 2026-06-05 was tagged as 'May' instead of 'June'
UPDATE public.escalations
SET month = 'June'
WHERE account_name = 'Pagarbook'
  AND date_of_escalation = '2026-06-05'
  AND month = 'May';
