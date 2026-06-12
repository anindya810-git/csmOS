-- Feature Requests
CREATE TABLE IF NOT EXISTS feature_requests (
  id                    BIGSERIAL PRIMARY KEY,
  title                 TEXT NOT NULL,
  description           TEXT,
  related_to            TEXT,
  priority              TEXT NOT NULL DEFAULT 'P2',
  expected_rollout_date DATE,
  status                TEXT NOT NULL DEFAULT 'pending',
  created_by_id         BIGINT,
  created_by            TEXT,
  approved_by_id        BIGINT,
  approved_by           TEXT,
  approved_at           TIMESTAMPTZ,
  rejection_reason      TEXT,
  approval_task_id      BIGINT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Linked escalations / issues
CREATE TABLE IF NOT EXISTS feature_request_links (
  id                  BIGSERIAL PRIMARY KEY,
  feature_request_id  BIGINT NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
  link_type           TEXT NOT NULL CHECK (link_type IN ('escalation', 'issue')),
  linked_id           BIGINT NOT NULL,
  account_id          BIGINT,
  account_name        TEXT,
  mrr                 NUMERIC,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Allow null due_date so system-created approval tasks don't need a date
ALTER TABLE tasks ALTER COLUMN due_date DROP NOT NULL;

-- Initial dropdown values for FR Related To
INSERT INTO dropdown_config (field_name, value, sort_order) VALUES
  ('fr_related_to', 'Platform', 1),
  ('fr_related_to', 'SIERA', 2),
  ('fr_related_to', 'Forms', 3),
  ('fr_related_to', 'Automation', 4),
  ('fr_related_to', 'Converse', 5),
  ('fr_related_to', 'OMS', 6),
  ('fr_related_to', 'Connectors', 7),
  ('fr_related_to', 'Telephony', 8),
  ('fr_related_to', 'UDS', 9),
  ('fr_related_to', 'Portal', 10),
  ('fr_related_to', 'Payments', 11),
  ('fr_related_to', 'Document Designer', 12),
  ('fr_related_to', 'LOS', 13),
  ('fr_related_to', 'Publisher Panel', 14),
  ('fr_related_to', 'PJP', 15),
  ('fr_related_to', 'Invorto', 16),
  ('fr_related_to', 'Flostack', 17)
ON CONFLICT DO NOTHING;

-- Feature Request as a task type
INSERT INTO dropdown_config (field_name, value, sort_order) VALUES
  ('nature_of_task', 'Feature Request', 999)
ON CONFLICT DO NOTHING;
