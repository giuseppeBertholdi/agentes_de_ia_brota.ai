"""
Orquestrador dos agentes de IA da Brota.

Fluxo:
1. Recepcionista detecta intenção → decide: responde direto ou aciona Cotação
2. Agente de Cotação conduz coleta de dados e gera proposta formatada
"""
from __future__ import annotations

import copy
import json
from datetime import datetime, timezone
from typing import Any
from openai import AsyncOpenAI
from app.config import settings
from app.database import supabase

client = AsyncOpenAI(api_key=settings.openai_api_key, timeout=20.0, max_retries=2)

MODEL = "gpt-4o-mini"

# uma cotação "ganha" pode estar em qualquer um desses estágios — usado em
# todo lugar que precisa contar/filtrar cotações fechadas (relatórios,
# dashboard), pra nunca ter dois lugares com critérios diferentes do que
# conta como "aceita"
WON_QUOTE_STATUSES = {"accepted", "paid"}

USAGE_LIMIT_MESSAGE = (
    "No momento nosso atendimento automático atingiu o limite de mensagens deste mês. "
    "Já avisamos a equipe — alguém te responde por aqui em breve. Obrigado pela paciência!"
)

AI_UNAVAILABLE_MESSAGE = (
    "Desculpe, tive um problema técnico agora. Já chamei alguém da equipe para te "
    "responder por aqui — só um momento!"
)

AI_DISABLED_MESSAGE = (
    "No momento nosso atendimento é feito direto pela nossa equipe — já recebemos "
    "sua mensagem e alguém te responde por aqui em breve!"
)

DISCOUNT_APPROVAL_MESSAGE = (
    "Vou verificar esse valor com a equipe e já te retorno por aqui, só um instante!"
)

STUCK_ESCALATION_MESSAGE = (
    "Acho que não estou conseguindo te ajudar direito com isso por aqui — já vou chamar "
    "alguém da equipe pra continuar com você, só um instante!"
)


def _month_start_iso() -> str:
    now = datetime.now(timezone.utc)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()


def _monthly_ai_usage(company_id: str) -> int:
    """Conta quantas respostas de IA a empresa já gerou no mês corrente."""
    r = (
        supabase.table("messages")
        .select("id", count="exact")
        .eq("company_id", company_id)
        .eq("role", "assistant")
        .gte("created_at", _month_start_iso())
        .execute()
    )
    return r.count or 0


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


def _normalize(s: str) -> str:
    return " ".join((s or "").strip().lower().split())


def _match_price_item(name: str, price_items: list[dict]) -> dict | None:
    """Casa o nome de um item de cotação gerado pela IA com um item real da
    tabela de preços, para nunca confiar cegamente no preço que a IA disse."""
    norm = _normalize(name)
    if not norm:
        return None
    for it in price_items:
        it_norm = _normalize(it.get("name", ""))
        if it_norm and (it_norm == norm or it_norm in norm or norm in it_norm):
            return it
    return None


def _enforce_pricing(items: list[dict], price_items: list[dict], max_discount_pct: float) -> list[dict]:
    """Corrige o unit_price de itens que batem com a tabela de preços (a IA
    pode 'lembrar' errado) e limita qualquer desconto ao teto configurado."""
    for item in items:
        match = _match_price_item(item.get("name", ""), price_items)
        if not match:
            continue
        official_price = float(match.get("price", 0))
        unit_price = float(item.get("unit_price", official_price))
        floor = official_price * (1 - max(0.0, min(100.0, max_discount_pct)) / 100)
        item["unit_price"] = round(min(max(unit_price, floor), official_price), 2)
    return items


def _detect_out_of_policy(items: list[dict], price_items: list[dict], max_discount_pct: float) -> bool:
    """True se algum item pedir um preço abaixo do piso de desconto permitido —
    nesse caso a cotação não deve ser enviada direto, precisa de aprovação humana."""
    for item in items:
        match = _match_price_item(item.get("name", ""), price_items)
        if not match:
            continue
        official_price = float(match.get("price", 0))
        unit_price = float(item.get("unit_price", official_price))
        floor = official_price * (1 - max(0.0, min(100.0, max_discount_pct)) / 100)
        if unit_price < floor - 0.005:  # tolerância de arredondamento
            return True
    return False


