"""Envio de mensagens de pós-venda — usado tanto pelo botão manual quanto pelo
job automático (`post_sale_scheduler`)."""
import logging

from app.database import supabase
from app.services import whatsapp_cloud_api

logger = logging.getLogger("post_sale")


async def deliver_follow_up(follow_up: dict) -> None:
    """Envia um follow-up de pós-venda e marca como concluído. Lança exceção
    se não conseguir enviar — quem chama decide o que fazer com a falha."""
    conv_r = (
        supabase.table("conversations")
        .select("remote_jid")
        .eq("id", follow_up["conversation_id"])
        .maybe_single()
        .execute()
    )
    if not conv_r or not conv_r.data:
        raise ValueError("Conversa de origem não encontrada")

    instance_r = (
        supabase.table("whatsapp_instances")
        .select("phone_number_id,status")
        .eq("company_id", follow_up["company_id"])
        .maybe_single()
        .execute()
    )
    if not instance_r or not instance_r.data or instance_r.data.get("status") != "connected":
        raise ValueError("WhatsApp não conectado")

    to = whatsapp_cloud_api.normalize_br_number(conv_r.data["remote_jid"])

    # follow-up de pós-venda quase sempre chega dias depois da última mensagem
    # do cliente — fora da janela de 24h a Cloud API rejeita texto livre, só
    # aceita uma Message Template aprovada pela Meta. Sem template configurado,
    # tenta o texto livre mesmo assim (funciona só se o cliente respondeu algo
    # recentemente) — comportamento anterior, mantido como fallback.
    company_r = (
        supabase.table("companies")
        .select("followup_template_name,followup_template_language")
        .eq("id", follow_up["company_id"])
        .maybe_single()
        .execute()
    )
    template_name = (company_r.data or {}).get("followup_template_name") if company_r else None

    if template_name:
        resp = await whatsapp_cloud_api.send_template(
            instance_r.data["phone_number_id"],
            to,
            template_name,
            (company_r.data or {}).get("followup_template_language") or "pt_BR",
            body_params=[follow_up.get("contact_name") or "cliente"],
        )
    else:
        resp = await whatsapp_cloud_api.send_text(
            instance_r.data["phone_number_id"], to, follow_up["message"]
        )
    wa_id = (resp.get("messages") or [{}])[0].get("id")

    supabase.table("messages").insert({
        "conversation_id": follow_up["conversation_id"],
        "company_id": follow_up["company_id"],
        "role": "assistant",
        "content": follow_up["message"],
        "sent_by_human": False,
        "wa_message_id": wa_id,
    }).execute()

    supabase.table("post_sale_follow_ups").update({"status": "done"}).eq("id", follow_up["id"]).execute()


async def send_due_follow_ups() -> int:
    """Roda periodicamente: envia todo follow-up pendente cuja data já chegou,
    sem depender de alguém lembrar de abrir o painel e clicar 'Enviar agora'."""
    from datetime import date

    due_r = (
        supabase.table("post_sale_follow_ups")
        .select("*")
        .eq("status", "pending")
        .lte("scheduled_for", date.today().isoformat())
        .execute()
    )
    due = due_r.data or []

    sent = 0
    for follow_up in due:
        try:
            await deliver_follow_up(follow_up)
            sent += 1
        except Exception:
            logger.exception(
                "Falha ao enviar follow-up de pós-venda automático (id=%s, company_id=%s)",
                follow_up.get("id"), follow_up.get("company_id"),
            )
    return sent
