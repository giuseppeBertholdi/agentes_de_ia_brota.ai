"""
Integração com a WhatsApp Cloud API (Meta) no modelo Tech Provider / Embedded Signup.

Modelo adotado:
- O Brota possui um único App Meta + System User com token permanente
  (settings.meta_system_user_token), usado para enviar mensagens e
  gerenciar todas as WABAs dos clientes.
- Cada empresa, ao concluir o Embedded Signup, concede ao App do Brota
  acesso à própria WABA — por isso não armazenamos token por empresa,
  apenas phone_number_id / waba_id.
"""
import httpx
from app.config import settings

GRAPH_BASE = f"https://graph.facebook.com/{settings.graph_api_version}"
SYSTEM_USER_HEADERS = {"Authorization": f"Bearer {settings.meta_system_user_token}"}


async def exchange_code_for_token(code: str) -> dict:
    """Troca o code do Embedded Signup por um access token (usado apenas para validar a concessão)."""
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(
            f"{GRAPH_BASE}/oauth/access_token",
            params={
                "client_id": settings.meta_app_id,
                "client_secret": settings.meta_app_secret,
                "code": code,
            },
        )
        r.raise_for_status()
        return r.json()


async def subscribe_app_to_waba(waba_id: str) -> dict:
    """Assina o App do Brota nos eventos da WABA do cliente (necessário para receber webhooks)."""
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(
            f"{GRAPH_BASE}/{waba_id}/subscribed_apps",
            headers=SYSTEM_USER_HEADERS,
        )
        r.raise_for_status()
        return r.json()


async def get_phone_number_info(phone_number_id: str) -> dict:
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(
            f"{GRAPH_BASE}/{phone_number_id}",
            headers=SYSTEM_USER_HEADERS,
            params={"fields": "display_phone_number,verified_name,code_verification_status"},
        )
        r.raise_for_status()
        return r.json()


async def send_text(phone_number_id: str, to: str, text: str) -> dict:
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(
            f"{GRAPH_BASE}/{phone_number_id}/messages",
            headers=SYSTEM_USER_HEADERS,
            json={
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": to,
                "type": "text",
                "text": {"body": text},
            },
        )
        r.raise_for_status()
        return r.json()


async def unsubscribe_app_from_waba(waba_id: str) -> dict:
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.delete(
            f"{GRAPH_BASE}/{waba_id}/subscribed_apps",
            headers=SYSTEM_USER_HEADERS,
        )
        r.raise_for_status()
        return r.json()
