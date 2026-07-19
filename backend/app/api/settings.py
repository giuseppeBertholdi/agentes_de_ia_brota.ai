from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from app.api.auth import require_company, require_active_subscription
from app.database import supabase
from app.services import whatsapp_cloud_api
from app.models.schemas import PriceItem, AgentConfigUpdate, CompanyUpdate, EmbeddedSignupCallback

router = APIRouter(prefix="/settings", tags=["settings"])


# ── Company ──────────────────────────────────────────────────────────────────

@router.get("/company")
async def get_company(company_id: str = Depends(require_company)):
    r = supabase.table("companies").select("*").eq("id", company_id).single().execute()
    return r.data


@router.patch("/company")
async def update_company(body: CompanyUpdate, company_id: str = Depends(require_company)):
    data = body.model_dump(exclude_none=True)
    r = supabase.table("companies").update(data).eq("id", company_id).execute()
    return r.data[0] if r.data else {}


# ── Price items ───────────────────────────────────────────────────────────────

@router.get("/prices")
async def list_prices(company_id: str = Depends(require_company)):
    r = supabase.table("price_items").select("*").eq("company_id", company_id).order("name").execute()
    return r.data or []


@router.post("/prices")
async def create_price(item: PriceItem, company_id: str = Depends(require_company)):
    data = item.model_dump(exclude={"id"})
    data["company_id"] = company_id
    r = supabase.table("price_items").insert(data).execute()
    return r.data[0] if r.data else {}


@router.put("/prices/{item_id}")
async def update_price(item_id: str, item: PriceItem, company_id: str = Depends(require_company)):
    data = item.model_dump(exclude={"id"})
    r = supabase.table("price_items").update(data).eq("id", item_id).eq("company_id", company_id).execute()
    return r.data[0] if r.data else {}


@router.delete("/prices/{item_id}")
async def delete_price(item_id: str, company_id: str = Depends(require_company)):
    supabase.table("price_items").delete().eq("id", item_id).eq("company_id", company_id).execute()
    return {"ok": True}


# ── Agent configs ─────────────────────────────────────────────────────────────

@router.get("/agents")
async def list_agents(company_id: str = Depends(require_company)):
    r = supabase.table("agent_configs").select("*").eq("company_id", company_id).execute()
    return r.data or []


@router.put("/agents/{agent_type}")
async def upsert_agent(
    agent_type: str,
    body: AgentConfigUpdate,
    company_id: str = Depends(require_company),
):
    if agent_type not in ("receptionist", "quote"):
        raise HTTPException(400, "Tipo de agente inválido")
    data = body.model_dump(exclude_none=True)
    data["company_id"] = company_id
    data["agent_type"] = agent_type
    r = supabase.table("agent_configs").upsert(data, on_conflict="company_id,agent_type").execute()
    return r.data[0] if r.data else {}


# ── WhatsApp instance (Embedded Signup / Cloud API) ──────────────────────────

@router.get("/whatsapp")
async def get_whatsapp(company_id: str = Depends(require_company)):
    r = supabase.table("whatsapp_instances").select("*").eq("company_id", company_id).maybe_single().execute()
    return (r.data if r else None) or {}


@router.post("/whatsapp/embedded-signup")
async def embedded_signup(body: EmbeddedSignupCallback, company_id: str = Depends(require_active_subscription)):
    """Recebe o code + waba_id/phone_number_id do Embedded Signup (Facebook JS SDK) e finaliza a conexão."""
    try:
        await whatsapp_cloud_api.exchange_code_for_token(body.code)
        await whatsapp_cloud_api.subscribe_app_to_waba(body.waba_id)
        info = await whatsapp_cloud_api.get_phone_number_info(body.phone_number_id)
    except Exception as e:
        raise HTTPException(400, f"Falha ao concluir conexão com a Meta: {e}")

    data = {
        "company_id": company_id,
        "waba_id": body.waba_id,
        "phone_number_id": body.phone_number_id,
        "display_phone_number": info.get("display_phone_number"),
        "verified_name": info.get("verified_name"),
        "status": "connected",
    }
    r = supabase.table("whatsapp_instances").upsert(data, on_conflict="company_id").execute()
    return r.data[0] if r.data else {}


@router.post("/whatsapp/disconnect")
async def disconnect_whatsapp(company_id: str = Depends(require_company)):
    inst = supabase.table("whatsapp_instances").select("waba_id").eq("company_id", company_id).maybe_single().execute()
    if inst and inst.data and inst.data.get("waba_id"):
        try:
            await whatsapp_cloud_api.unsubscribe_app_from_waba(inst.data["waba_id"])
        except Exception:
            pass
    supabase.table("whatsapp_instances").update({"status": "disconnected"}).eq(
        "company_id", company_id
    ).execute()
    return {"ok": True}


# ── Onboarding ────────────────────────────────────────────────────────────────

@router.post("/onboarding/complete")
async def complete_onboarding(company_id: str = Depends(require_company)):
    """Marca o fim do onboarding gratuito — a partir daqui o chat com a IA passa a exigir assinatura ativa."""
    now = datetime.now(timezone.utc).isoformat()
    supabase.table("companies").update({"onboarding_completed_at": now}).eq("id", company_id).execute()
    return {"ok": True}
