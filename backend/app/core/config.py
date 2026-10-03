"""Application settings, read from environment variables (prefix ZOODEX_) or a .env file."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="ZOODEX_", env_file=".env", extra="ignore")

    app_name: str = "Zoodex API"
    version: str = "0.1.0"
    environment: str = "development"
    # Comma-separated list of allowed CORS origins ("*" in development).
    cors_origins: str = "*"
    # Max upload size for /identify crops (bytes). Crops should be ~50 KB.
    max_upload_bytes: int = 2 * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()
