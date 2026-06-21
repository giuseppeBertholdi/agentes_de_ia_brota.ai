-- Habilita Realtime para whatsapp_instances
-- O frontend usa useRealtimeTable('whatsapp_instances') para atualizar o QR code automaticamente
alter publication supabase_realtime add table public.whatsapp_instances;
