"""
Fila de aprovação assíncrona para descontos fora da política configurada.
A IA cria a solicitação (ver `ai_agent.py`, ação `needs_approval`) sem enviar
nada ao cliente; um humano aprova (envia o valor pedido) ou recusa (envia o
máximo permitido) por aqui.
"""
from __future__ import annotations

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from app.api.auth import get_current_user, require_company
from app.database import supabase
from app.services import whatsapp_cloud_api

router = APIRouter(prefix="/approvals", tags=["approvals"])


def _format_quote_message(items: list[dict], total: float, intro: str) -> str:
    lines = [intro, ""]
    for it in items:
        lines.append(f"- {it.get('qty')}x {it.get('name')}: R$ {float(it.get('subtotal', 0)):.2f}")
    lines.append("")
    lines.append(f"Total: R$ {total:.2f}")
    return "\n".join(lines)


@router.get("/pending")
async def list_pending(company_id: str = Depends(require_company)):
    r = (
        supabase.table("ai_pending_approvals")
        .select("*, conversations(contact_name,contact_phone)")
        .eq("company_id", company_id)
        .eq("status", "pending")
        .order("created_at")
        .execute()
    )
    return r.data or []


@router.get("/pending-count")
async def pending_count(company_id: str = Depends(require_company)):
    r = (
        supabase.table("ai_pending_approvals")
        .select("id", count="exact")
        .eq("company_id", company_id)
        .eq("status", "pending")
        .execute()
    )
    return {"count": r.count or 0}


async def _resolve_approval(
    approval_id: str, company_id: str, user_id: str, *, approve: bool
) -> dict:
    # update condicional atômico — só uma requisição consegue "reivindicar" a
    # aprovação (where status='pending'); evita duas resoluções quase simultâneas
    # (ex: aprovar + rejeitar em cliques rápidos) mandando mensagens conflitantes
    claim_r = (
        supabase.table("ai_pending_approvals")
        .update({"status": "processing"})
        .eq("id", approval_id)
        .eq("company_id", company_id)
        .eq("status", "pending")
        .execute()
    )
    if not claim_r.data:
        # ou não existe, ou já foi resolvida/está sendo resolvida por outra requisição
        exists_r = (
            supabase.table("ai_pending_approvals")
            .select("id")
            .eq("id", approval_id)
            .eq("company_id", company_id)
            .maybe_single()
            .execute()
        )
        if not exists_r or not exists_r.data:
            raise HTTPException(404, "Solicitação não encontrada")
        raise HTTPException(409, "Essa solicitação já foi resolvida")
    approval = claim_r.data[0]

    conversation_id = approval["conversation_id"]
    conv_r = (
        supabase.table("conversations")
        .select("remote_jid,contact_name,contact_phone")
        .eq("id", conversation_id)
        .maybe_single()
        .execute()
    )
    if not conv_r or not conv_r.data:
        raise HTTPException(400, "Conversa de origem não encontrada")

    instance_r = (
        supabase.table("whatsapp_instances")
        .select("phone_number_id,status")
        .eq("company_id", company_id)
        .maybe_single()
        .execute()
    )
    if not instance_r or not instance_r.data or instance_r.data.get("status") != "connected":
        raise HTTPException(400, "WhatsApp não conectado")

    if approve:
        items, total = approval["requested_items"], float(approval["requested_total"])
        message = _format_quote_message(items, total, "Consegui aprovar o valor com a equipe! Segue a cotação:")
        new_status = "approved"
    else:
        items, total = approval["max_allowed_items"], float(approval["max_allowed_total"])
        message = _format_quote_message(items, total, "Verifiquei com a equipe — esse é o melhor valor que consigo oferecer:")
        new_status = "rejected"

    try:
        resp = await whatsapp_cloud_api.send_text(
            instance_r.data["phone_number_id"],
            whatsapp_cloud_api.normalize_br_number(conv_r.data["remote_jid"]),
            message,
        )
    except Exception as e:
        # devolve pro estado 'pending' pra a solicitação continuar retentável
        supabase.table("ai_pending_approvals").update({"status": "pending"}).eq("id", approval_id).execute()
        raise HTTPException(502, f"Falha ao enviar mensagem: {e}")

    # a cotação (aprovada ou com o valor máximo) vira a proposta ativa da
    # conversa — supersede qualquer outra ainda "sent", mesma lógica do bot
    supabase.table("quotes").update({"status": "superseded"}).eq(
        "conversation_id", conversation_id
    ).eq("status", "sent").execute()
    quote_r = supabase.table("quotes").insert({
        "company_id": company_id,
        "conversation_id": conversation_id,
        "contact_name": conv_r.data.get("contact_name"),
        "contact_phone": conv_r.data.get("contact_phone"),
        "items": items,
        "total": total,
        "status": "sent",
    }).execute()

    wa_id = (resp.get("messages") or [{}])[0].get("id")
    supabase.table("messages").insert({
        "conversation_id": conversation_id,
        "company_id": company_id,
        "role": "assistant",
        "content": message,
        "sent_by_human": True,
        "wa_message_id": wa_id,
    }).execute()

    supabase.table("ai_pending_approvals").update({
        "status": new_status,
        "quote_id": quote_r.data[0]["id"] if quote_r.data else None,
        "resolved_by": user_id,
        "resolved_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", approval_id).execute()

    return {"ok": True}


@router.post("/{approval_id}/approve")
async def approve(
    approval_id: str,
    user: dict = Depends(get_current_user),
    company_id: str = Depends(require_company),
):
    return await _resolve_approval(approval_id, company_id, user["id"], approve=True)


@router.post("/{approval_id}/reject")
async def reject(
    approval_id: str,
    user: dict = Depends(get_current_user),
    company_id: str = Depends(require_company),
):
    return await _resolve_approval(approval_id, company_id, user["id"], approve=False)
