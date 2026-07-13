"""
Dependência de autenticação — valida JWT via Supabase (sem depender de SUPABASE_JWT_SECRET).
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.database import supabase

bearer = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
) -> dict:
    token = credentials.credentials
    try:
        # Valida o token direto com o Supabase — não precisa do JWT secret local
        resp = supabase.auth.get_user(token)
        user = resp.user
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
        user_id = user.id
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")

    profile_r = (
        supabase.table("profiles")
        .select("id,company_id,role,full_name")
        .eq("id", user_id)
        .single()
        .execute()
    )
    if not profile_r.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Perfil não encontrado")

    return profile_r.data


def require_company(user: dict = Depends(get_current_user)) -> str:
    cid = user.get("company_id")
    if not cid:
        raise HTTPException(status_code=400, detail="Usuário sem empresa associada")
    return cid


def _company_billing(company_id: str) -> dict:
    r = (
        supabase.table("companies")
        .select("subscription_status,onboarding_completed_at")
        .eq("id", company_id)
        .single()
        .execute()
    )
    return r.data or {}


def require_active_subscription(company_id: str = Depends(require_company)) -> str:
    """Bloqueia sempre que a assinatura não estiver ativa — usado em recursos pagos (ex: conectar WhatsApp)."""
    company = _company_billing(company_id)
    if company.get("subscription_status") != "active":
        raise HTTPException(status_code=402, detail="Assinatura necessária")
    return company_id


def require_active_subscription_after_onboarding(company_id: str = Depends(require_company)) -> str:
    """Libera livremente enquanto o onboarding gratuito não foi concluído; depois disso exige assinatura ativa."""
    company = _company_billing(company_id)
    if company.get("onboarding_completed_at") and company.get("subscription_status") != "active":
        raise HTTPException(status_code=402, detail="Assinatura necessária")
    return company_id
