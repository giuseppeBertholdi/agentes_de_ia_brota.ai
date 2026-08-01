from __future__ import annotations

from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from app.api.auth import require_company
from app.database import supabase
from app.models.schemas import FollowUpStatusUpdate
from app.services.ai_agent import WON_QUOTE_STATUSES
from app.services.post_sale_delivery import deliver_follow_up

router = APIRouter(prefix="/post-sale", tags=["post-sale"])

CHURN_DAYS_INACTIVE = 14


@router.get("/follow-ups")
async def list_follow_ups(status: str = "pending", company_id: str = Depends(require_company)):
    q = supabase.table("post_sale_follow_ups").select("*").eq("company_id", company_id)
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
        supabase.table("post_sale_follow_ups")
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
        supabase.table("post_sale_follow_ups")
        .select("*")
        .eq("id", follow_up_id)
        .eq("company_id", company_id)
        .single()
        .execute()
    )
    if not fu_r.data:
        raise HTTPException(404, "Follow-up não encontrado")

    try:
        await deliver_follow_up(fu_r.data)
    except Exception as e:
        raise HTTPException(502, f"Falha ao enviar mensagem: {e}")

    r = supabase.table("post_sale_follow_ups").select("*").eq("id", follow_up_id).single().execute()
    return r.data if r.data else {}


@router.get("/churn-risks")
async def churn_risks(company_id: str = Depends(require_company)):
    accepted_r = (
        supabase.table("quotes")
        .select("conversation_id")
        .eq("company_id", company_id)
        .in_("status", list(WON_QUOTE_STATUSES))
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
