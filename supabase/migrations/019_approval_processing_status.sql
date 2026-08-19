-- ============================================================
-- 019: Estado intermediário "processing" pra aprovação de desconto
-- Usado como reivindicação atômica (update condicional) em
-- approvals.py:_resolve_approval — evita duas resoluções quase
-- simultâneas (ex: aprovar + rejeitar em cliques rápidos) mandando
-- mensagens conflitantes ao cliente.
-- ============================================================

alter table public.ai_pending_approvals
  drop constraint if exists ai_pending_approvals_status_check;

alter table public.ai_pending_approvals
  add constraint ai_pending_approvals_status_check
  check (status in ('pending', 'processing', 'approved', 'rejected'));