MAX_CONTEXT_DOCS_CHARS = 12_000  # orçamento de caracteres injetados no prompt, entre todos os documentos


def _custom_instructions_text(custom_prompt: str | None) -> str:
    """O 'prompt customizado' configurado pela empresa entra como uma camada
    ADICIONAL de instruções — nunca substitui as instruções internas (que
    garantem o contrato de resposta em JSON, o roteamento pra cotação/setor e
    as redes de segurança contra loop). Sem isso, um prompt customizado que
    não conhece esse contrato pode fazer o agente responder fora do formato
    esperado, ou ignorar por completo lógica como roteamento e escalonamento."""
    if not custom_prompt:
        return ""
    return (
        "\n\nInstruções específicas desta empresa — siga à risca, mas sempre "
        "dentro do formato de resposta JSON definido acima:\n" + custom_prompt.strip()
    )


def _context_documents_text(documents: list[dict]) -> str:
    """Material que a empresa enviou pra Central de Contexto (tabela de preços,
    política da loja, FAQ etc.) — entra como fonte de verdade adicional, com um
    teto de caracteres pra não estourar o prompt quando tiver muito material."""
    if not documents:
        return ""
    lines = [
        "\nMaterial de apoio enviado pela empresa (use como fonte de verdade "
        "adicional, junto com a tabela de preços — se algo daqui contradizer o "
        "que o cliente disse, prevalece o que está aqui):"
    ]
    budget = MAX_CONTEXT_DOCS_CHARS
    for doc in documents:
        if budget <= 0:
            break
        chunk = f"\n--- {doc['filename']} ---\n{doc.get('content_text', '')}"
        if len(chunk) > budget:
            chunk = chunk[:budget] + "\n[...conteúdo truncado...]"
        lines.append(chunk)
        budget -= len(chunk)
    return "\n".join(lines)


def _departments_text(departments: list[dict]) -> str:
    if not departments:
        return ""
    lines = ["\nSetores disponíveis para transferência:"]
    for d in departments:
        lines.append(f"- {d['name']}" + (f": {d['description']}" if d.get("description") else ""))
    lines.append(
        '\nSe o cliente pedir para falar com um desses setores específicos (ex: "quero falar '
        'com o RH"), use o nome exato do setor no campo "department" da ação "transfer" — em '
        'vez de deixá-lo em branco/nulo.'
    )
    return "\n".join(lines)


DEFAULT_ACCEPT_MESSAGE = "Perfeito! Já vamos dar andamento e entraremos em contato em breve. Obrigado! 🙌"

ESCALATION_MESSAGE = "Entendo — já vou te colocar em contato com alguém da equipe. Só um instante!"


def _save_assistant_message(conversation_id: str, company_id: str, content: str) -> str | None:
    r = (
        supabase.table("messages")
        .insert({
            "conversation_id": conversation_id,
            "company_id": company_id,
            "role": "assistant",
            "content": content,
        })
        .execute()
    )
    return r.data[0]["id"] if r.data else None


def _is_repeating_last_reply(reply_text: str, history: list[dict]) -> bool:
    """True quando a resposta que a IA está prestes a mandar é essencialmente igual à
    última mensagem que ela mesma mandou — sinal de que ela travou numa pergunta/resposta
    e não está progredindo com o que o cliente pediu. Nesse caso é melhor chamar um humano
    do que insistir repetindo a mesma coisa por cima da mensagem nova do cliente."""
    if not reply_text or not history:
        return False
    last = history[-1]
    if last.get("role") != "assistant":
        return False
    return _normalize(last.get("content", "")) == _normalize(reply_text)


