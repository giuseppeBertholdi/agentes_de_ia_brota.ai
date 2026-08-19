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
    # Teto de respostas de IA por empresa/mês — protege a margem do plano único
    # contra picos de custo de OpenAI. Passado o limite, o bot avisa e para de
    # responder automaticamente até o próximo mês (ou upgrade manual do dono).
    ai_monthly_message_limit: int = 2000
    # Observabilidade — Sentry fica inativo se sentry_dsn não for configurado
    sentry_dsn: str = ""
    sentry_traces_sample_rate: float = 0.1
    environment: str = "development"
    log_level: str = "INFO"
    # Redis opcional — só ativa lock distribuído do buffer de mensagens (ver
    # distributed_lock.py) se configurado; sem ele, comportamento em memória atual
    redis_url: str = ""
    # Retenção de dados (LGPD) — dias até o conteúdo de mensagens de clientes
    # finais ser anonimizado (a linha continua existindo, só o texto é trocado)
    message_retention_days: int = 90


settings = Settings()
