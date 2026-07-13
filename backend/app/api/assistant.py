"""
Assistente de IA para configuração e consulta da plataforma via chat natural.
"""
from __future__ import annotations

import json
from fastapi import APIRouter, Depends
from openai import AsyncOpenAI
from pydantic import BaseModel
from typing import Any, Dict, List, Optional

from app.api.auth import require_company
from app.config import settings
from app.database import supabase

router = APIRouter(prefix="/assistant", tags=["assistant"])
client = AsyncOpenAI(api_key=settings.openai_api_key)
MODEL = "gpt-4o-mini"


class ChatMessage(BaseModel):
    role: str
    content: str


class AssistantChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []


TOOLS: List[dict] = [
    {
        "type": "function",
        "function": {
            "name": "update_company",
            "description": "Atualiza dados da empresa: nome, tom de voz e/ou descrição do negócio.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Nome da empresa"},
                    "voice_tone": {"type": "string", "description": "Tom de voz dos agentes (ex: amigável e descontraído, formal e objetivo)"},
                    "business_desc": {"type": "string", "description": "Descrição completa do negócio, produtos/serviços e público-alvo"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_price_item",
            "description": "Adiciona um novo produto ou serviço à tabela de preços.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Nome do produto ou serviço"},
                    "description": {"type": "string", "description": "Descrição opcional"},
                    "price": {"type": "number", "description": "Preço em reais"},
                    "unit": {"type": "string", "description": "Unidade de medida: un, kg, m², hora, dia, etc."},
                },
                "required": ["name", "price"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_price_item",
            "description": "Remove um item da tabela de preços pelo ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "item_id": {"type": "string", "description": "ID do item a remover"},
                    "item_name": {"type": "string", "description": "Nome do item (para confirmar ao usuário)"},
                },
                "required": ["item_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_agent",
            "description": "Ativa, desativa ou personaliza o prompt de um agente de IA.",
            "parameters": {
                "type": "object",
                "properties": {
                    "agent_type": {"type": "string", "enum": ["receptionist", "quote"], "description": "Tipo do agente"},
                    "enabled": {"type": "boolean", "description": "Se o agente deve estar ativo"},
                    "system_prompt": {"type": "string", "description": "Prompt personalizado. Omita para manter o atual ou use null para resetar ao padrão."},
                },
                "required": ["agent_type"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_department",
            "description": "Cria um setor/fila de atendimento (ex: RH, Financeiro, Vendas) para onde a recepcionista de IA pode transferir conversas quando o cliente pedir para falar com uma área específica.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Nome do setor, ex: RH, Financeiro, Suporte técnico"},
                    "description": {"type": "string", "description": "Descrição opcional do que o setor resolve"},
                },
                "required": ["name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_stats",
            "description": "Busca estatísticas do negócio: total de cotações, conversas ativas, receita estimada, itens no pós-venda.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
]


def _build_system(company: dict, prices: List[dict], agents: List[dict], departments: List[dict]) -> str:
    price_lines = "\n".join(
        f"  [{p['id']}] {p['name']} — R$ {float(p['price']):.2f}/{p.get('unit','un')}"
        + (f" ({p['description']})" if p.get("description") else "")
        for p in prices
    ) or "  (nenhum item cadastrado)"

    agent_lines = "\n".join(
        f"  {a['agent_type']}: {'ATIVO' if a.get('enabled', True) else 'INATIVO'}"
        + (" | tem prompt customizado" if a.get("system_prompt") else "")
        for a in agents
    ) or "  (configuração padrão)"

    department_lines = "\n".join(
        f"  {d['name']}" + (f" — {d['description']}" if d.get("description") else "")
        for d in departments
    ) or "  (nenhum setor cadastrado)"

    return f"""Você é o assistente inteligente da Brota, plataforma de agentes de IA para WhatsApp.

=== ESTADO ATUAL DA EMPRESA ===
Nome: {company.get('name') or 'não configurado'}
Tom de voz: {company.get('voice_tone') or 'não configurado'}
Descrição: {company.get('business_desc') or 'não configurada'}

Tabela de preços:
{price_lines}

Agentes:
{agent_lines}

Setores de atendimento:
{department_lines}
================================

Você pode fazer tudo via conversa:
- Configurar empresa, preços e agentes usando as ferramentas disponíveis
- Criar setores/filas de atendimento (create_department) para os quais a recepcionista de IA transfere conversas automaticamente quando o cliente pede para falar com uma área específica (ex: "quero falar com o RH")
- Responder perguntas sobre dados do negócio (get_stats)
- Sugerir melhorias e direcionamentos com base no contexto

Quando o usuário descrever o negócio pela primeira vez (onboarding), entenda bem e então:
1. Use update_company para salvar nome, tom de voz e descrição do negócio
2. Use create_price_item para cada produto/serviço mencionado com preço
3. Se fizer sentido para o negócio (ex: empresa com RH, financeiro, vendas, suporte), sugira e use create_department para os setores relevantes
4. Confirme o que foi configurado e explique que o último passo — conectar o número de WhatsApp — é feito em Configurações (você não faz essa parte, só avise que fica lá)

Seja natural, direto e proativo. Faça perguntas quando precisar de mais detalhes.
Responda sempre em português brasileiro."""


async def _execute_tool(name: str, args: dict, company_id: str) -> "tuple[str, dict]":
    """Executa a ferramenta e retorna (resultado_texto, metadados_da_ação)."""

    if name == "update_company":
        data = {k: v for k, v in args.items() if v is not None}
        supabase.table("companies").update(data).eq("id", company_id).execute()
        labels = []
        if "name" in data:
            labels.append(f"nome → {data['name']}")
        if "voice_tone" in data:
            labels.append(f"tom de voz → {data['voice_tone']}")
        if "business_desc" in data:
            labels.append("descrição do negócio atualizada")
        return f"Empresa atualizada: {', '.join(labels)}", {"type": "update_company", "data": data}

    if name == "create_price_item":
        item = {
            "company_id": company_id,
            "name": args["name"],
            "price": args["price"],
            "unit": args.get("unit", "un"),
            "active": True,
        }
        if args.get("description"):
            item["description"] = args["description"]
        r = supabase.table("price_items").insert(item).execute()
        created = r.data[0] if r.data else item
        return (
            f"Item criado: {args['name']} — R$ {args['price']:.2f}/{args.get('unit','un')}",
            {"type": "create_price_item", "data": created},
        )

    if name == "delete_price_item":
        supabase.table("price_items").delete().eq("id", args["item_id"]).eq("company_id", company_id).execute()
        label = args.get("item_name") or args["item_id"]
        return f"Item removido: {label}", {"type": "delete_price_item", "data": args}

    if name == "update_agent":
        agent_type = args["agent_type"]
        current_r = supabase.table("agent_configs").select("*").eq("company_id", company_id).eq("agent_type", agent_type).limit(1).execute()
        current = (current_r.data or [{}])[0]

        payload: Dict[str, Any] = {"company_id": company_id, "agent_type": agent_type}
        if "enabled" in args:
            payload["enabled"] = args["enabled"]
        else:
            payload["enabled"] = current.get("enabled", True)

        if "system_prompt" in args:
            payload["system_prompt"] = args["system_prompt"]
        elif current.get("system_prompt"):
            payload["system_prompt"] = current["system_prompt"]

        supabase.table("agent_configs").upsert(payload, on_conflict="company_id,agent_type").execute()
        status = "ativado" if payload.get("enabled", True) else "desativado"
        return (
            f"Agente {agent_type} {status}",
            {"type": "update_agent", "data": payload},
        )

    if name == "create_department":
        item = {"company_id": company_id, "name": args["name"]}
        if args.get("description"):
            item["description"] = args["description"]
        r = supabase.table("departments").insert(item).execute()
        created = r.data[0] if r.data else item
        return f"Setor criado: {args['name']}", {"type": "create_department", "data": created}

    if name == "get_stats":
        def _safe_query(table, *select_args, **filters):
            try:
                q = supabase.table(table).select(*select_args)
                for col, val in filters.items():
                    q = q.eq(col, val)
                return q.execute().data or []
            except Exception:
                return []

        quotes   = _safe_query("quotes",               "total",     company_id=company_id)
        convs    = _safe_query("conversations",         "id,status", company_id=company_id)
        postsale = _safe_query("post_sale_follow_ups", "id,status", company_id=company_id)

        total_revenue    = sum(float(q.get("total") or 0) for q in quotes)
        active_convs     = sum(1 for c in convs    if c.get("status") == "open")
        pending_postsale = sum(1 for p in postsale if p.get("status") == "pending")

        stats_data = {
            "quotes": len(quotes),
            "revenue": total_revenue,
            "active_conversations": active_convs,
            "total_conversations": len(convs),
            "pending_postsale": pending_postsale,
        }
        summary = (
            f"Total de cotações: {stats_data['quotes']} | "
            f"Receita estimada: R$ {stats_data['revenue']:.2f} | "
            f"Conversas ativas: {stats_data['active_conversations']} | "
            f"Total de conversas: {stats_data['total_conversations']} | "
            f"Pós-venda pendente: {stats_data['pending_postsale']}"
        )
        return summary, {"type": "get_stats", "_label": "Estatísticas consultadas", "data": stats_data}

    return f"Ferramenta desconhecida: {name}", {}


@router.post("/chat")
async def assistant_chat(body: AssistantChatRequest, company_id: str = Depends(require_company)):
    company_r = supabase.table("companies").select("*").eq("id", company_id).single().execute()
    company = company_r.data or {}

    prices_r = supabase.table("price_items").select("*").eq("company_id", company_id).order("name").execute()
    prices = prices_r.data or []

    agents_r = supabase.table("agent_configs").select("*").eq("company_id", company_id).execute()
    agents = agents_r.data or []

    departments_r = supabase.table("departments").select("*").eq("company_id", company_id).order("name").execute()
    departments = departments_r.data or []

    system = _build_system(company, prices, agents, departments)

    messages: List[dict] = [{"role": "system", "content": system}]
    for m in body.history[-20:]:
        messages.append({"role": m.role, "content": m.content})
    messages.append({"role": "user", "content": body.message})

    actions_taken: List[dict] = []

    # loop de tool calls
    for _ in range(6):
        resp = await client.chat.completions.create(
            model=MODEL,
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
            temperature=0.5,
        )
        choice = resp.choices[0]

        if choice.finish_reason == "tool_calls":
            msg = choice.message
            # constrói o dict manualmente — model_dump() pode incluir campos inválidos
            assistant_msg: Dict[str, Any] = {"role": "assistant", "content": msg.content}
            if msg.tool_calls:
                assistant_msg["tool_calls"] = [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                    }
                    for tc in msg.tool_calls
                ]
            messages.append(assistant_msg)

            for tc in msg.tool_calls:
                args = json.loads(tc.function.arguments)
                result_text, action_meta = await _execute_tool(tc.function.name, args, company_id)
                if action_meta:
                    badge_label = action_meta.pop("_label", result_text)
                    actions_taken.append({"label": badge_label, **action_meta})
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": result_text,
                })
        else:
            final_text = choice.message.content or ""
            return {"message": final_text, "actions": actions_taken}

    return {"message": "Pronto! Fiz tudo o que foi pedido.", "actions": actions_taken}
