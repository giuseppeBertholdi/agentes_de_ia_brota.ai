-- ============================================================
-- 012: Fila de aprovação assíncrona para desconto fora da política
-- A IA prepara a proposta mas não envia — fica pendente até um humano
-- aprovar (envia o valor pedido) ou recusar (envia o máximo permitido).
-- ============================================================

create table if not exists public.ai_pending_approvals (
  id                  uuid primary key default uuid_generate_v4(),
  company_id          uuid not null references public.companies on delete cascade,
  conversation_id     uuid not null references public.conversations on delete cascade,
  quote_id            uuid references public.quotes on delete set null,
  kind                text not null default 'discount' check (kind in ('discount')),
  requested_items     jsonb not null,
  requested_total     numeric(12,2) not null,
  max_allowed_items   jsonb not null,
  max_allowed_total   numeric(12,2) not null,
  reason              text,
  customer_message    text not null,
  status              text not null default 'pending'
                      check (status in ('pending', 'approved', 'rejected')),
  resolved_by         uuid references public.profiles on delete set null,
  resolved_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- consulta exata que process_message roda a cada turno pra saber se já
-- existe uma aprovação em aberto pra essa conversa
create index if not exists ai_pending_approvals_conversation_pending_idx
  on public.ai_pending_approvals (conversation_id)
  where status = 'pending';

create index if not exists ai_pending_approvals_company_pending_idx
  on public.ai_pending_approvals (company_id)
  where status = 'pending';

alter table public.ai_pending_approvals enable row level security;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ai_pending_approvals' AND policyname = 'company_isolation'
  ) THEN
    CREATE POLICY "company_isolation" ON public.ai_pending_approvals
      USING (company_id = public.my_company_id());
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at ON public.ai_pending_approvals;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.ai_pending_approvals
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- realtime
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN VALUES ('ai_pending_approvals')
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    EXCEPTION WHEN others THEN
      NULL; -- já está na publicação, ignora
    END;
  END LOOP;
END;
$$;
