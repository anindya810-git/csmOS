CREATE TABLE IF NOT EXISTS custom_reports (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT,
  config        JSONB NOT NULL DEFAULT '{}',
  created_by    TEXT,
  created_by_id INTEGER,
  is_public     BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