def _matches_escalation_keyword(user_message: str, keywords_csv: str | None) -> bool:
    if not keywords_csv:
        return False
    msg = _normalize(user_message)
    for kw in keywords_csv.split(","):
        kw = _normalize(kw)
        if kw and kw in msg:
            return True
    return False


def _customer_context_text(conversation: dict | None) -> str:
    today = datetime.now(timezone.utc).strftime("%d/%m/%Y")
    lines = [f"\nData de hoje: {today}."]
    name = (conversation or {}).get("contact_name")
    phone = (conversation or {}).get("contact_phone")
    if name:
        lines.append(f"Nome do cliente (já confirmado — não pergunte de novo): {name}.")
    if phone:
        lines.append(f"Telefone do cliente (já confirmado — não pergunte de novo): {phone}.")

    status = (conversation or {}).get("status")
    if status == "awaiting_payment":
        lines.append(
            "O cliente já aceitou uma cotação e está com pagamento pendente. Se ele tiver "
            "dúvidas ou quiser conversar sobre outra coisa, responda normalmente — não repita "
            "a cotação nem tente fechar negócio de novo, a equipe já está cuidando do "
            "pagamento dessa. Você continua disponível para qualquer outro assunto."
        )
    elif status == "resolved":
        lines.append(
            "Esta conversa já foi marcada como resolvida anteriormente. Se o cliente voltar a "
            "falar agora, trate normalmente como uma nova solicitação — não aja como se a "
            "conversa tivesse acabado."
        )
    return "\n".join(lines)


def _pending_approval_text(pending_approval: dict | None) -> str:
    if not pending_approval:
        return ""
    return (
        f"\nExiste uma solicitação de desconto (R$ {pending_approval.get('requested_total', 0):.2f}) "
        "aguardando aprovação da equipe para esse cliente. Se ele perguntar sobre ESSA cotação/"
        "desconto específico, apenas diga que ainda está sendo verificado e que você retorna assim "
        "que tiver resposta — não repita a negociação nem gere uma nova cotação para o mesmo pedido. "
        "Para qualquer OUTRO assunto, continue respondendo normalmente."
    )


def _business_hours_text(business_hours: str | None) -> str:
    if not business_hours:
        return ""
    return f"\nHorário de funcionamento da loja: {business_hours}."


def _pending_quote_text(quote: dict | None) -> str:
    if not quote:
        return ""
    return (
        f"\nExiste uma cotação pendente enviada a esse cliente, no valor de R$ {quote.get('total', 0):.2f}. "
        'Se o cliente confirmar que aceita/fecha negócio (ex: "fechado", "aceito", "pode fazer", "vamos '
        'nessa"), responda APENAS com o JSON:\n'
        '{"action": "accept_quote", "message": "<mensagem curta confirmando e avisando que a equipe vai '
        'entrar em contato/dar seguimento>"}'
    )


# ---------------------------------------------------------------------------
# Receptionist agent
# ---------------------------------------------------------------------------

RECEPTIONIST_BASE = """Você é a recepcionista virtual da empresa {company_name}.
Tom de voz: {voice_tone}.
Descrição do negócio: {business_desc}

Sua função:
1. Receber qualquer mensagem do cliente com cordialidade.
2. Entender a intenção: saudação, cotação/orçamento, dúvida, reclamação, pedido para falar
   com um setor específico ou com uma pessoa/atendente humano, ou outro.
3. Se o cliente quer um orçamento/cotação, responda com o JSON:
   {{"action": "quote", "reason": "<resumo breve do que o cliente quer>"}}
4. Se o cliente pedir explicitamente para falar com um humano/atendente/pessoa real —
   mesmo sem mencionar um setor específico —, responda APENAS com o JSON:
   {{"action": "transfer", "department": null, "message": "<mensagem curta avisando que vai transferir>"}}
5. Para qualquer outra intenção, responda normalmente e inclua:
   {{"action": "reply", "message": "<sua resposta aqui>"}}

Importante: você NÃO tem acesso a nenhuma agenda ou sistema de horários. Se o cliente
pedir pra marcar/agendar algo, nunca diga que confirmou um horário — apenas anote o que
ele pediu e informe que a equipe vai entrar em contato para confirmar o horário.

Depois que o cliente já aceitou uma cotação, pagou, ou uma conversa foi resolvida, você
continua disponível — nunca pare de responder por conta disso. Só pare de agir sozinho
quando o cliente pedir um humano ou quando as instruções abaixo mandarem esperar uma
aprovação.

Responda sempre em português brasileiro, com um objeto JSON válido no formato acima —
nada de texto fora do JSON. Seja breve e humano no campo "message"."""


