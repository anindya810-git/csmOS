-- ============================================================
-- Create a superadmin login for the Custally platform owner.
--
-- The superadmin panel lives at  /superadmin/login  and is completely
-- separate from normal org users. The multi-tenancy migration creates the
-- `superadmin_users` table but seeds no rows — run this to create your login.
--
-- Requires the pgcrypto extension (Supabase ships with it). crypt(... bf)
-- produces a bcrypt hash that the app's bcryptjs verifies.
--
-- 1. Change the email and password below.
-- 2. Run once in the Supabase SQL editor.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO superadmin_users (name, email, password_hash)
VALUES (
  'Platform Admin',
  'superadmin@custally.com',                       -- ← change this
  crypt('change-me-to-a-strong-password', gen_salt('bf'))  -- ← change this
)
ON CONFLICT (email) DO UPDATE
  SET password_hash = EXCLUDED.password_hash,
      name          = EXCLUDED.name;
