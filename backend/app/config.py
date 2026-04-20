"""
Application configuration loaded from environment variables.

Uses pydantic-settings for type-safe config with validation.
All secrets are read from .env — never hardcoded.
"""

from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # ── App ──
    APP_ENV: str = "development"
    LOG_LEVEL: str = "INFO"
    APP_NAME: str = "ExpertIQ Copilot"
    APP_VERSION: str = "1.0.0"

    # ── Groq LLM ──
    GROQ_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "llama-3.1-70b-versatile"

    # ── JWT Auth ──
    JWT_SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION_use_openssl_rand_hex_32"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Database ──
    DATABASE_URL: str = "sqlite:///./expertiq.db"

    # ── ChromaDB ──
    CHROMA_PERSIST_DIR: str = "./chroma_db"

    # ── Frontend ──
    FRONTEND_URL: str = "http://localhost:3000"

    # ── Rate Limiting ──
    RATE_LIMIT_PER_MINUTE: int = 10

    # ── Embedding Model ──
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"

    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.APP_ENV == "production"

    @property
    def groq_available(self) -> bool:
        """Check if Groq API key is configured."""
        return bool(self.GROQ_API_KEY and self.GROQ_API_KEY != "your_groq_api_key_here")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached application settings singleton."""
    return Settings()
