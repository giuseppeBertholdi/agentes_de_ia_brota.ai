-- ============================================================
-- 013: Template de WhatsApp pra pós-venda funcionar de verdade
-- Fora da janela de 24h a Cloud API só aceita Message Template aprovada
-- pela Meta — sem isso, follow-ups de +3/+30 dias são rejeitados.
-- ============================================================

alter table public.companies
  add column if not exists followup_template_name text,
  add column if not exists followup_template_language text not null default 'pt_BR';
