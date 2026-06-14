-- Run this in your Supabase project: Dashboard → SQL Editor → New query → Paste & Run

-- Users (CSMs and admins)
CREATE TABLE IF NOT EXISTS public.users (
  id        BIGSERIAL PRIMARY KEY,
  name      TEXT NOT NULL,
  email     TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role      TEXT DEFAULT 'csm',
  csm_name  TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Accounts (main data table)
CREATE TABLE IF NOT EXISTS public.accounts (
  id          BIGSERIAL PRIMARY KEY,
  account_name TEXT NOT NULL,
  tenant_id   TEXT,
  industry    TEXT,
  mrr_tier    TEXT,
  mrr         NUMERIC DEFAULT 0,
  region      TEXT,
  csm_lead    TEXT,
  csm         TEXT,
  cp          TEXT,
  tam_assigned TEXT,
  billing_frequency TEXT,
  renewal_date TEXT,
  renewal_status TEXT,
  churn_status TEXT,
  churn_reason TEXT,
  renewal_comments TEXT,
  implementation_status TEXT,
  implementation_type TEXT,
  ps_engagement TEXT,
  ps_solutioning TEXT,
  account_understanding_session TEXT,
  new_csm_intro_done TEXT,
  csm_escalation_matrix_shared TEXT,
  ring_fence_meeting_initiated TEXT,
  meeting_planned_date TEXT,
  meeting_done TEXT,
  issue_mapping_sheet_updated TEXT,
  review_cadence_alignment TEXT,
  adoption_score NUMERIC,
  stickiness_score NUMERIC,
  rag_status  TEXT DEFAULT 'Green',
  rag_reason  TEXT,
  actions_taken TEXT,
  contraction_risk TEXT DEFAULT 'No',
  churn_risk  TEXT DEFAULT 'No',
  grr         NUMERIC,
  nps         NUMERIC,
  adoption_rate NUMERIC,
  sa_status   TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Activity log (audit trail for edits)
CREATE TABLE IF NOT EXISTS public.activity_log (
  id         BIGSERIAL PRIMARY KEY,
  account_id BIGINT REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id    BIGINT REFERENCES public.users(id),
  action     TEXT,
  changes    JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common filter queries
CREATE INDEX IF NOT EXISTS idx_accounts_csm        ON public.accounts(csm);
CREATE INDEX IF NOT EXISTS idx_accounts_rag_status ON public.accounts(rag_status);
CREATE INDEX IF NOT EXISTS idx_accounts_industry   ON public.accounts(industry);
CREATE INDEX IF NOT EXISTS idx_accounts_region     ON public.accounts(region);
CREATE INDEX IF NOT EXISTS idx_accounts_name       ON public.accounts USING gin(to_tsvector('english', account_name));

-- Disable Row Level Security (we use service role key from the API, so RLS is bypassed)
ALTER TABLE public.users        DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts     DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log DISABLE ROW LEVEL SECURITY;
