-- Garante idempotência do webhook do WhatsApp: a Meta reentrega eventos em
-- at-least-once delivery, então o mesmo message_id pode chegar mais de uma vez.
create unique index if not exists messages_company_message_id_key
  on public.messages (company_id, message_id)
  where message_id is not null;
