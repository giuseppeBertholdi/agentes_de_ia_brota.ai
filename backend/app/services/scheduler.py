"""Job em processo único que dispara os follow-ups de pós-venda automaticamente
— antes disso, eles só saíam se alguém abrisse o painel e clicasse 'Enviar agora'."""
import logging
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.services.post_sale_delivery import send_due_follow_ups
from app.services.data_retention import purge_old_messages

logger = logging.getLogger("scheduler")

scheduler = AsyncIOScheduler()


async def _job():
    sent = await send_due_follow_ups()
    if sent:
        logger.info("Pós-venda automático: %d follow-up(s) enviado(s).", sent)


async def _retention_job():
    await purge_old_messages()


def start_scheduler() -> None:
    scheduler.add_job(
        _job, "interval", minutes=30, id="post_sale_follow_ups", next_run_time=datetime.now()
    )
    scheduler.add_job(
        _retention_job, "interval", hours=24, id="message_retention_purge", next_run_time=datetime.now()
    )
    scheduler.start()


def stop_scheduler() -> None:
    scheduler.shutdown(wait=False)
