"""
Orquestrador dos agentes de IA da Brota.

Fluxo:
1. Recepcionista detecta intenção → decide: responde direto ou aciona Cotação
2. Agente de Cotação conduz coleta de dados e gera proposta formatada
"""
from __future__ import annotations

import json
from typing import Any
from openai import AsyncOpenAI
from app.config import settings
from app.database import supabase

client = AsyncOpenAI(api_key=settings.openai_api_key)

MODEL = "gpt-4o-mini"


# ---------------------------------------------------------------------------
# helpers de contexto
# ---------------------------------------------------------------------------

def _price_table_text(items: list[dict]) -> str:
    if not items:
        return "Tabela de preços não configurada."
    lines = ["Tabela de preços:"]
    for it in items:
        if it.get("active"):
            lines.append(f"- {it['name']}: R$ {it['price']:.2f}/{it['unit']}"
                         + (f" — {it['description']}" if it.get("description") else ""))
    return "\n".join(lines)


def _history_text(messages: list[dict]) -> list[dict]:
    return [{"role": m["role"], "content": m["content"]} for m in messages]


def _departments_text(departments: list[dict]) -> str:
    if not departments:
        return ""
    lines = ["\nSetores disponíveis para transferência:"]
    for d in departments:
        lines.append(f"- {d['name']}" + (f": {d['description']}" if d.get("description") else ""))
    lines.append(
        '\nSe o cliente pedir para falar com um desses setores (ex: "quero falar com o RH"), '
        'responda APENAS com o JSON:\n'
        '{"action": "transfer", "department": "<nome exato do setor>", '
        '"message": "<mensagem curta avisando que vai transferir>"}'
    )
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Receptionist agent
# ---------------------------------------------------------------------------

RECEPTIONIST_BASE = """Você é a recepcionista virtual da empresa {company_name}.
Tom de voz: {voice_tone}.
Descrição do negócio: {business_desc}

Sua função:
1. Receber qualquer mensagem do cliente com cordialidade.
2. Entender a intenção: saudação, cotação/orçamento, agendamento, dúvida, reclamação, pedido para falar com um setor específico, ou outro.
3. Se o cliente quer um orçamento/cotação, responda APENAS com o JSON:
   {{"action": "quote", "reason": "<resumo breve do que o cliente quer>"}}
4. Para qualquer outra intenção, responda normalmente e inclua ao final:
   {{"action": "reply", "message": "<sua resposta aqui>"}}

Responda sempre em português brasileiro. Seja breve e humano."""


async def run_receptionist(
    company: dict,
    history: list[dict],
    user_message: str,
    custom_prompt: str | None = None,
    departments: list[dict] | None = None,
) -> dict:
    """Retorna {'action': 'reply'|'quote'|'transfer', 'message': str, 'reason': str, 'department': str}"""
    system = (custom_prompt or RECEPTIONIST_BASE).format(
        company_name=company.get("name", "a empresa"),
        voice_tone=company.get("voice_tone", "amigável"),
        business_desc=company.get("business_desc", ""),
    )
    system += _departments_text(departments or [])

    messages = [{"role": "system", "content": system}] + _history_text(history)
    messages.append({"role": "user", "content": user_message})

    resp = await client.chat.completions.create(model=MODEL, messages=messages, temperature=0.4)
    raw = resp.choices[0].message.content.strip()

    # tenta extrair JSON embutido
    try:
        start = raw.rfind("{")
        end = raw.rfind("}") + 1
        if start != -1:
            data = json.loads(raw[start:end])
            if data.get("action") == "quote":
                return {"action": "quote", "reason": data.get("reason", ""), "message": ""}
            if data.get("action") == "transfer":
                return {
                    "action": "transfer",
                    "department": data.get("department", ""),
                    "message": data.get("message", raw),
                    "reason": "",
                }
            if data.get("action") == "reply":
                return {"action": "reply", "message": data.get("message", raw), "reason": ""}
    except (json.JSONDecodeError, ValueError):
        pass

    return {"action": "reply", "message": raw, "reason": ""}


# ---------------------------------------------------------------------------
# Quote agent
# ---------------------------------------------------------------------------

QUOTE_BASE = """Você é o agente de cotação da empresa {company_name}.
Tom de voz: {voice_tone}.

{price_table}

Sua missão:
1. Conduzir uma conversa amigável para entender exatamente o que o cliente precisa.
2. Quando tiver informações suficientes, gere a cotação formatada e inclua no final:
   {{"action": "quote_ready", "items": [{{"name":"...", "qty":1, "unit_price":0.0, "subtotal":0.0}}], "total": 0.0, "message": "<texto amigável com o resumo>"}}
3. Se ainda precisar de mais informações, responda normalmente e inclua:
   {{"action": "collecting", "message": "<sua pergunta>"}}

Responda sempre em português brasileiro."""


