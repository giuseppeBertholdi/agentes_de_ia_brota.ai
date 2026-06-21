from __future__ import annotations

from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from app.api.auth import require_company
from app.database import supabase
from app.models.schemas import FollowUpStatusUpdate
from app.services import whatsapp_cloud_api

router = APIRouter(prefix="/post-sale", tags=["post-sale"])

CHURN_DAYS_INACTIVE = 14


@router.get("/follow-ups")
async def list_follow_ups(status: str = "pending", company_id: str = Depends(require_company)):
    q = supabase.table("follow_ups").select("*").eq("company_id", company_id)
    if status in ("pending", "done", "skipped"):
        q = q.eq("status", status)
    r = q.order("scheduled_for").execute()
    return r.data or []


@router.patch("/follow-ups/{follow_up_id}")
async def update_follow_up(
    follow_up_id: str,
    body: FollowUpStatusUpdate,
    company_id: str = Depends(require_company),
):
    if body.status not in ("pending", "done", "skipped"):
        raise HTTPException(400, "Status inválido")
    r = (
        supabase.table("follow_ups")
        .update({"status": body.status})
        .eq("id", follow_up_id)
        .eq("company_id", company_id)
        .execute()
    )
    if not r.data:
        raise HTTPException(404, "Follow-up não encontrado")
    return r.data[0]


@router.post("/follow-ups/{follow_up_id}/send")
async def send_follow_up(follow_up_id: str, company_id: str = Depends(require_company)):
    fu_r = (
        supabase.table("follow_ups")
        .select("*")
        .eq("id", follow_up_id)
        .eq("company_id", company_id)
        .single()
        .execute()
    )
    if not fu_r.data:
        raise HTTPException(404, "Follow-up não encontrado")
    follow_up = fu_r.data

    conv_r = (
        supabase.table("conversations")
        .select("remote_jid")
        .eq("id", follow_up["conversation_id"])
        .maybe_single()
        .execute()
    )
    if not conv_r.data:
        raise HTTPException(400, "Conversa de origem não encontrada")

    instance_r = (
        supabase.table("whatsapp_instances")
        .select("phone_number_id,status")
        .eq("company_id", company_id)
        .maybe_single()
        .execute()
    )
    if not instance_r.data or instance_r.data.get("status") != "connected":
        raise HTTPException(400, "WhatsApp não conectado")

    try:
        await whatsapp_cloud_api.send_text(
            instance_r.data["phone_number_id"],
            conv_r.data["remote_jid"],
            follow_up["message"],
        )
    except Exception as e:
        raise HTTPException(502, f"Falha ao enviar mensagem: {e}")

    r = (
        supabase.table("follow_ups")
        .update({"status": "done"})
        .eq("id", follow_up_id)
        .execute()
    )
    return r.data[0] if r.data else {}


@router.get("/churn-risks")
async def churn_risks(company_id: str = Depends(require_company)):
    accepted_r = (
        supabase.table("quotes")
        .select("conversation_id")
        .eq("company_id", company_id)
        .eq("status", "accepted")
        .execute()
    )
    conversation_ids = list({q["conversation_id"] for q in (accepted_r.data or []) if q.get("conversation_id")})
    if not conversation_ids:
        return []

    cutoff = (datetime.utcnow() - timedelta(days=CHURN_DAYS_INACTIVE)).isoformat()
    conv_r = (
        supabase.table("conversations")
        .select("id,contact_name,contact_phone,last_message_at,status")
        .eq("company_id", company_id)
        .in_("id", conversation_ids)
        .lt("last_message_at", cutoff)
        .order("last_message_at")
        .execute()
    )
    return conv_r.data or []
