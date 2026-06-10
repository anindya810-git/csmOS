-- Run this in Supabase SQL Editor before seeding data.
-- Project: https://app.supabase.com/project/tcduvikesxhbjkwqdkfk/sql

CREATE TABLE IF NOT EXISTS issues (
  id              bigserial    PRIMARY KEY,
  account_id      bigint       REFERENCES accounts(id) ON DELETE SET NULL,
  account_name    text,
  tenant_id       text,
  csm_lead        text,
  csm             text,
  description     text         NOT NULL,
  priority        text,
  owner_team      text,
  support_ticket  bigint,
  dev_ticket      bigint,
  issue_type      text,
  issue_sub_type  text,
  reported_date   date,
  closure_date    text,
  status          text         NOT NULL DEFAULT 'Open',
  next_steps      text,
  created_at      timestamptz  DEFAULT now(),
  updated_at      timestamptz  DEFAULT now()
);

CREATE INDEX IF NOT EXISTS issues_account_id_idx  ON issues(account_id);
CREATE INDEX IF NOT EXISTS issues_status_idx      ON issues(status);
CREATE INDEX IF NOT EXISTS issues_priority_idx    ON issues(priority);
CREATE INDEX IF NOT EXISTS issues_csm_idx         ON issues(csm);
CREATE INDEX IF NOT EXISTS issues_issue_type_idx  ON issues(issue_type);
CREATE INDEX IF NOT EXISTS issues_reported_date_idx ON issues(reported_date DESC);
