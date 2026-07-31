from fastapi import APIRouter, Depends
from app.api.auth import require_company
from app.database import supabase

router = APIRouter(prefix="/quotes", tags=["quotes"])


@router.get("/")
async def list_quotes(company_id: str = Depends(require_company)):
    r = (
        supabase.table("quotes")
        .select("*")
        .eq("company_id", company_id)
        .order("created_at", desc=True)
        .limit(200)
        .execute()
    )
    return r.data or []


@router.patch("/{quote_id}/status")
async def update_status(quote_id: str, status: str, company_id: str = Depends(require_company)):
    allowed = ("pending", "sent", "accepted", "paid", "rejected")
    if status not in allowed:
        return {"error": "status inválido"}
    data = {"status": status}
    if status == "paid":
        from datetime import datetime, timezone
        data["paid_at"] = datetime.now(timezone.utc).isoformat()
    r = (
        supabase.table("quotes")
        .update(data)
        .eq("id", quote_id)
        .eq("company_id", company_id)
        .execute()
    )
    return r.data[0] if r.data else {}


@router.get("/dashboard")
async def dashboard_stats(company_id: str = Depends(require_company)):
    from datetime import datetime, timedelta
    now = datetime.utcnow()
    today = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    week_ago = (now - timedelta(days=7)).isoformat()

    conv_total = supabase.table("conversations").select("id", count="exact").eq("company_id", company_id).execute()
    conv_bot = supabase.table("conversations").select("id", count="exact").eq("company_id", company_id).eq("status", "bot").execute()
    quotes_today = supabase.table("quotes").select("id,total", count="exact").eq("company_id", company_id).gte("created_at", today).execute()
    quotes_week = supabase.table("quotes").select("id,total", count="exact").eq("company_id", company_id).gte("created_at", week_ago).execute()
    msg_today = supabase.table("messages").select("id", count="exact").eq("company_id", company_id).gte("created_at", today).execute()

    total_revenue_week = sum(float(q.get("total") or 0) for q in (quotes_week.data or []))

    return {
        "conversations_total": conv_total.count or 0,
        "conversations_bot": conv_bot.count or 0,
        "quotes_today": quotes_today.count or 0,
        "quotes_week": quotes_week.count or 0,
        "revenue_week": total_revenue_week,
        "messages_today": msg_today.count or 0,
    }


_WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']


@router.get("/activity")
async def weekly_activity(company_id: str = Depends(require_company)):
    """Conversas e cotações por dia, últimos 7 dias — dados reais pro gráfico do dashboard."""
    from datetime import datetime, timedelta
    start_day = (datetime.utcnow() - timedelta(days=6)).date()

    convs = (
        supabase.table("conversations").select("created_at")
        .eq("company_id", company_id).gte("created_at", start_day.isoformat()).execute()
    ).data or []
    quotes = (
        supabase.table("quotes").select("created_at")
        .eq("company_id", company_id).gte("created_at", start_day.isoformat()).execute()
    ).data or []

    buckets = {}
    for i in range(7):
        d = start_day + timedelta(days=i)
        buckets[d.isoformat()] = {"day": _WEEKDAY_LABELS[d.weekday()], "conversas": 0, "cotacoes": 0}

    for c in convs:
        key = (c.get("created_at") or "")[:10]
        if key in buckets:
            buckets[key]["conversas"] += 1
    for q in quotes:
        key = (q.get("created_at") or "")[:10]
        if key in buckets:
            buckets[key]["cotacoes"] += 1

    return list(buckets.values())
