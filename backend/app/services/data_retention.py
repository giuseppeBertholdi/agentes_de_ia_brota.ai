"""
Anonimização de mensagens antigas (LGPD) — mensagens de clientes finais não
ficam com o conteúdo guardado indefinidamente. A linha continua existindo
(contagens/relatórios continuam funcionando), só o texto é substituído.
"""
import logging
from datetime import datetime, timedelta, timezone

from starlette.concurrency import run_in_threadpool

from app.config import settings
from app.database import supabase

logger = logging.getLogger("data_retention")

REDACTED_PLACEHOLDER = "[conteúdo removido — retenção de dados]"


async def purge_old_messages() -> int:
    cutoff = (datetime.now(timezone.utc) - timedelta(days=settings.message_retention_days)).isoformat()
    r = await run_in_threadpool(
        supabase.table("messages")
        .update({"content": REDACTED_PLACEHOLDER})
        .lt("created_at", cutoff)
        .neq("content", REDACTED_PLACEHOLDER)
        .execute
    )
    count = len(r.data or [])
    if count:
        logger.info("Retenção de dados: %d mensagem(ns) anonimizada(s) (> %d dias).", count, settings.message_retention_days)
    return count
