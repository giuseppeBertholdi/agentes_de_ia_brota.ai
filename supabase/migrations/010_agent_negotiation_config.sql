-- P1: configurabilidade estruturada da IA — desconto máximo (agente de cotação)
-- e palavras-chave de escalonamento automático (agente recepcionista).

alter table public.agent_configs
  add column if not exists max_discount_pct numeric not null default 0,
  add column if not exists escalation_keywords text;
