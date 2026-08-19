-- ============================================================
-- 020: Teto de mensagens grátis do assistente durante onboarding
-- O assistente de configuração (/assistant/chat) é liberado de propósito
-- antes da empresa assinar, pra ajudar a configurar o negócio. Sem um
-- teto, isso vira IA grátis e ilimitada pra quem nunca completa o
-- onboarding — este contador limita esse uso gratuito.
-- ============================================================

alter table public.companies
  add column if not exists onboarding_assistant_messages_used integer not null default 0;
