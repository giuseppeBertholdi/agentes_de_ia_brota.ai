from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from app.api.auth import require_company, get_current_user
from app.database import supabase
from app.services import whatsapp_cloud_api
from app.models.schemas import SendMessageRequest, TakeOverRequest

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.get("/")
async def list_conversations(department_id: Optional[str] = None, company_id: str = Depends(require_company)):
    q = (
        supabase.table("conversations")
        .select("*")
        .eq("company_id", company_id)
    )
    if department_id:
        q = q.eq("department_id", department_id)
    r = q.order("last_message_at", desc=True).limit(100).execute()
    return r.data or []


@router.get("/{conversation_id}/messages")
async def get_messages(conversation_id: str, company_id: str = Depends(require_company)):
    # valida que a conversa pertence à empresa
    conv = (
        supabase.table("conversations")
        .select("id")
        .eq("id", conversation_id)
        .eq("company_id", company_id)
        .single()
        .execute()
    )
    if not conv.data:
        raise HTTPException(404, "Conversa não encontrada")

    r = (
        supabase.table("messages")
        .select("*")
        .eq("conversation_id", conversation_id)
        .order("created_at")
        .execute()
    )
    return r.data or []


@router.post("/send")
async def send_message(
    body: SendMessageRequest,
    user: dict = Depends(get_current_user),
    company_id: str = Depends(require_company),
):
    conv = (
        supabase.table("conversations")
        .select("remote_jid")
        .eq("id", body.conversation_id)
        .eq("company_id", company_id)
        .single()
        .execute()
    )
    if not conv.data:
        raise HTTPException(404, "Conversa não encontrada")

    instance_r = (
        supabase.table("whatsapp_instances")
        .select("phone_number_id")
        .eq("company_id", company_id)
        .single()
        .execute()
    )
    if not instance_r.data:
        raise HTTPException(400, "WhatsApp não conectado")

    await whatsapp_cloud_api.send_text(
        instance_r.data["phone_number_id"],
        conv.data["remote_jid"],
        body.content,
    )

    supabase.table("messages").insert({
        "conversation_id": body.conversation_id,
        "company_id": company_id,
        "role": "assistant",
        "content": body.content,
        "sent_by_human": True,
    }).execute()

    return {"ok": True}


@router.post("/takeover")
async def takeover(body: TakeOverRequest, company_id: str = Depends(require_company)):
    supabase.table("conversations").update({"status": "human"}).eq(
        "id", body.conversation_id
    ).eq("company_id", company_id).execute()
    return {"ok": True}


@router.post("/{conversation_id}/release")
async def release_to_bot(conversation_id: str, company_id: str = Depends(require_company)):
    supabase.table("conversations").update({"status": "bot"}).eq(
        "id", conversation_id
    ).eq("company_id", company_id).execute()
    return {"ok": True}


@router.post("/{conversation_id}/resolve")
async def resolve(conversation_id: str, company_id: str = Depends(require_company)):
    supabase.table("conversations").update({"status": "resolved"}).eq(
        "id", conversation_id
    ).eq("company_id", company_id).execute()
    return {"ok": True}
