import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from app.api.auth import require_company, require_active_subscription
from app.database import supabase
from app.services import whatsapp_cloud_api
from app.services.ai_agent import client as openai_client, MODEL
from app.models.schemas import PriceItem, AgentConfigUpdate, CompanyUpdate, EmbeddedSignupCallback, PriceQuestionsRequest, AiModeUpdate, TestNumberConnect

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


# ── Interruptor geral da IA ─────────────────────────────────────────────────

@router.post("/ai-mode")
async def set_ai_mode(body: AiModeUpdate, company_id: str = Depends(require_company)):
    """Liga/desliga os dois agentes de uma vez. Ao desligar, todas as conversas
    em andamento (que não sejam já 'human' ou 'resolved') passam pra modo
    humano na hora — sem isso o Inbox continuaria mostrando "Bot" numa
    conversa que na prática já não tem mais ninguém (nem IA nem humano) respondendo."""
    supabase.table("companies").update({"ai_enabled": body.enabled}).eq("id", company_id).execute()
    if not body.enabled:
        supabase.table("conversations").update({"status": "human"}).eq(
            "company_id", company_id
        ).in_("status", ["bot", "awaiting_payment"]).execute()
    return {"ok": True}


# ── Price items ───────────────────────────────────────────────────────────────

@router.get("/prices")
async def list_prices(company_id: str = Depends(require_company)):
    r = supabase.table("price_items").select("*").eq("company_id", company_id).order("name").execute()
    return r.data or []


@router.post("/prices/questions")
async def suggest_price_questions(body: PriceQuestionsRequest, company_id: str = Depends(require_company)):
    """
    Sugere perguntas pra fazer ao cadastrar um produto/serviço — as respostas viram
    parte da descrição, que o agente de Cotação usa como contexto nas conversas.
    """
    prompt = (
        f'Um dono de negócio está cadastrando o item "{body.name}" na tabela de preços dele. '
        "Sugira de 2 a 4 perguntas curtas e práticas que, se respondidas, ajudariam um "
        "atendente de IA a montar cotações precisas pra esse item no futuro (ex: o que faz o "
        "preço variar, informações que precisa pedir ao cliente, prazos, condições especiais). "
        'Responda APENAS com JSON: {"questions": ["...", "..."]}'
    )
    resp = await openai_client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.5,
        response_format={"type": "json_object"},
    )
    try:
        data = json.loads(resp.choices[0].message.content.strip())
        return {"questions": data.get("questions", [])}
    except (json.JSONDecodeError, ValueError):
        return {"questions": []}


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


@router.post("/whatsapp/connect-test-number")
async def connect_test_number(body: TestNumberConnect, company_id: str = Depends(require_active_subscription)):
    """
    Conecta o número de teste que a própria Meta disponibiliza no App Dashboard
    (WhatsApp > Configuração da API) — diferente do Embedded Signup normal, aqui
    não existe 'code' pra trocar: o System User do Brota já tem acesso porque
    esse número pertence ao mesmo App/Negócio onde o token foi gerado. Só falta
    inscrever o app nos eventos da WABA (pra receber webhook) e salvar a conexão.
    """
    try:
        await whatsapp_cloud_api.subscribe_app_to_waba(body.waba_id)
        info = await whatsapp_cloud_api.get_phone_number_info(body.phone_number_id)
    except Exception as e:
        raise HTTPException(400, f"Falha ao conectar número de teste: {e}")

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
