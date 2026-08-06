"""
Agrupa mensagens que chegam em rajada (comportamento normal de cliente no
WhatsApp: manda 2-3 mensagens seguidas em vez de uma só) numa única chamada
de IA — sem isso, cada mensagem dispara seu próprio processamento em
paralelo, cada um lendo o histórico num instante diferente, o que pode gerar
respostas fora de ordem ou até cotações duplicadas para o mesmo pedido.

Buffer em memória por conversa: cada mensagem nova cancela o timer anterior
e agenda um novo. Só quando a conversa fica `DEBOUNCE_SECONDS` em silêncio é
que tudo que chegou nesse meio-tempo é concatenado e processado de uma vez.

Limitação aceita: como é em memória, um restart do processo no meio da
janela de debounce perde a mensagem pendente (sem resposta automática pro
cliente). Para a escala atual (uma instância, sem múltiplos workers) é um
trade-off razoável perto do problema que resolve.
"""
import asyncio
import logging

from app.database import supabase
from app.services import whatsapp_cloud_api
from app.services.ai_agent import process_message

logger = logging.getLogger("message_buffer")

DEBOUNCE_SECONDS = 3.0

_pending: dict[str, dict] = {}


async def enqueue_message(
    *,
    conversation_id: str,
    company_id: str,
    phone_number_id: str,
    from_number: str,
    content: str,
    wa_message_id: str,
) -> None:
    entry = _pending.get(conversation_id)
    if entry is None:
        entry = {"parts": [], "message_ids": [], "task": None}
        _pending[conversation_id] = entry

    if wa_message_id in entry["message_ids"]:
        return  # mesma mensagem reentregue pela Meta antes do flush

    entry["parts"].append(content)
    entry["message_ids"].append(wa_message_id)
    entry["company_id"] = company_id
    entry["phone_number_id"] = phone_number_id
    entry["from_number"] = from_number

    if entry["task"] is not None:
        entry["task"].cancel()
    entry["task"] = asyncio.create_task(_flush_after_delay(conversation_id))


async def _flush_after_delay(conversation_id: str) -> None:
    try:
        await asyncio.sleep(DEBOUNCE_SECONDS)
    except asyncio.CancelledError:
        return  # chegou mensagem nova nesse meio-tempo — o novo timer assume

    entry = _pending.pop(conversation_id, None)
    if not entry:
        return

    combined_message = "\n".join(p for p in entry["parts"] if p)
    last_message_id = entry["message_ids"][-1]
    company_id = entry["company_id"]
    phone_number_id = entry["phone_number_id"]
    from_number = entry["from_number"]

    saved_message_id = None
    try:
        reply, saved_message_id = await process_message(
            company_id, conversation_id, combined_message, last_message_id
        )
    except Exception:
        logger.exception("Falha ao processar mensagem com a IA (company_id=%s)", company_id)
        supabase.table("conversations").update({"status": "human"}).eq("id", conversation_id).execute()
        reply = (
            "Desculpe, tive um problema técnico agora. Já chamei alguém da equipe "
            "para te responder por aqui — só um momento!"
        )

    if not reply:
        return

    try:
        to = whatsapp_cloud_api.normalize_br_number(from_number)
        resp = await whatsapp_cloud_api.send_text(phone_number_id, to, reply)
        sent_wa_id = (resp.get("messages") or [{}])[0].get("id")
        if saved_message_id:
            supabase.table("messages").update(
                {"wa_message_id": sent_wa_id, "delivery_status": "sent"}
            ).eq("id", saved_message_id).execute()
    except Exception:
        logger.exception("Falha ao enviar resposta via WhatsApp (company_id=%s)", company_id)
        if saved_message_id:
            supabase.table("messages").update({"delivery_status": "failed"}).eq("id", saved_message_id).execute()
