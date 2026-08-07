from typing import List
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.logging_config import setup_logging

setup_logging()

if settings.sentry_dsn:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.logging import LoggingIntegration
    from sentry_sdk.integrations.starlette import StarletteIntegration

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.environment,
        integrations=[
            StarletteIntegration(),
            FastApiIntegration(),
            # logger.error/.exception já usados no código viram eventos no Sentry
            LoggingIntegration(level=None, event_level="ERROR"),
        ],
        traces_sample_rate=0.1,
        send_default_pii=False,
    )

from app.api import webhooks, conversations, quotes, settings as settings_router, reports, post_sale, assistant, team, billing, approvals, dashboard, context
from app.services.scheduler import start_scheduler, stop_scheduler

# redirect_slashes=False evita que o FastAPI faça 307 para trailing slash,
# o que quebraria o preflight CORS
app = FastAPI(title="Brota API", version="1.0.0", redirect_slashes=False)

app.add_event_handler("startup", start_scheduler)
app.add_event_handler("shutdown", stop_scheduler)

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
app.include_router(team.router)
app.include_router(billing.router)
app.include_router(approvals.router)
app.include_router(dashboard.router)
app.include_router(context.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
