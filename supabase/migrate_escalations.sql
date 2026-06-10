-- Run ONLY this in Supabase SQL Editor (no complex data, just schema)
CREATE TABLE IF NOT EXISTS public.escalations (
  id BIGSERIAL PRIMARY KEY,
  account_id BIGINT REFERENCES public.accounts(id) ON DELETE SET NULL,
  tenant_id TEXT,
  account_name TEXT,
  date_of_escalation DATE,
  month TEXT,
  description TEXT,
  action_taken TEXT,
  ownership TEXT,
  status TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Partly Resolved', 'Resolved')),
  csm TEXT,
  eta TEXT,
  email_subject TEXT,
  ps_leader TEXT,
  escalated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_escalations_account_id ON public.escalations(account_id);
CREATE INDEX IF NOT EXISTS idx_escalations_status ON public.escalations(status);
CREATE INDEX IF NOT EXISTS idx_escalations_csm ON public.escalations(csm);
