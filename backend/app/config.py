from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    anthropic_api_key: str
    supabase_url: str
    supabase_service_key: str
    supabase_storage_bucket: str = "meal-images"

    # CORS — set CORS_ORIGINS env var in production (comma-separated)
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:4173"]
    cors_origin_regex: str = r"http://192\.168\.\d+\.\d+:\d+"

    # Optional single production origin (e.g. https://myapp.vercel.app)
    cors_production_origin: str = ""

    # Comma-separated list of permitted emails; empty = allow all verified users
    allowed_emails: str = ""


settings = Settings()  # type: ignore[call-arg]