async def run_receptionist(
    company: dict,
    history: list[dict],
    user_message: str,
    custom_prompt: str | None = None,
    departments: list[dict] | None = None,
    pending_quote: dict | None = None,
    conversation: dict | None = None,
    pending_approval: dict | None = None,
    context_documents: list[dict] | None = None,
) -> dict:
    """Retorna {'action': 'reply'|'quote'|'transfer'|'accept_quote', 'message': str, 'reason': str, 'department': str}"""
    system = RECEPTIONIST_BASE.format(
        company_name=company.get("name", "a empresa"),
        voice_tone=company.get("voice_tone", "amigável"),
        business_desc=company.get("business_desc", ""),
    )
    system += _custom_instructions_text(custom_prompt)
    system += _business_hours_text(company.get("business_hours"))
    system += _departments_text(departments or [])
    system += _pending_quote_text(pending_quote)
    system += _pending_approval_text(pending_approval)
    system += _customer_context_text(conversation)
    system += _context_documents_text(context_documents or [])

    messages = [{"role": "system", "content": system}] + _history_text(history)
    messages.append({"role": "user", "content": user_message})

    try:
        resp = await client.chat.completions.create(
            model=MODEL, messages=messages, temperature=0.4,
            response_format={"type": "json_object"},
        )
    except Exception:
        return {"action": "error", "message": "", "reason": ""}
    raw = resp.choices[0].message.content.strip()

    try:
        data = json.loads(raw)
        if data.get("action") == "quote":
            return {"action": "quote", "reason": data.get("reason", ""), "message": ""}
        if data.get("action") == "transfer":
            return {
                "action": "transfer",
                "department": data.get("department", ""),
                "message": data.get("message", raw),
                "reason": "",
            }
        if data.get("action") == "accept_quote" and pending_quote:
            return {"action": "accept_quote", "message": data.get("message", DEFAULT_ACCEPT_MESSAGE), "reason": ""}
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
1. ANTES de pedir qualquer dado, identifique o que o cliente realmente quer:
   a) Só saber o VALOR de um ou mais itens da tabela (ex: "quanto custa a hora?", "qual o
      valor da consulta?", "quanto é essa peça?") — responda direto com o(s) preço(s) da
      tabela. NUNCA peça quantidade nem qualquer outro dado só pra responder uma pergunta
      de preço. Use:
      {{"action": "info", "message": "<resposta direta com o(s) preço(s), sem coletar nada>"}}
   b) Uma pergunta genérica, vaga, ou uma dúvida sobre o negócio que não tem relação clara
      com fechar negócio nem com um preço específico — e você não teria como saber que
      pergunta de coleta faz sentido nesse contexto (ex: perguntar "quantas horas você
      precisa?" como resposta a uma dúvida que não tem nada a ver com contratar é
      confuso e fora de contexto pro cliente). NUNCA invente uma pergunta de coleta só
      pra manter a conversa andando — chame um humano:
      {{"action": "escalate", "message": "<mensagem curta avisando que vai chamar alguém da equipe>"}}
   c) Intenção clara de fechar negócio ou pedir um orçamento de verdade (ex: já mencionou
      quantidade, prazo, ou disse algo como "quero contratar"/"pode fazer um orçamento") —
      só nesse caso siga para os passos 2-5 abaixo.
