"""
Dependência de autenticação — verifica JWT do Supabase e retorna company_id.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.config import settings
from app.database import supabase

bearer = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
) -> dict:
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token sem subject")

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
