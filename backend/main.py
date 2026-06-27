from typing import List
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api import webhooks, conversations, quotes, settings as settings_router, reports, post_sale, assistant

# redirect_slashes=False evita que o FastAPI faça 307 para trailing slash,
# o que quebraria o preflight CORS
app = FastAPI(title="Brota API", version="1.0.0", redirect_slashes=False)

# Garante que tanto http:// quanto https:// do frontend sejam aceitos,
# independente de como FRONTEND_URL foi configurada no Render
def _cors_origins(raw: str) -> List[str]:
    origins = {"http://localhost:5173", "https://localhost:5173"}
    for url in raw.split(","):
        url = url.strip().rstrip("/")
        if url:
            origins.add(url)
            # adiciona a variante oposta de protocolo
            if url.startswith("https://"):
                origins.add("http://" + url[8:])
            elif url.startswith("http://"):
                origins.add("https://" + url[7:])
    return list(origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(settings.frontend_url),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(webhooks.router, prefix="/webhook", tags=["webhook"])
app.include_router(conversations.router)
app.include_router(quotes.router)
app.include_router(settings_router.router)
app.include_router(reports.router)
app.include_router(post_sale.router)
app.include_router(assistant.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