2. Conduzir uma conversa amigável para entender exatamente o que o cliente precisa —
   incluindo a QUANTIDADE de cada item, SEMPRE na mesma unidade cadastrada na tabela de
   preços (ex: se o preço é por hora, pergunte quantas horas — nunca estime nem converta
   de uma unidade pra outra por conta própria, ex: metros quadrados virando horas).
   Nunca gere uma cotação sem essa quantidade confirmada pelo cliente.
3. Quando tiver informações suficientes, gere a cotação formatada:
   {{"action": "quote_ready", "items": [{{"name":"...", "qty":1, "unit_price":0.0, "subtotal":0.0}}], "total": 0.0, "message": "<resumo direto da cotação, sem saudação nem introdução>"}}
   subtotal de cada item = qty × unit_price. total = soma dos subtotais.
4. Se ainda precisar de mais informações, responda:
   {{"action": "collecting", "message": "<sua pergunta>"}}
5. Se o cliente pedir algo que você não tem como fazer (ex: analisar um site, uma foto, um
   documento, ou qualquer coisa fora de coletar dados e montar a cotação), NUNCA ignore o pedido
   repetindo a mesma pergunta de antes — reconheça que não consegue fazer aquilo especificamente
   e peça a informação necessária de outra forma (ex: pedir pra o cliente mesmo informar a
   quantidade/medida). Se ainda assim o cliente não conseguir ou não quiser responder, ou você
   perceber que está travado sem conseguir avançar a conversa, um humano deve assumir — responda
   com o JSON de "escalate" do item 1b.

