-- ============================================================
-- 014: Horário de funcionamento da loja
-- Texto livre configurado pelo dono, usado pela IA pra responder
-- perguntas de horário e pra decidir handoff fora do expediente.
-- ============================================================

alter table public.companies
  add column if not exists business_hours text;
