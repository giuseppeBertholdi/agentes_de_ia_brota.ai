-- P0: fecha o ciclo cotação aceita -> humano cobra pagamento, e evita
-- confirmar uma cotação antiga quando uma nova é gerada na mesma conversa.

alter table public.conversations drop constraint if exists conversations_status_check;
alter table public.conversations add constraint conversations_status_check
  check (status in ('bot', 'human', 'awaiting_payment', 'resolved'));

alter table public.quotes drop constraint if exists quotes_status_check;
alter table public.quotes add constraint quotes_status_check
  check (status in ('pending', 'sent', 'superseded', 'accepted', 'rejected'));
