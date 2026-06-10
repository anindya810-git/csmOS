-- ============================================================
-- User updates — run in Supabase SQL Editor
-- ============================================================

UPDATE public.users SET name = 'Vaibhav Bali',          email = 'vaibhav.bali@leadsquared.com'        WHERE email = 'vaibhav@leadsquared.com';
UPDATE public.users SET name = 'Amarjeet Ghatak',        email = 'amarjeet.ghatak@leadsquared.com'     WHERE email = 'amarjeet@leadsquared.com';
UPDATE public.users SET name = 'Anindya Roy Chowdhury',  email = 'anindya.roy@leadsquared.com'         WHERE email = 'anindya@leadsquared.com';
UPDATE public.users SET                                   email = 'bhoomit.rajvir@leadsquared.com'      WHERE email = 'bhoomit.ahlawat@leadsquared.com';

-- Also update csm_name used for account filtering
UPDATE public.users SET csm_name = 'Vaibhav Bali'   WHERE email = 'vaibhav.bali@leadsquared.com';
UPDATE public.users SET csm_name = 'Amarjeet Ghatak' WHERE email = 'amarjeet.ghatak@leadsquared.com';

-- New admin: Vivek Sridhar (password: Admin@123)
INSERT INTO public.users (name, email, password_hash, role, csm_name)
VALUES (
  'Vivek Sridhar',
  'vivek.sridhar@leadsquared.com',
  '$2a$10$w8DuLx.hH.VdfcMM/E0GC.M8mERV2G.M4i3ZFMBleIl0iCNBOWkZa',
  'admin',
  NULL
) ON CONFLICT (email) DO NOTHING;
