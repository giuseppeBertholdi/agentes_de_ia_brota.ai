-- ============================================================
-- PÓS-VENDA
-- ============================================================

create table public.follow_ups (
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

create index follow_ups_company_scheduled_idx on public.follow_ups (company_id, scheduled_for);

alter table public.follow_ups enable row level security;

create policy "company_isolation" on public.follow_ups
  using (company_id = public.my_company_id());

create trigger set_updated_at before update on public.follow_ups
  for each row execute procedure public.set_updated_at();

-- cria follow-ups automaticamente quando uma cotação é aceita (venda fechada)
create or replace function public.handle_quote_accepted()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'accepted' and (old.status is distinct from 'accepted') then
    insert into public.follow_ups (company_id, quote_id, conversation_id, contact_name, contact_phone, type, message, scheduled_for)
    values (
      new.company_id, new.id, new.conversation_id, new.contact_name, new.contact_phone,
      'satisfaction',
      'Oi, ' || coalesce(new.contact_name, '') || '! Passando pra saber: ficou tudo certo com o que você comprou? Sua opinião ajuda muito a gente 🙂',
      (current_date + interval '3 days')::date
    );

    insert into public.follow_ups (company_id, quote_id, conversation_id, contact_name, contact_phone, type, message, scheduled_for)
    values (
      new.company_id, new.id, new.conversation_id, new.contact_name, new.contact_phone,
      'repurchase',
      'Oi, ' || coalesce(new.contact_name, '') || '! Faz um tempo desde sua última compra com a gente. Quer que eu já te passe os preços atualizados?',
      (current_date + interval '30 days')::date
    );
  end if;
  return new;
end;
$$;

create trigger on_quote_accepted
  after update on public.quotes
  for each row execute procedure public.handle_quote_accepted();

-- habilita realtime para follow_ups (mesmo padrão usado em whatsapp_instances)
alter publication supabase_realtime add table public.follow_ups;
