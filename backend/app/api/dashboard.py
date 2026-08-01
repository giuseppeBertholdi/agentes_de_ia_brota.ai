"""Agrega o que precisa de atenção agora ou em breve — a "agenda" do dashboard."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends
from app.api.auth import require_company
from app.database import supabase

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

STALE_QUOTE_DAYS = 3

_FOLLOW_UP_TITLES = {"satisfaction": "Satisfação", "repurchase": "Recompra"}
_CONVERSATION_TITLES = {"awaiting_payment": "Aguardando pagamento", "human": "Aguardando humano"}


@router.get("/agenda")
async def agenda(company_id: str = Depends(require_company)):
    items: list[dict] = []

    follow_ups = (
        supabase.table("post_sale_follow_ups")
        .select("id,type,message,contact_name,contact_phone,scheduled_for,conversation_id")
        .eq("company_id", company_id)
        .eq("status", "pending")
        .order("scheduled_for")
        .execute()
    ).data or []
    for f in follow_ups:
        items.append({
            "kind": "follow_up",
            "id": f["id"],
            "date": f["scheduled_for"],
            "contact_name": f.get("contact_name"),
            "contact_phone": f.get("contact_phone"),
            "conversation_id": f.get("conversation_id"),
            "title": _FOLLOW_UP_TITLES.get(f.get("type"), "Follow-up"),
            "subtitle": (f.get("message") or "")[:80],
            "amount": None,
        })

    convs = (
        supabase.table("conversations")
        .select("id,contact_name,contact_phone,status,last_message_at")
        .eq("company_id", company_id)
        .in_("status", ["awaiting_payment", "human"])
        .execute()
    ).data or []
    for c in convs:
        items.append({
            "kind": "conversation_attention",
            "id": c["id"],
            "date": c.get("last_message_at"),
            "contact_name": c.get("contact_name"),
            "contact_phone": c.get("contact_phone"),
            "conversation_id": c["id"],
            "title": _CONVERSATION_TITLES.get(c.get("status"), "Precisa de atenção"),
            "subtitle": None,
            "amount": None,
        })

    approvals = (
        supabase.table("ai_pending_approvals")
        .select("id,conversation_id,requested_total,created_at,conversations(contact_name,contact_phone)")
        .eq("company_id", company_id)
        .eq("status", "pending")
        .execute()
    ).data or []
    for a in approvals:
        contact = a.get("conversations") or {}
        items.append({
            "kind": "pending_approval",
            "id": a["id"],
            "date": a.get("created_at"),
            "contact_name": contact.get("contact_name"),
            "contact_phone": contact.get("contact_phone"),
            "conversation_id": a.get("conversation_id"),
            "title": "Desconto aguardando aprovação",
            "subtitle": None,
            "amount": float(a.get("requested_total") or 0),
        })

    stale_cutoff = (datetime.now(timezone.utc) - timedelta(days=STALE_QUOTE_DAYS)).isoformat()
    stale_quotes = (
        supabase.table("quotes")
        .select("id,conversation_id,contact_name,contact_phone,total,created_at")
        .eq("company_id", company_id)
        .eq("status", "sent")
        .lt("created_at", stale_cutoff)
        .execute()
    ).data or []
    for q in stale_quotes:
        items.append({
            "kind": "stale_quote",
            "id": q["id"],
            "date": q.get("created_at"),
            "contact_name": q.get("contact_name"),
            "contact_phone": q.get("contact_phone"),
            "conversation_id": q.get("conversation_id"),
            "title": "Cotação sem resposta",
            "subtitle": None,
            "amount": float(q.get("total") or 0),
        })

    return items
