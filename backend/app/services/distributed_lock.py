"""
Lock distribuído opcional — só ativa se `REDIS_URL` estiver configurada. Sem
ela, `try_acquire` sempre retorna True (comportamento atual, em memória,
correto pra uma única instância).

Usado hoje só pelo `message_buffer.py`, pra evitar que duas instâncias do
backend processem a mesma conversa ao mesmo tempo (duas respostas/cotações
duplicadas pro mesmo cliente) se o serviço um dia rodar com mais de um
worker/instância.
"""
import logging

from app.config import settings

logger = logging.getLogger("distributed_lock")

_redis = None
if settings.redis_url:
    import redis.asyncio as redis

    _redis = redis.from_url(settings.redis_url)


async def try_acquire(key: str, ttl_seconds: int) -> bool:
    if _redis is None:
        return True
    try:
        return bool(await _redis.set(key, "1", nx=True, ex=ttl_seconds))
    except Exception:
        logger.exception("Falha ao tentar lock distribuído (key=%s) — seguindo sem lock", key)
        return True


async def release(key: str) -> None:
    if _redis is None:
        return
    try:
        await _redis.delete(key)
    except Exception:
        logger.exception("Falha ao liberar lock distribuído (key=%s)", key)
