"""
Webhook handler para a WhatsApp Cloud API (Meta).
Rota única: GET/POST /webhook
"""
import hashlib
import hmac
import json
import logging

import httpx
from fastapi import APIRouter, HTTPException, BackgroundTasks, Request, Response
from app.config import settings
from app.database import supabase
from app.services import whatsapp_cloud_api
from app.services.ai_agent import process_message

router = APIRouter()
logger = logging.getLogger("webhook")


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

    instance_r = (
        supabase.table("whatsapp_instances")
        .select("company_id")
        .eq("phone_number_id", phone_number_id)
        .maybe_single()
        .execute()
    )
    if not instance_r or not instance_r.data:
        return
    company_id = instance_r.data["company_id"]

    company_r = (
        supabase.table("companies").select("subscription_status").eq("id", company_id).maybe_single().execute()
    )
    if ((company_r.data if company_r else None) or {}).get("subscription_status") != "active":
        return

    contacts = {c["wa_id"]: c.get("profile", {}).get("name", "") for c in value.get("contacts", [])}

    for msg in messages:
        if msg.get("type") != "text":
            continue

        from_number = msg.get("from", "")
        content = msg.get("text", {}).get("body", "").strip()
        wa_message_id = msg.get("id", "")
        if not content or not from_number or not wa_message_id:
            continue

        push_name = contacts.get(from_number, "")

        conv_r = (
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
            .execute()
        )
        conversation = conv_r.data[0] if conv_r.data else None
        if not conversation:
            continue

        saved_message_id = None
        try:
            reply, saved_message_id = await process_message(company_id, conversation["id"], content, wa_message_id)
        except Exception:
            logger.exception("Falha ao processar mensagem com a IA (company_id=%s)", company_id)
            supabase.table("conversations").update({"status": "human"}).eq("id", conversation["id"]).execute()
            reply = (
                "Desculpe, tive um problema técnico agora. Já chamei alguém da equipe "
                "para te responder por aqui — só um momento!"
            )
        if not reply:
            continue

        try:
            to = whatsapp_cloud_api.normalize_br_number(from_number)
            resp = await whatsapp_cloud_api.send_text(phone_number_id, to, reply)
            sent_wa_id = (resp.get("messages") or [{}])[0].get("id")
            if saved_message_id:
                supabase.table("messages").update(
                    {"wa_message_id": sent_wa_id, "delivery_status": "sent"}
                ).eq("id", saved_message_id).execute()
        except httpx.HTTPStatusError as e:
            logger.error(
                "Falha ao enviar resposta via WhatsApp (company_id=%s): %s",
                company_id, e.response.text,
            )
            if saved_message_id:
                supabase.table("messages").update({"delivery_status": "failed"}).eq("id", saved_message_id).execute()
        except Exception:
            logger.exception("Falha ao enviar resposta via WhatsApp (company_id=%s)", company_id)
            if saved_message_id:
                supabase.table("messages").update({"delivery_status": "failed"}).eq("id", saved_message_id).execute()


async def _handle_status_update(value: dict):
    """Atualiza o status de entrega (sent/delivered/read/failed) das mensagens
    do bot, a partir dos callbacks de status que a própria Meta envia."""
    for status in value.get("statuses", []):
        wa_id = status.get("id")
        new_status = status.get("status")
        if not wa_id or new_status not in ("sent", "delivered", "read", "failed"):
            continue
        supabase.table("messages").update({"delivery_status": new_status}).eq("wa_message_id", wa_id).execute()


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
