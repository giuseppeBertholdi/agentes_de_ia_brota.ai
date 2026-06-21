-- ============================================================
-- Brota — schema inicial (multi-tenant com RLS)
-- ============================================================

-- extensões
create extension if not exists "uuid-ossp";

-- ============================================================
-- COMPANIES (tenant raiz)
-- ============================================================
create table public.companies (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  slug          text unique not null,
  plan          text not null default 'free' check (plan in ('free','pro','enterprise')),
  voice_tone    text not null default 'Amigável e profissional',
  business_desc text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- PROFILES (usuários ligados a uma empresa)
-- ============================================================
create table public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  company_id uuid references public.companies on delete cascade,
  full_name  text,
  role       text not null default 'owner' check (role in ('owner','admin','agent')),
  avatar_url text,
  created_at timestamptz not null default now()
);

-- cria profile + company automaticamente no signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  new_company_id uuid;
  company_slug   text;
begin
  -- gera slug único a partir do email
  company_slug := split_part(new.email, '@', 1) || '-' || substr(new.id::text, 1, 6);

  insert into public.companies (name, slug)
  values (
    coalesce(new.raw_user_meta_data->>'company_name', split_part(new.email,'@',1)),
    company_slug
  )
  returning id into new_company_id;

  insert into public.profiles (id, company_id, full_name)
  values (
    new.id,
    new_company_id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1))
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- WHATSAPP INSTANCES
-- ============================================================
create table public.whatsapp_instances (
  id            uuid primary key default uuid_generate_v4(),
  company_id    uuid not null references public.companies on delete cascade,
  instance_name text not null,
  phone_number  text,
  status        text not null default 'disconnected'
                check (status in ('connected','disconnected','connecting','qr_code')),
  qr_code       text,
  webhook_url   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (company_id)
);

-- ============================================================
-- PRICE TABLE
-- ============================================================
create table public.price_items (
  id          uuid primary key default uuid_generate_v4(),
  company_id  uuid not null references public.companies on delete cascade,
  name        text not null,
  description text,
  price       numeric(12,2) not null,
  unit        text not null default 'un',
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- AGENT CONFIGS
-- ============================================================
create table public.agent_configs (
  id           uuid primary key default uuid_generate_v4(),
  company_id   uuid not null references public.companies on delete cascade,
  agent_type   text not null check (agent_type in ('receptionist','quote')),
  enabled      boolean not null default true,
  system_prompt text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (company_id, agent_type)
);

-- ============================================================
-- CONVERSATIONS
-- ============================================================
create table public.conversations (
  id              uuid primary key default uuid_generate_v4(),
  company_id      uuid not null references public.companies on delete cascade,
  remote_jid      text not null,           -- WhatsApp JID do cliente
  contact_name    text,
  contact_phone   text,
  status          text not null default 'bot'
                  check (status in ('bot','human','resolved')),
  assigned_to     uuid references public.profiles,
  last_message_at timestamptz,
  created_at      timestamptz not null default now(),
  unique (company_id, remote_jid)
);

-- ============================================================
-- MESSAGES
-- ============================================================
create table public.messages (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations on delete cascade,
  company_id      uuid not null references public.companies on delete cascade,
  role            text not null check (role in ('user','assistant','system')),
  content         text not null,
  message_id      text,                    -- ID do WhatsApp
  sent_by_human   boolean not null default false,
  created_at      timestamptz not null default now()
);

create index on public.messages (conversation_id, created_at);

-- ============================================================
-- QUOTES
-- ============================================================
create table public.quotes (
  id              uuid primary key default uuid_generate_v4(),
  company_id      uuid not null references public.companies on delete cascade,
  conversation_id uuid references public.conversations,
  contact_name    text,
  contact_phone   text,
  items           jsonb not null default '[]',
  total           numeric(12,2),
  status          text not null default 'pending'
                  check (status in ('pending','sent','accepted','rejected')),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.companies        enable row level security;
alter table public.profiles         enable row level security;
alter table public.whatsapp_instances enable row level security;
alter table public.price_items      enable row level security;
alter table public.agent_configs    enable row level security;
alter table public.conversations    enable row level security;
alter table public.messages         enable row level security;
alter table public.quotes           enable row level security;

-- helper: retorna company_id do usuário logado
create or replace function public.my_company_id()
returns uuid language sql stable security definer as $$
  select company_id from public.profiles where id = auth.uid()
$$;

-- policies genéricas: acesso apenas à própria empresa
create policy "company_isolation" on public.companies
  using (id = public.my_company_id());

create policy "company_isolation" on public.profiles
  using (company_id = public.my_company_id());

create policy "company_isolation" on public.whatsapp_instances
  using (company_id = public.my_company_id());

create policy "company_isolation" on public.price_items
  using (company_id = public.my_company_id());

create policy "company_isolation" on public.agent_configs
  using (company_id = public.my_company_id());

create policy "company_isolation" on public.conversations
  using (company_id = public.my_company_id());

create policy "company_isolation" on public.messages
  using (company_id = public.my_company_id());

create policy "company_isolation" on public.quotes
  using (company_id = public.my_company_id());

-- backend service role bypassa RLS (usa service_role key)

-- ============================================================
-- REALTIME
-- ============================================================
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.quotes;

-- ============================================================
-- UPDATED_AT trigger
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger set_updated_at before update on public.companies
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.whatsapp_instances
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.agent_configs
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.quotes
  for each row execute procedure public.set_updated_at();
