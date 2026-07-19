from fastapi import APIRouter, Depends, HTTPException
from app.api.auth import require_company
from app.database import supabase
from app.models.schemas import DepartmentCreate, DepartmentUpdate, TeamMemberUpdate

router = APIRouter(prefix="/team", tags=["team"])


# ── Departments (setores) ──────────────────────────────────────────────────

@router.get("/departments")
async def list_departments(company_id: str = Depends(require_company)):
    r = supabase.table("departments").select("*").eq("company_id", company_id).order("name").execute()
    return r.data or []


@router.post("/departments")
async def create_department(body: DepartmentCreate, company_id: str = Depends(require_company)):
    data = body.model_dump(exclude_none=True)
    data["company_id"] = company_id
    r = supabase.table("departments").insert(data).execute()
    return r.data[0] if r.data else {}


@router.put("/departments/{department_id}")
async def update_department(department_id: str, body: DepartmentUpdate, company_id: str = Depends(require_company)):
    data = body.model_dump(exclude_none=True)
    r = (
        supabase.table("departments")
        .update(data)
        .eq("id", department_id)
        .eq("company_id", company_id)
        .execute()
    )
    return r.data[0] if r.data else {}


@router.delete("/departments/{department_id}")
async def delete_department(department_id: str, company_id: str = Depends(require_company)):
    supabase.table("departments").delete().eq("id", department_id).eq("company_id", company_id).execute()
    return {"ok": True}


# ── Team members (atendentes) ───────────────────────────────────────────────

@router.get("/members")
async def list_members(company_id: str = Depends(require_company)):
    r = (
        supabase.table("profiles")
        .select("id,full_name,role,department_id")
        .eq("company_id", company_id)
        .order("full_name")
        .execute()
    )
    return r.data or []


@router.put("/members/{profile_id}")
async def update_member(profile_id: str, body: TeamMemberUpdate, company_id: str = Depends(require_company)):
    member = (
        supabase.table("profiles")
        .select("id")
        .eq("id", profile_id)
        .eq("company_id", company_id)
        .maybe_single()
        .execute()
    )
    if not member or not member.data:
        raise HTTPException(404, "Membro não encontrado")

    r = (
        supabase.table("profiles")
        .update({"department_id": body.department_id})
        .eq("id", profile_id)
        .execute()
    )
    return r.data[0] if r.data else {}
