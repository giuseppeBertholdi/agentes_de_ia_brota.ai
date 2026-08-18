-- ============================================================
-- 018: Horário de funcionamento estruturado
-- O campo `business_hours` (texto livre) obrigava a IA a calcular de
-- cabeça se a loja está aberta agora, comparando texto livre com a hora
-- atual — o que ela às vezes calcula errado (ex: dizer "fechado" durante
-- o expediente). Este campo guarda o mesmo horário de forma estruturada,
-- pra o backend calcular aberto/fechado em código e só informar o
-- resultado já pronto pra IA, sem deixar a conta de dia/hora pro modelo.
--
-- Formato: {"mon": {"open": "08:00", "close": "17:30"}, "tue": {...}, ...,
-- "sat": null, "sun": null} — chave ausente ou null = fechado no dia.
-- ============================================================

alter table public.companies
  add column if not exists business_hours_schedule jsonb;