Responda sempre em português brasileiro, com um objeto JSON válido no formato acima —
nada de texto fora do JSON. No campo "message", vá direto ao ponto — sem frases de
abertura como "Claro!" ou "Ótima pergunta"."""


def _negotiation_text(max_discount_pct: float) -> str:
    if max_discount_pct <= 0:
        return (
            "\nVocê NÃO tem autorização para dar desconto. Se o cliente pedir um preço "
            "menor, explique educadamente que os preços são fixos — nunca ofereça ou "
            "aceite um valor abaixo da tabela."
        )
    return (
        f"\nVocê pode negociar até {max_discount_pct:.0f}% de desconto sobre o preço de "
        "tabela de cada item, se o cliente pedir ou parecer hesitante com o preço. Nunca "
        f"ofereça mais que {max_discount_pct:.0f}% de desconto, mesmo que o cliente insista — "
        "nesse caso, diga que esse é o melhor valor que pode oferecer."
    )


async def run_quote_agent(
    company: dict,
    price_items: list[dict],
    history: list[dict],
    user_message: str,
    custom_prompt: str | None = None,
    conversation: dict | None = None,
    max_discount_pct: float = 0.0,
    pending_approval: dict | None = None,
    context_documents: list[dict] | None = None,
) -> dict:
    """Retorna {'action': 'collecting'|'quote_ready'|'needs_approval'|'error', 'message': str, 'items': list, 'total': float}"""
    system = QUOTE_BASE.format(
        company_name=company.get("name", "a empresa"),
        voice_tone=company.get("voice_tone", "amigável"),
        price_table=_price_table_text(price_items),
    )
    system += _custom_instructions_text(custom_prompt)
    system += _negotiation_text(max_discount_pct)
    system += _pending_approval_text(pending_approval)
    system += _customer_context_text(conversation)
    system += _context_documents_text(context_documents or [])
    messages = [{"role": "system", "content": system}] + _history_text(history)
    messages.append({"role": "user", "content": user_message})

    try:
        resp = await client.chat.completions.create(
            model=MODEL, messages=messages, temperature=0.3,
            response_format={"type": "json_object"},
        )
    except Exception:
        return {"action": "error", "message": "", "items": [], "total": 0.0}
    raw = resp.choices[0].message.content.strip()

    try:
        data = json.loads(raw)
        action = data.get("action", "collecting")
        items = data.get("items", [])
        if action == "quote_ready":
            if _detect_out_of_policy(items, price_items, max_discount_pct):
                # o desconto pedido passa do limite configurado — não envia
                # direto, cria uma aprovação pendente pra um humano decidir
                clamped_items = _enforce_pricing(copy.deepcopy(items), price_items, max_discount_pct)
                for item in clamped_items:
                    item["subtotal"] = round(float(item.get("qty", 0)) * float(item.get("unit_price", 0)), 2)
                clamped_total = round(sum(item["subtotal"] for item in clamped_items), 2)
                for item in items:
                    item["subtotal"] = round(float(item.get("qty", 0)) * float(item.get("unit_price", 0)), 2)
                total = round(sum(item["subtotal"] for item in items), 2)
                return {
                    "action": "needs_approval",
                    "message": "",
                    "items": items,
                    "total": total,
                    "clamped_items": clamped_items,
                    "clamped_total": clamped_total,
                }
            items = _enforce_pricing(items, price_items, max_discount_pct)
            for item in items:
                item["subtotal"] = round(float(item.get("qty", 0)) * float(item.get("unit_price", 0)), 2)
            total = round(sum(item["subtotal"] for item in items), 2)
        else:
            total = data.get("total", 0.0)
        return {
            "action": action,
            "message": data.get("message", raw),
            "items": items,
            "total": total,
        }
    except (json.JSONDecodeError, ValueError):
        pass

    return {"action": "collecting", "message": raw, "items": [], "total": 0.0}


# ---------------------------------------------------------------------------
# Orquestrador principal — chamado pelo webhook handler
# ---------------------------------------------------------------------------

async def process_message(
    company_id: str, conversation_id: str, user_message: str, message_id: str
) -> tuple[str, str | None]:
    """
    Retorna (resposta a ser enviada ao cliente, id da linha salva em `messages`)
    — o id é usado pelo webhook pra marcar o status de entrega depois de tentar
    enviar pelo WhatsApp. Salva a mensagem do usuário e a resposta no banco.
    """
    # a Meta reentrega o mesmo evento em at-least-once delivery — sem isso,
    # um reenvio gera resposta e cotação duplicadas
    existing = (
        supabase.table("messages")
        .select("id")
        .eq("company_id", company_id)
        .eq("message_id", message_id)
        .limit(1)
        .execute()
    )
    if existing.data:
        return "", None

    # carrega contexto
    company_r = supabase.table("companies").select("*").eq("id", company_id).single().execute()
    company = company_r.data

    # as 30 mensagens mais RECENTES, em ordem cronológica — buscar em ordem
    # ascendente sem desc=True pegaria as mais antigas e "congelaria" o
    # contexto da IA no começo da conversa
    history_r = (
        supabase.table("messages")
        .select("role,content")
        .eq("conversation_id", conversation_id)
        .order("created_at", desc=True)
        .limit(30)
        .execute()
    )
    history = list(reversed(history_r.data or []))

    agents_r = supabase.table("agent_configs").select("*").eq("company_id", company_id).execute()
    agents = {a["agent_type"]: a for a in (agents_r.data or [])}

    departments_r = supabase.table("departments").select("id,name,description").eq("company_id", company_id).execute()
    departments = departments_r.data or []

    pending_quote_r = (
        supabase.table("quotes")
        .select("id,total")
        .eq("conversation_id", conversation_id)
        .eq("status", "sent")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    pending_quote = (pending_quote_r.data or [None])[0]

    pending_approval_r = (
        supabase.table("ai_pending_approvals")
        .select("id,requested_total")
        .eq("conversation_id", conversation_id)
        .eq("status", "pending")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    pending_approval = (pending_approval_r.data or [None])[0]

    context_docs_r = (
        supabase.table("context_documents")
        .select("filename,content_text")
        .eq("company_id", company_id)
        .order("created_at", desc=True)
        .execute()
    )
    context_documents = context_docs_r.data or []

    conversation_r = (
        supabase.table("conversations")
        .select("status,contact_name,contact_phone")
        .eq("id", conversation_id)
        .single()
        .execute()
    )
    conversation = conversation_r.data

    # salva mensagem do usuário
    supabase.table("messages").insert({
        "conversation_id": conversation_id,
        "company_id": company_id,
        "role": "user",
        "content": user_message,
        "message_id": message_id,
    }).execute()

    # interruptor geral da IA (Dashboard) — desligado, tudo vira modo humano.
    # conversas que já estavam em 'bot'/'awaiting_payment' são migradas em
    # bloco no momento do desligamento (ver settings.py:set_ai_mode); isso
    # aqui cobre conversas NOVAS que chegam enquanto a IA está desligada
    if company and not company.get("ai_enabled", True):
        already_human = conversation and conversation.get("status") == "human"
        if not already_human:
            supabase.table("conversations").update({"status": "human"}).eq("id", conversation_id).execute()
            msg_id = _save_assistant_message(conversation_id, company_id, AI_DISABLED_MESSAGE)
            return AI_DISABLED_MESSAGE, msg_id
        return "", None

    # a IA só para de responder quando um humano assumiu de fato a conversa —
    # 'awaiting_payment' e 'resolved' são só rótulos de estágio, não silenciam
    # a IA: o cliente continua podendo tirar dúvidas normalmente
    if conversation and conversation["status"] == "human":
        return "", None

    # teto de uso mensal — protege a margem do plano contra picos de custo de IA
    if _monthly_ai_usage(company_id) >= settings.ai_monthly_message_limit:
        msg_id = _save_assistant_message(conversation_id, company_id, USAGE_LIMIT_MESSAGE)
        return USAGE_LIMIT_MESSAGE, msg_id

    # Recepcionista
    receptionist_cfg = agents.get("receptionist", {})
    if not receptionist_cfg.get("enabled", True):
        return "", None

    # palavras-chave de escalonamento (ex: "cancelar", "reclamação", "advogado")
    # pulam a IA inteiramente e chamam um humano — configurável por empresa
    if _matches_escalation_keyword(user_message, receptionist_cfg.get("escalation_keywords")):
        supabase.table("conversations").update({"status": "human"}).eq("id", conversation_id).execute()
        msg_id = _save_assistant_message(conversation_id, company_id, ESCALATION_MESSAGE)
        return ESCALATION_MESSAGE, msg_id

    rec_result = await run_receptionist(
        company=company,
        history=history,
        user_message=user_message,
        custom_prompt=receptionist_cfg.get("system_prompt"),
        departments=departments,
        pending_quote=pending_quote,
        conversation=conversation,
        pending_approval=pending_approval,
        context_documents=context_documents,
    )

    reply_text = ""

    if rec_result["action"] == "error":
        supabase.table("conversations").update({"status": "human"}).eq("id", conversation_id).execute()
        reply_text = AI_UNAVAILABLE_MESSAGE
    elif rec_result["action"] == "accept_quote":
        supabase.table("quotes").update({"status": "accepted"}).eq("id", pending_quote["id"]).execute()
        # entrega para um humano cobrar o pagamento — a IA para de responder
        # automaticamente a partir daqui, ver checagem de status acima
        supabase.table("conversations").update({"status": "awaiting_payment"}).eq("id", conversation_id).execute()
        reply_text = rec_result.get("message") or DEFAULT_ACCEPT_MESSAGE
        payment_instructions = (company or {}).get("payment_instructions")
        if payment_instructions:
            reply_text = f"{reply_text}\n\n{payment_instructions}"
    elif rec_result["action"] == "transfer":
        # transferência sempre acontece — com departamento específico quando o
        # cliente citou um setor configurado, ou genérica (sem departamento)
        # quando ele só pediu por "um humano/atendente"
        dept_name = (rec_result.get("department") or "").strip().lower()
        dept = next((d for d in departments if d["name"].strip().lower() == dept_name), None) if dept_name else None
        update = {"status": "human"}
        if dept:
            update["department_id"] = dept["id"]
        supabase.table("conversations").update(update).eq("id", conversation_id).execute()
        reply_text = rec_result.get("message") or (
            f"Vou te transferir para o setor de {dept['name']}, aguarde um instante."
            if dept else "Vou te colocar em contato com alguém da equipe, só um instante!"
        )
    elif rec_result["action"] == "quote":
        # aciona agente de cotação
        quote_cfg = agents.get("quote", {})
        if quote_cfg.get("enabled", True):
            prices_r = supabase.table("price_items").select("*").eq("company_id", company_id).eq("active", True).execute()
            price_items = prices_r.data or []

            q_result = await run_quote_agent(
                company=company,
                price_items=price_items,
                history=history,
                user_message=user_message,
                custom_prompt=quote_cfg.get("system_prompt"),
                conversation=conversation,
                max_discount_pct=float(quote_cfg.get("max_discount_pct") or 0),
                pending_approval=pending_approval,
                context_documents=context_documents,
            )

            if q_result["action"] == "error":
                supabase.table("conversations").update({"status": "human"}).eq("id", conversation_id).execute()
                reply_text = AI_UNAVAILABLE_MESSAGE
            elif q_result["action"] == "escalate":
                supabase.table("conversations").update({"status": "human"}).eq("id", conversation_id).execute()
                reply_text = q_result.get("message") or ESCALATION_MESSAGE
            elif q_result["action"] == "needs_approval":
                if pending_approval:
                    # já existe uma aprovação em aberto pra essa conversa — não
                    # duplica, só reforça que ainda está em análise
                    reply_text = "Ainda estou verificando esse valor com a equipe, te aviso assim que tiver retorno!"
                else:
                    supabase.table("ai_pending_approvals").insert({
                        "company_id": company_id,
                        "conversation_id": conversation_id,
                        "requested_items": q_result["items"],
                        "requested_total": q_result["total"],
                        "max_allowed_items": q_result["clamped_items"],
                        "max_allowed_total": q_result["clamped_total"],
                        "customer_message": DISCOUNT_APPROVAL_MESSAGE,
                        "status": "pending",
                    }).execute()
                    reply_text = DISCOUNT_APPROVAL_MESSAGE
            else:
                reply_text = q_result["message"]
                if q_result["action"] == "collecting" and _is_repeating_last_reply(reply_text, history):
                    # a IA ficou travada repetindo a mesma pergunta em vez de avançar
                    # ou reconhecer que não sabe responder o que o cliente pediu
                    supabase.table("conversations").update({"status": "human"}).eq("id", conversation_id).execute()
                    reply_text = STUCK_ESCALATION_MESSAGE

            if q_result["action"] == "quote_ready":
                # uma cotação nova substitui qualquer cotação anterior ainda
                # pendente nessa conversa — evita "fechar" a cotação errada
                # quando o cliente pediu uma segunda cotação diferente
                supabase.table("quotes").update({"status": "superseded"}).eq(
                    "conversation_id", conversation_id
                ).eq("status", "sent").execute()

                supabase.table("quotes").insert({
                    "company_id": company_id,
                    "conversation_id": conversation_id,
                    "contact_name": (conversation or {}).get("contact_name"),
                    "contact_phone": (conversation or {}).get("contact_phone"),
                    "items": q_result["items"],
                    "total": q_result["total"],
                    "status": "sent",
                }).execute()
        else:
            reply_text = rec_result.get("message") or "Posso te ajudar com um orçamento! Pode me contar mais?"
    else:
        reply_text = rec_result["message"]
        if _is_repeating_last_reply(reply_text, history):
            supabase.table("conversations").update({"status": "human"}).eq("id", conversation_id).execute()
            reply_text = STUCK_ESCALATION_MESSAGE

    msg_id = _save_assistant_message(conversation_id, company_id, reply_text) if reply_text else None
    return reply_text, msg_id
