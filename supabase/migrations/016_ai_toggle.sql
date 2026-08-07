-- ============================================================
-- 016: Interruptor geral da IA — desliga os dois agentes de uma vez e
-- coloca todo o atendimento em modo humano (usado pelo botão no Dashboard).
-- ============================================================

alter table public.companies
  add column if not exists ai_enabled boolean not null default true;
