from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api import webhooks, conversations, quotes, settings as settings_router, reports, post_sale

app = FastAPI(title="Brota API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:5173"],
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


@app.get("/health")
async def health():
    return {"status": "ok"}
