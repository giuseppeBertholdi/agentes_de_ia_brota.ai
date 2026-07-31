-- P2: fecha o ciclo cotação -> pagamento, automatiza o pós-venda e rastreia
-- se as mensagens do bot realmente chegaram ao cliente.

-- Instruções de pagamento configuráveis (Pix, link, dados bancários) —
-- incluídas automaticamente na mensagem de confirmação quando o cliente aceita uma cotação.
alter table public.companies
  add column if not exists payment_instructions text;

-- Cotação passa a ter um estado "paga", além de "aceita" — fecha o ciclo
-- cotação aceita -> humano cobra -> pagamento confirmado.
alter table public.quotes
  add column if not exists paid_at timestamptz;

alter table public.quotes drop constraint if exists quotes_status_check;
alter table public.quotes add constraint quotes_status_check
  check (status in ('pending', 'sent', 'superseded', 'accepted', 'paid', 'rejected'));

-- Rastreio de entrega por mensagem — o ✓✓ do Inbox hoje é fixo e mente
-- quando o envio falha. wa_message_id liga nossa mensagem ao ID que a Meta
-- retorna, para que os webhooks de status (sent/delivered/read/failed)
-- consigam atualizar a linha certa.
alter table public.messages
  add column if not exists wa_message_id text,
  add column if not exists delivery_status text not null default 'sent';

alter table public.messages drop constraint if exists messages_delivery_status_check;
alter table public.messages add constraint messages_delivery_status_check
  check (delivery_status in ('sent', 'delivered', 'read', 'failed'));

create index if not exists messages_wa_message_id_idx on public.messages (wa_message_id);
