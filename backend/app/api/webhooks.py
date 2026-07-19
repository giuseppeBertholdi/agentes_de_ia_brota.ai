"""
Webhook handler para a WhatsApp Cloud API (Meta).
Rota única: GET/POST /webhook
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks, Request, Response
from app.config import settings
from app.database import supabase
from app.services import whatsapp_cloud_api
from app.services.ai_agent import process_message

router = APIRouter()


@router.get("")
async def verify_webhook(request: Request):
    params = request.query_params
    if (
        params.get("hub.mode") == "subscribe"
        and params.get("hub.verify_token") == settings.webhook_verify_token
    ):
        return Response(content=params.get("hub.challenge", ""), media_type="text/plain")
    raise HTTPException(status_code=403, detail="Verification failed")


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
        if not content or not from_number:
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

        reply = await process_message(company_id, conversation["id"], content)
        if not reply:
            continue

        await whatsapp_cloud_api.send_text(phone_number_id, from_number, reply)


@router.post("")
async def whatsapp_webhook(request: Request, background: BackgroundTasks):
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})
            if change.get("field") != "messages" or not value.get("messages"):
                continue
            phone_number_id = value.get("metadata", {}).get("phone_number_id", "")
            if phone_number_id:
                background.add_task(_handle_message, phone_number_id, value)

    return {"ok": True}
