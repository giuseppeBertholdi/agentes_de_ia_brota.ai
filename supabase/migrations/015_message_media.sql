-- ============================================================
-- 015: Mensagens de mídia (documento/imagem/áudio/vídeo) recebidas no
-- WhatsApp. A IA só entende texto — mídia não suportada vira uma resposta
-- padrão pro cliente, mas a mensagem original fica registrada (com
-- referência ao media_id da Meta) pra aparecer no Inbox e, no caso de
-- documento, poder ser baixada por um humano.
-- ============================================================

alter table public.messages
  add column if not exists media_type text,
  add column if not exists media_id text,
  add column if not exists media_filename text,
  add column if not exists media_mime_type text;
