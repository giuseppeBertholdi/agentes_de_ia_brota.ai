"""
Webhook handler para a WhatsApp Cloud API (Meta).
Rota única: GET/POST /webhook
"""
import hashlib
import hmac
import json
import logging

from fastapi import APIRouter, HTTPException, BackgroundTasks, Request, Response
from starlette.concurrency import run_in_threadpool

from app.config import settings
from app.database import supabase
from app.services import message_buffer, whatsapp_cloud_api

router = APIRouter()
logger = logging.getLogger("webhook")

# tipos de mídia que a IA não consegue interpretar — cada um recebe uma
# resposta padrão pro cliente, mas a mensagem original fica salva (com
# media_id) pra aparecer no Inbox
MEDIA_LABELS = {
    "image": "uma imagem",
    "audio": "um áudio",
    "video": "um vídeo",
    "sticker": "uma figurinha",
    "document": "um documento",
}

UNREADABLE_MEDIA_REPLY = (
    "No momento eu só consigo ler mensagens de texto por aqui — pode me contar em "
    "palavras o que você precisa? Se preferir, alguém da equipe pode dar uma olhada "
    "nesse arquivo."
)

DOCUMENT_REPLY = (
    "Recebemos o seu documento! Ainda não consigo abrir arquivos automaticamente, "
    "mas ele já ficou registrado aqui — nossa equipe vai analisar e te retorna por aqui."
)


@router.get("")
async def verify_webhook(request: Request):
    params = request.query_params
    if (
        params.get("hub.mode") == "subscribe"
        and params.get("hub.verify_token") == settings.webhook_verify_token
    ):
        return Response(content=params.get("hub.challenge", ""), media_type="text/plain")
    raise HTTPException(status_code=403, detail="Verification failed")


def _verify_signature(payload: bytes, signature_header: str) -> bool:
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    expected = hmac.new(settings.meta_app_secret.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature_header.removeprefix("sha256="))


async def _handle_message(phone_number_id: str, value: dict):
    messages = value.get("messages", [])
    if not messages:
        return

    instance_r = await run_in_threadpool(
        supabase.table("whatsapp_instances")
        .select("company_id")
        .eq("phone_number_id", phone_number_id)
        .maybe_single()
        .execute
    )
    if not instance_r or not instance_r.data:
        return
    company_id = instance_r.data["company_id"]

    company_r = await run_in_threadpool(
        supabase.table("companies").select("subscription_status").eq("id", company_id).maybe_single().execute
    )
    if ((company_r.data if company_r else None) or {}).get("subscription_status") != "active":
        return

    contacts = {c["wa_id"]: c.get("profile", {}).get("name", "") for c in value.get("contacts", [])}

    for msg in messages:
        msg_type = msg.get("type")
        from_number = msg.get("from", "")
        wa_message_id = msg.get("id", "")
        if not from_number or not wa_message_id or msg_type not in ("text", *MEDIA_LABELS):
            continue

        push_name = contacts.get(from_number, "")

        conv_r = await run_in_threadpool(
            supabase.table("conversations")
            .upsert(
                {
                    "company_id": company_id,
                    "remote_jid": from_number,
                    "contact_name": push_name or from_number,
                    "contact_phone": from_number,
                    "last_message_at": "now()",
                },
                on_conflict="company_id,remote_jid",
            )
            .execute
        )
        conversation = conv_r.data[0] if conv_r.data else None
        if not conversation:
            continue

        if msg_type == "text":
            content = msg.get("text", {}).get("body", "").strip()
            if not content:
                continue
            # o processamento (IA + envio da resposta) só acontece depois de um
            # período de silêncio do cliente — ver message_buffer.py
            await message_buffer.enqueue_message(
                conversation_id=conversation["id"],
                company_id=company_id,
                phone_number_id=phone_number_id,
                from_number=from_number,
                content=content,
                wa_message_id=wa_message_id,
            )
        else:
            await _handle_media_message(
                company_id=company_id,
                conversation_id=conversation["id"],
                phone_number_id=phone_number_id,
                from_number=from_number,
                wa_message_id=wa_message_id,
                msg_type=msg_type,
                media=msg.get(msg_type, {}),
            )


async def _handle_media_message(
    *, company_id: str, conversation_id: str, phone_number_id: str, from_number: str,
    wa_message_id: str, msg_type: str, media: dict,
) -> None:
    """Mídia que a IA não lê: registra a mensagem original (com media_id, pra
    poder ser baixada depois) e manda uma resposta padrão — sem passar pela IA."""
    existing = await run_in_threadpool(
        supabase.table("messages")
        .select("id")
        .eq("company_id", company_id)
        .eq("message_id", wa_message_id)
        .limit(1)
        .execute
    )
    if existing.data:
        return

    filename = media.get("filename")
    label = MEDIA_LABELS.get(msg_type, "um arquivo")
    placeholder = f"[Cliente enviou {label}" + (f": {filename}" if filename else "") + "]"

    await run_in_threadpool(
        supabase.table("messages").insert({
            "conversation_id": conversation_id,
            "company_id": company_id,
            "role": "user",
            "content": placeholder,
            "message_id": wa_message_id,
            "media_type": msg_type,
            "media_id": media.get("id"),
            "media_filename": filename,
            "media_mime_type": media.get("mime_type"),
        }).execute
    )

    reply = DOCUMENT_REPLY if msg_type == "document" else UNREADABLE_MEDIA_REPLY
    try:
        to = whatsapp_cloud_api.normalize_br_number(from_number)
        resp = await whatsapp_cloud_api.send_text(phone_number_id, to, reply)
        sent_wa_id = (resp.get("messages") or [{}])[0].get("id")
        await run_in_threadpool(
            supabase.table("messages").insert({
                "conversation_id": conversation_id,
                "company_id": company_id,
                "role": "assistant",
                "content": reply,
                "wa_message_id": sent_wa_id,
                "delivery_status": "sent",
            }).execute
        )
    except Exception:
        logger.exception("Falha ao responder mensagem de mídia (company_id=%s)", company_id)


async def _handle_status_update(value: dict):
    """Atualiza o status de entrega (sent/delivered/read/failed) das mensagens
    do bot, a partir dos callbacks de status que a própria Meta envia."""
    for status in value.get("statuses", []):
        wa_id = status.get("id")
        new_status = status.get("status")
        if not wa_id or new_status not in ("sent", "delivered", "read", "failed"):
            continue
        await run_in_threadpool(
            supabase.table("messages").update({"delivery_status": new_status}).eq("wa_message_id", wa_id).execute
        )


@router.post("")
async def whatsapp_webhook(request: Request, background: BackgroundTasks):
    raw_body = await request.body()
    if not _verify_signature(raw_body, request.headers.get("x-hub-signature-256", "")):
        raise HTTPException(status_code=403, detail="Invalid signature")

    try:
        payload = json.loads(raw_body)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})
            if change.get("field") != "messages":
                continue
            phone_number_id = value.get("metadata", {}).get("phone_number_id", "")
            if not phone_number_id:
                continue
            if value.get("messages"):
                background.add_task(_handle_message, phone_number_id, value)
            if value.get("statuses"):
                background.add_task(_handle_status_update, value)

    return {"ok": True}
