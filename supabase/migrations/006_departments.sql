-- ============================================================
-- 006: Setores (departments) — roteamento de conversas por área
-- Seguro de rodar: usa IF NOT EXISTS / ON CONFLICT / IF EXISTS
-- ============================================================

create table if not exists public.departments (
  id          uuid primary key default uuid_generate_v4(),
  company_id  uuid not null references public.companies on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (company_id, name)
);

alter table public.departments enable row level security;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'departments' AND policyname = 'company_isolation'
  ) THEN
    CREATE POLICY "company_isolation" ON public.departments
      USING (company_id = public.my_company_id());
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at ON public.departments;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- atendente pode pertencer a um setor
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments ON DELETE SET NULL;

-- conversa pode ser direcionada a um setor
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS conversations_department_idx
  ON public.conversations (company_id, department_id);

-- realtime
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN VALUES ('departments')
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    EXCEPTION WHEN others THEN
      NULL; -- já está na publicação, ignora
    END;
  END LOOP;
END;
$$;
