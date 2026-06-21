-- ============================================================
-- Migração da Evolution API para a WhatsApp Cloud API (Meta)
-- ============================================================

alter table public.whatsapp_instances
  drop column if exists instance_name,
  drop column if exists qr_code,
  drop column if exists webhook_url;

alter table public.whatsapp_instances
  add column if not exists waba_id text,
  add column if not exists phone_number_id text,
  add column if not exists display_phone_number text,
  add column if not exists verified_name text;

alter table public.whatsapp_instances
  drop constraint if exists whatsapp_instances_status_check;

alter table public.whatsapp_instances
  add constraint whatsapp_instances_status_check
  check (status in ('connected', 'disconnected'));

alter table public.whatsapp_instances
  alter column status set default 'disconnected';

create unique index if not exists whatsapp_instances_phone_number_id_key
  on public.whatsapp_instances (phone_number_id)
  where phone_number_id is not null;
