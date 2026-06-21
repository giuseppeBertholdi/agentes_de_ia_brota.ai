from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from app.api.auth import require_company
from app.database import supabase

router = APIRouter(prefix="/reports", tags=["reports"])


def _week_bounds(offset: int) -> tuple[datetime, datetime]:
    """offset=0 -> semana atual (Seg-Dom), offset=1 -> semana anterior, etc."""
    now = datetime.utcnow()
    monday_this_week = (now - timedelta(days=now.weekday())).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    start = monday_this_week - timedelta(weeks=offset)
    end = start + timedelta(days=7)
    return start, end


def _week_stats(company_id: str, start: datetime, end: datetime) -> dict:
    conv_r = (
        supabase.table("conversations")
        .select("id", count="exact")
        .eq("company_id", company_id)
        .gte("created_at", start.isoformat())
        .lt("created_at", end.isoformat())
        .execute()
    )
    msg_r = (
        supabase.table("messages")
        .select("id", count="exact")
        .eq("company_id", company_id)
        .gte("created_at", start.isoformat())
        .lt("created_at", end.isoformat())
        .execute()
    )
    quotes_r = (
        supabase.table("quotes")
        .select("items,total,status,created_at")
        .eq("company_id", company_id)
        .gte("created_at", start.isoformat())
        .lt("created_at", end.isoformat())
        .execute()
    )
    quotes = quotes_r.data or []
    accepted = [q for q in quotes if q.get("status") == "accepted"]

    product_totals: dict[str, dict] = defaultdict(lambda: {"qty": 0, "revenue": 0.0})
    for q in quotes:
        for item in q.get("items") or []:
            name = item.get("name", "Item")
            qty = float(item.get("qty") or 0)
            subtotal = float(item.get("subtotal") or (item.get("unit_price", 0) * qty))
            product_totals[name]["qty"] += qty
            product_totals[name]["revenue"] += subtotal

    top_products = sorted(
        ({"name": k, **v} for k, v in product_totals.items()),
        key=lambda p: p["revenue"],
        reverse=True,
    )[:5]

    return {
        "conversations_new": conv_r.count or 0,
        "messages_total": msg_r.count or 0,
        "quotes_total": len(quotes),
        "quotes_accepted": len(accepted),
        "conversion_rate": round(len(accepted) / len(quotes) * 100, 1) if quotes else 0.0,
        "revenue_quoted": sum(float(q.get("total") or 0) for q in quotes),
        "revenue_closed": sum(float(q.get("total") or 0) for q in accepted),
        "top_products": top_products,
    }


def _pct_change(current: float, previous: float) -> float | None:
    if previous == 0:
        return None  # sem base de comparação
    return round((current - previous) / previous * 100, 1)


@router.get("/weekly")
async def weekly_report(offset: int = 0, company_id: str = Depends(require_company)):
    offset = max(offset, 0)
    start, end = _week_bounds(offset)
    prev_start, prev_end = _week_bounds(offset + 1)

    current = _week_stats(company_id, start, end)
    previous = _week_stats(company_id, prev_start, prev_end)

    return {
        "week_start": start.date().isoformat(),
        "week_end": (end - timedelta(days=1)).date().isoformat(),
        "current": current,
        "previous": previous,
        "comparison": {
            "conversations_new": _pct_change(current["conversations_new"], previous["conversations_new"]),
            "quotes_total": _pct_change(current["quotes_total"], previous["quotes_total"]),
            "revenue_closed": _pct_change(current["revenue_closed"], previous["revenue_closed"]),
        },
    }
