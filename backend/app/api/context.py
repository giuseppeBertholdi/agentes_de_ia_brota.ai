from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from app.api.auth import require_company
from app.database import supabase
from app.services.document_extract import extract_text, UnsupportedFileError, MAX_FILE_BYTES, extension

router = APIRouter(prefix="/context", tags=["context"])


@router.get("/documents")
async def list_documents(company_id: str = Depends(require_company)):
    r = (
        supabase.table("context_documents")
        .select("id,filename,file_type,size_bytes,created_at")
        .eq("company_id", company_id)
        .order("created_at", desc=True)
        .execute()
    )
    return r.data or []


@router.post("/documents")
async def upload_document(file: UploadFile = File(...), company_id: str = Depends(require_company)):
    content = await file.read()
    if len(content) > MAX_FILE_BYTES:
        raise HTTPException(400, "Arquivo maior que 5MB — reduza o tamanho e tente de novo.")

    filename = file.filename or "arquivo"
    try:
        text = extract_text(filename, content)
    except UnsupportedFileError as e:
        raise HTTPException(400, str(e))

    r = supabase.table("context_documents").insert({
        "company_id": company_id,
        "filename": filename,
        "file_type": extension(filename),
        "content_text": text,
        "size_bytes": len(content),
    }).execute()
    return r.data[0] if r.data else {}


@router.delete("/documents/{document_id}")
async def delete_document(document_id: str, company_id: str = Depends(require_company)):
    supabase.table("context_documents").delete().eq("id", document_id).eq("company_id", company_id).execute()
    return {"ok": True}
