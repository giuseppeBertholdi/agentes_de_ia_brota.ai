-- ============================================================
-- 017: Central de contexto — a empresa envia documentos (tabela de preços,
-- política da loja, FAQ, o que for) e o texto extraído entra direto no
-- prompt dos agentes de IA, como fonte de verdade adicional.
-- ============================================================

create table if not exists public.context_documents (
  id            uuid primary key default uuid_generate_v4(),
  company_id    uuid not null references public.companies on delete cascade,
  filename      text not null,
  file_type     text not null,
  content_text  text not null,
  size_bytes    integer not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists context_documents_company_idx
  on public.context_documents (company_id, created_at desc);

alter table public.context_documents enable row level security;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'context_documents' AND policyname = 'company_isolation'
  ) THEN
    CREATE POLICY "company_isolation" ON public.context_documents
      USING (company_id = public.my_company_id());
  END IF;
END;
$$;

DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.context_documents';
  EXCEPTION WHEN others THEN
    NULL; -- já está na publicação, ignora
  END;
END;
$$;
