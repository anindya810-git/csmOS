-- Allow superadmin (platform owner) accounts to be deactivated.
-- Supports managing multiple superadmins from the superadmin panel.
ALTER TABLE superadmin_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
