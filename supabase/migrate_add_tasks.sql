-- ============================================================
-- Add Tasks feature — run in Supabase SQL Editor
-- ============================================================

-- 1. Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id              BIGSERIAL PRIMARY KEY,
  task_subject    TEXT NOT NULL,
  task_description TEXT,
  nature_of_task  TEXT,
  due_date        TIMESTAMPTZ NOT NULL,
  account_id      BIGINT REFERENCES public.accounts(id) ON DELETE SET NULL,
  account_name    TEXT,
  assigned_to_id  BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_to     TEXT,        -- display name (csm_name)
  assigned_by_id  BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_by     TEXT,        -- display name of creator
  status          TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'Completed')),
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insert initial nature_of_task dropdown values (idempotent)
INSERT INTO public.dropdown_config (field_name, value, sort_order)
SELECT field_name, value, sort_order FROM (VALUES
  ('nature_of_task'::TEXT, 'War Room'::TEXT,    1),
  ('nature_of_task',       'Cx Meet',           2),
  ('nature_of_task',       'Cx Call',           3),
  ('nature_of_task',       'Cx Training',       4)
) AS t(field_name, value, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.dropdown_config WHERE field_name = 'nature_of_task'
);

-- 3. Verify
SELECT * FROM public.tasks LIMIT 5;
SELECT field_name, value FROM public.dropdown_config WHERE field_name = 'nature_of_task' ORDER BY sort_order;
