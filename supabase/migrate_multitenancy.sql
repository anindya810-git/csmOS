-- Multi-tenancy migration for csmOS
-- Run this in your Supabase SQL editor BEFORE deploying the new code.

-- 1. Superadmin users (completely separate from org users; managed by the platform owner)
CREATE TABLE IF NOT EXISTS superadmin_users (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

-- 2. Organizations (one row per client)
CREATE TABLE IF NOT EXISTS organizations (
  id             BIGSERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  slug           TEXT UNIQUE NOT NULL,
  plan           TEXT NOT NULL DEFAULT 'trial',        -- trial | starter | pro | enterprise
  billing_status TEXT NOT NULL DEFAULT 'active',       -- active | suspended | cancelled
  user_limit     INTEGER NOT NULL DEFAULT 10,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Seed the first organization.
--    All existing data will be assigned to org_id = 1.
--    ⚠️  Update the name/slug to match your actual org before running.
INSERT INTO organizations (name, slug, plan, billing_status, user_limit)
VALUES ('My Organisation', 'default', 'enterprise', 'active', 200)
ON CONFLICT (slug) DO NOTHING;

-- 4. Add org_id to every data table. Defaults to 1 so existing rows are
--    automatically assigned to the first (and only) org.

-- users
ALTER TABLE users ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES organizations(id) DEFAULT 1;
UPDATE users SET org_id = 1 WHERE org_id IS NULL;
ALTER TABLE users ALTER COLUMN org_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(org_id);

-- accounts
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES organizations(id) DEFAULT 1;
UPDATE accounts SET org_id = 1 WHERE org_id IS NULL;
ALTER TABLE accounts ALTER COLUMN org_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_org_id ON accounts(org_id);

-- escalations
ALTER TABLE escalations ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES organizations(id) DEFAULT 1;
UPDATE escalations SET org_id = 1 WHERE org_id IS NULL;
ALTER TABLE escalations ALTER COLUMN org_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_escalations_org_id ON escalations(org_id);

-- issues
ALTER TABLE issues ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES organizations(id) DEFAULT 1;
UPDATE issues SET org_id = 1 WHERE org_id IS NULL;
ALTER TABLE issues ALTER COLUMN org_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_issues_org_id ON issues(org_id);

-- tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES organizations(id) DEFAULT 1;
UPDATE tasks SET org_id = 1 WHERE org_id IS NULL;
ALTER TABLE tasks ALTER COLUMN org_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_org_id ON tasks(org_id);

-- feature_requests
ALTER TABLE feature_requests ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES organizations(id) DEFAULT 1;
UPDATE feature_requests SET org_id = 1 WHERE org_id IS NULL;
ALTER TABLE feature_requests ALTER COLUMN org_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feature_requests_org_id ON feature_requests(org_id);

-- feature_request_links
ALTER TABLE feature_request_links ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES organizations(id) DEFAULT 1;
UPDATE feature_request_links SET org_id = 1 WHERE org_id IS NULL;
ALTER TABLE feature_request_links ALTER COLUMN org_id SET NOT NULL;

-- activity_log
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES organizations(id) DEFAULT 1;
UPDATE activity_log SET org_id = 1 WHERE org_id IS NULL;
ALTER TABLE activity_log ALTER COLUMN org_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activity_log_org_id ON activity_log(org_id);

-- api_keys
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES organizations(id) DEFAULT 1;
UPDATE api_keys SET org_id = 1 WHERE org_id IS NULL;
ALTER TABLE api_keys ALTER COLUMN org_id SET NOT NULL;

-- dropdown_config
ALTER TABLE dropdown_config ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES organizations(id) DEFAULT 1;
UPDATE dropdown_config SET org_id = 1 WHERE org_id IS NULL;
ALTER TABLE dropdown_config ALTER COLUMN org_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dropdown_config_org_id ON dropdown_config(org_id);

-- ai_config — has TEXT primary key; change to composite (org_id, key)
ALTER TABLE ai_config ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES organizations(id) DEFAULT 1;
UPDATE ai_config SET org_id = 1 WHERE org_id IS NULL;
ALTER TABLE ai_config DROP CONSTRAINT IF EXISTS ai_config_pkey;
ALTER TABLE ai_config ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE ai_config ADD PRIMARY KEY (org_id, key);

-- custom_reports
ALTER TABLE custom_reports ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES organizations(id) DEFAULT 1;
UPDATE custom_reports SET org_id = 1 WHERE org_id IS NULL;
ALTER TABLE custom_reports ALTER COLUMN org_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_custom_reports_org_id ON custom_reports(org_id);
