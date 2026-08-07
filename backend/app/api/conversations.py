from typing import Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, Response
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


@router.get("/handoff-count")
async def handoff_count(company_id: str = Depends(require_company)):
    """Conversas que precisam de alguém agindo agora — transferidas pra um humano
    (a IA parou de responder) ou com cotação fechada aguardando cobrança de pagamento."""
    r = (
        supabase.table("conversations")
        .select("id", count="exact")
        .eq("company_id", company_id)
        .in_("status", ["human", "awaiting_payment"])
        .execute()
    )
    return {"count": r.count or 0}


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


@router.get("/messages/{message_id}/media")
async def get_message_media(message_id: str, company_id: str = Depends(require_company)):
    """Baixa (via Meta) a mídia de uma mensagem recebida — usado pelo Inbox pra
    abrir/baixar documentos enviados pelo cliente que a IA não consegue ler."""
    msg = (
        supabase.table("messages")
        .select("media_id,media_filename,media_mime_type")
        .eq("id", message_id)
        .eq("company_id", company_id)
        .maybe_single()
        .execute()
    )
    if not msg or not msg.data or not msg.data.get("media_id"):
        raise HTTPException(404, "Mídia não encontrada")

    try:
        content, mime_type = await whatsapp_cloud_api.download_media(msg.data["media_id"])
    except httpx.HTTPStatusError:
        raise HTTPException(502, "Falha ao baixar mídia do WhatsApp")

    filename = msg.data.get("media_filename") or "arquivo"
    return Response(
        content=content,
        media_type=msg.data.get("media_mime_type") or mime_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


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

    try:
        resp = await whatsapp_cloud_api.send_text(
            instance_r.data["phone_number_id"],
            whatsapp_cloud_api.normalize_br_number(conv.data["remote_jid"]),
            body.content,
        )
    except httpx.HTTPStatusError as e:
        raise HTTPException(400, f"Falha ao enviar via WhatsApp: {e.response.text}")

    wa_id = (resp.get("messages") or [{}])[0].get("id")
    supabase.table("messages").insert({
        "conversation_id": body.conversation_id,
        "company_id": company_id,
        "role": "assistant",
        "content": body.content,
        "sent_by_human": True,
        "wa_message_id": wa_id,
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
    # se a conversa estava aguardando pagamento, resolver = pagamento confirmado —
    # fecha o ciclo marcando a cotação aceita como paga
    conv = (
        supabase.table("conversations")
        .select("status")
        .eq("id", conversation_id)
        .eq("company_id", company_id)
        .maybe_single()
        .execute()
    )
    if conv and conv.data and conv.data.get("status") == "awaiting_payment":
        from datetime import datetime, timezone
        supabase.table("quotes").update({
            "status": "paid",
            "paid_at": datetime.now(timezone.utc).isoformat(),
        }).eq("conversation_id", conversation_id).eq("status", "accepted").execute()

    supabase.table("conversations").update({"status": "resolved"}).eq(
        "id", conversation_id
    ).eq("company_id", company_id).execute()
    return {"ok": True}
