from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str
    supabase_service_key: str
    supabase_jwt_secret: str
    openai_api_key: str
    # Meta Cloud API — opcionais até a configuração do WhatsApp ser concluída
    meta_app_id: str = ""
    meta_app_secret: str = ""
    meta_config_id: str = ""
    meta_system_user_token: str = ""
    webhook_verify_token: str = ""
    graph_api_version: str = "v21.0"
    frontend_url: str = "http://localhost:5173"
    backend_url: str = "http://localhost:8000"
    # Stripe — assinatura única de R$127/mês
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_id: str = ""


settings = Settings()
