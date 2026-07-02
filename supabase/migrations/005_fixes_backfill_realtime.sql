-- ============================================================
-- 005: Backfill, realtime e correções de schema
-- Seguro de rodar: usa IF NOT EXISTS, ON CONFLICT e IF EXISTS
-- ============================================================

-- ── 1. Garante que cada usuário auth tem profile + company ────────────────────
DO $$
DECLARE
  u      RECORD;
  slug   TEXT;
  cid    UUID;
BEGIN
  FOR u IN
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.id = au.id
    WHERE p.id IS NULL
  LOOP
    slug := split_part(u.email, '@', 1) || '-' || substr(u.id::text, 1, 6);

    -- garante slug único sem colisão
    WHILE EXISTS (SELECT 1 FROM public.companies WHERE companies.slug = slug) LOOP
      slug := slug || '-x';
    END LOOP;

    INSERT INTO public.companies (name, slug)
    VALUES (
      coalesce(u.raw_user_meta_data->>'company_name', split_part(u.email, '@', 1)),
      slug
    )
    RETURNING id INTO cid;

    INSERT INTO public.profiles (id, company_id, full_name)
    VALUES (
      u.id,
      cid,
      coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END;
$$;

-- ── 2. Garante que perfis existentes sem company_id ganhem uma empresa ─────────
DO $$
DECLARE
  p      RECORD;
  u_email TEXT;
  slug    TEXT;
  cid     UUID;
BEGIN
  FOR p IN
    SELECT pr.id FROM public.profiles pr WHERE pr.company_id IS NULL
  LOOP
    SELECT email INTO u_email FROM auth.users WHERE id = p.id;
    IF u_email IS NULL THEN CONTINUE; END IF;

    slug := split_part(u_email, '@', 1) || '-' || substr(p.id::text, 1, 6);
    WHILE EXISTS (SELECT 1 FROM public.companies WHERE companies.slug = slug) LOOP
      slug := slug || '-x';
    END LOOP;

    INSERT INTO public.companies (name, slug)
    VALUES (split_part(u_email, '@', 1), slug)
    RETURNING id INTO cid;

    UPDATE public.profiles SET company_id = cid WHERE id = p.id;
  END LOOP;
END;
$$;

-- ── 3. Seed agent_configs padrão para empresas sem nenhuma config ─────────────
INSERT INTO public.agent_configs (company_id, agent_type, enabled)
SELECT c.id, v.agent_type, true
FROM public.companies c
CROSS JOIN (VALUES ('receptionist'), ('quote')) AS v(agent_type)
WHERE NOT EXISTS (
  SELECT 1 FROM public.agent_configs ac
  WHERE ac.company_id = c.id AND ac.agent_type = v.agent_type
);

-- ── 4. whatsapp_instances: remove coluna legada se ainda existir ──────────────
ALTER TABLE public.whatsapp_instances
  DROP COLUMN IF EXISTS instance_name,
  DROP COLUMN IF EXISTS qr_code,
  DROP COLUMN IF EXISTS webhook_url;

-- adiciona colunas Cloud API se ausentes
ALTER TABLE public.whatsapp_instances
  ADD COLUMN IF NOT EXISTS waba_id             text,
  ADD COLUMN IF NOT EXISTS phone_number_id     text,
  ADD COLUMN IF NOT EXISTS display_phone_number text,
  ADD COLUMN IF NOT EXISTS verified_name       text;

-- remove phone_number genérico (substituído por display_phone_number)
ALTER TABLE public.whatsapp_instances
  DROP COLUMN IF EXISTS phone_number;

-- garante constraint de status correta
ALTER TABLE public.whatsapp_instances
  DROP CONSTRAINT IF EXISTS whatsapp_instances_status_check;
ALTER TABLE public.whatsapp_instances
  ADD CONSTRAINT whatsapp_instances_status_check
  CHECK (status IN ('connected', 'disconnected'));

-- ── 5. Índice único para phone_number_id (idempotente) ────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_instances_phone_number_id_key
  ON public.whatsapp_instances (phone_number_id)
  WHERE phone_number_id IS NOT NULL;

-- ── 6. Tabela de pós-venda: renomeia follow_ups → post_sale_follow_ups ─────────
-- (o backend e a migration 004 criaram como "follow_ups";
--  o assistente IA e o painel de pós-venda precisam do mesmo nome)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'follow_ups'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'post_sale_follow_ups'
  ) THEN
    ALTER TABLE public.follow_ups RENAME TO post_sale_follow_ups;
  END IF;
END;
$$;

-- cria tabela se não existir em nenhum dos nomes
CREATE TABLE IF NOT EXISTS public.post_sale_follow_ups (
  id              uuid primary key default uuid_generate_v4(),
  company_id      uuid not null references public.companies on delete cascade,
  quote_id        uuid references public.quotes on delete cascade,
  conversation_id uuid references public.conversations on delete cascade,
  contact_name    text,
  contact_phone   text,
  type            text not null check (type in ('satisfaction', 'repurchase')),
  message         text not null,
  scheduled_for   date not null,
  status          text not null default 'pending'
                  check (status in ('pending', 'done', 'skipped')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS post_sale_follow_ups_company_scheduled_idx
  ON public.post_sale_follow_ups (company_id, scheduled_for);

ALTER TABLE public.post_sale_follow_ups ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'post_sale_follow_ups' AND policyname = 'company_isolation'
  ) THEN
    CREATE POLICY "company_isolation" ON public.post_sale_follow_ups
      USING (company_id = public.my_company_id());
  END IF;
END;
$$;

-- trigger de updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.post_sale_follow_ups;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.post_sale_follow_ups
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ── 7. Recria trigger de follow-up apontando para o novo nome ─────────────────
DROP TRIGGER IF EXISTS on_quote_accepted ON public.quotes;

CREATE OR REPLACE FUNCTION public.handle_quote_accepted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF new.status = 'accepted' AND (old.status IS DISTINCT FROM 'accepted') THEN
    INSERT INTO public.post_sale_follow_ups
      (company_id, quote_id, conversation_id, contact_name, contact_phone, type, message, scheduled_for)
    VALUES (
      new.company_id, new.id, new.conversation_id, new.contact_name, new.contact_phone,
      'satisfaction',
      'Oi, ' || coalesce(new.contact_name, '') || '! Passando pra saber: ficou tudo certo com o que você comprou? Sua opinião ajuda muito a gente 🙂',
      (current_date + interval '3 days')::date
    );

    INSERT INTO public.post_sale_follow_ups
      (company_id, quote_id, conversation_id, contact_name, contact_phone, type, message, scheduled_for)
    VALUES (
      new.company_id, new.id, new.conversation_id, new.contact_name, new.contact_phone,
      'repurchase',
      'Oi, ' || coalesce(new.contact_name, '') || '! Faz um tempo desde sua última compra com a gente. Quer que eu já te passe os preços atualizados?',
      (current_date + interval '30 days')::date
    );
  END IF;
  RETURN new;
END;
$$;

CREATE TRIGGER on_quote_accepted
  AFTER UPDATE ON public.quotes
  FOR EACH ROW EXECUTE PROCEDURE public.handle_quote_accepted();

-- ── 8. Realtime: adiciona tabelas que faltavam ────────────────────────────────
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN VALUES
    ('companies'), ('price_items'), ('agent_configs'), ('post_sale_follow_ups')
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    EXCEPTION WHEN others THEN
      NULL; -- já está na publicação, ignora
    END;
  END LOOP;
END;
$$;
