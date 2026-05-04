from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # LLM (local Ollama)
    ollama_base_url: str = "http://host.docker.internal:11434"
    ollama_model: str = "qwen2.5:32b"
    ollama_model_fast: str = "qwen2.5:7b"
    ollama_embed_model: str = "mxbai-embed-large"

    # Travel APIs
    duffel_api_key: str = ""
    liteapi_api_key: str = ""
    google_places_api_key: str = ""
    openweather_api_key: str = ""

    # Google OAuth
    google_oauth_client_id: str = ""
    google_oauth_client_secret: str = ""
    google_oauth_redirect_uri: str = "http://localhost/api/auth/google/callback"

    # Infra
    postgres_url: str = "postgresql+asyncpg://travel:travel@postgres:5432/travel"
    redis_url: str = "redis://redis:6379/0"

    # App
    session_secret: str = ""
    app_base_url: str = "http://localhost"
    frontend_base_url: str = "http://localhost"


@lru_cache
def get_settings() -> Settings:
    return Settings()
