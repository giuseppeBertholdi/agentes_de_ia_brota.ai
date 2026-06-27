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