async def run_quote_agent(
    company: dict,
    price_items: list[dict],
    history: list[dict],
    user_message: str,
    custom_prompt: str | None = None,
) -> dict:
    """Retorna {'action': 'collecting'|'quote_ready', 'message': str, 'items': list, 'total': float}"""
    system = (custom_prompt or QUOTE_BASE).format(
        company_name=company.get("name", "a empresa"),
        voice_tone=company.get("voice_tone", "amigável"),
        price_table=_price_table_text(price_items),
    )
    messages = [{"role": "system", "content": system}] + _history_text(history)
    messages.append({"role": "user", "content": user_message})

    resp = await client.chat.completions.create(model=MODEL, messages=messages, temperature=0.3)
    raw = resp.choices[0].message.content.strip()

    try:
        start = raw.rfind("{")
        end = raw.rfind("}") + 1
        if start != -1:
            data = json.loads(raw[start:end])
            action = data.get("action", "collecting")
            return {
                "action": action,
                "message": data.get("message", raw),
                "items": data.get("items", []),
                "total": data.get("total", 0.0),
            }
    except (json.JSONDecodeError, ValueError):
        pass

    return {"action": "collecting", "message": raw, "items": [], "total": 0.0}


# ---------------------------------------------------------------------------
# Orquestrador principal — chamado pelo webhook handler
# ---------------------------------------------------------------------------

async def process_message(company_id: str, conversation_id: str, user_message: str) -> str:
    """
    Retorna a resposta a ser enviada ao cliente.
    Salva a mensagem do usuário e a resposta no banco.
    """
    # carrega contexto
    company_r = supabase.table("companies").select("*").eq("id", company_id).single().execute()
    company = company_r.data

    history_r = (
        supabase.table("messages")
        .select("role,content")
        .eq("conversation_id", conversation_id)
        .order("created_at")
        .limit(30)
        .execute()
    )
    history = history_r.data or []

    agents_r = supabase.table("agent_configs").select("*").eq("company_id", company_id).execute()
    agents = {a["agent_type"]: a for a in (agents_r.data or [])}

    departments_r = supabase.table("departments").select("id,name,description").eq("company_id", company_id).execute()
    departments = departments_r.data or []

    # salva mensagem do usuário
    supabase.table("messages").insert({
        "conversation_id": conversation_id,
        "company_id": company_id,
        "role": "user",
        "content": user_message,
    }).execute()

    # verifica se conversa está em modo human
    conv_r = supabase.table("conversations").select("status").eq("id", conversation_id).single().execute()
    if conv_r.data and conv_r.data["status"] == "human":
        return ""  # humano assumiu — não responder

    # Recepcionista
    receptionist_cfg = agents.get("receptionist", {})
    if not receptionist_cfg.get("enabled", True):
        return ""

    rec_result = await run_receptionist(
        company=company,
        history=history,
        user_message=user_message,
        custom_prompt=receptionist_cfg.get("system_prompt"),
        departments=departments,
    )

    reply_text = ""

    if rec_result["action"] == "transfer":
        dept_name = (rec_result.get("department") or "").strip().lower()
        dept = next((d for d in departments if d["name"].strip().lower() == dept_name), None)
        if dept:
            supabase.table("conversations").update({
                "status": "human",
                "department_id": dept["id"],
            }).eq("id", conversation_id).execute()
            reply_text = rec_result.get("message") or f"Vou te transferir para o setor de {dept['name']}, aguarde um instante."
        else:
            # setor não reconhecido — não transfere, apenas responde normalmente
            reply_text = rec_result.get("message") or "Pode me contar um pouco mais sobre o que você precisa?"
    elif rec_result["action"] == "quote":
        # aciona agente de cotação
        quote_cfg = agents.get("quote", {})
        if quote_cfg.get("enabled", True):
            prices_r = supabase.table("price_items").select("*").eq("company_id", company_id).eq("active", True).execute()
            price_items = prices_r.data or []

            q_result = await run_quote_agent(
                company=company,
                price_items=price_items,
                history=history + [{"role": "user", "content": user_message}],
                user_message=user_message,
                custom_prompt=quote_cfg.get("system_prompt"),
            )
            reply_text = q_result["message"]

            if q_result["action"] == "quote_ready":
                # persiste a cotação
                supabase.table("quotes").insert({
                    "company_id": company_id,
                    "conversation_id": conversation_id,
                    "items": q_result["items"],
                    "total": q_result["total"],
                    "status": "sent",
                }).execute()
        else:
            reply_text = rec_result.get("message") or "Posso te ajudar com um orçamento! Pode me contar mais?"
    else:
        reply_text = rec_result["message"]

    if reply_text:
        supabase.table("messages").insert({
            "conversation_id": conversation_id,
            "company_id": company_id,
            "role": "assistant",
            "content": reply_text,
        }).execute()

    return reply_text
