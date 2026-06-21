from supabase import create_client, Client
from app.config import settings

# cliente com service_role — usa no backend para operações privilegiadas
supabase: Client = create_client(settings.supabase_url, settings.supabase_service_key)
