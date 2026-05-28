"""
Application configuration loaded from environment variables.

Uses pydantic-settings for type-safe config with validation.
All secrets are read from .env — never hardcoded.
"""

from functools import lru_cache
from typing import List, Optional

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
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    ENABLE_REMOTE_LLM: bool = True

    # Model fallback chain — if primary model is decommissioned, try next
    GROQ_MODEL_FALLBACKS: List[str] = [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
    ]

    # ── JWT Auth ──
    JWT_SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION_use_openssl_rand_hex_32"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Database ──
    DATABASE_URL: str = "postgresql://postgres:CHANGE_ME@localhost:5432/expertiq"
    REDIS_URL: str = "redis://localhost:6379"
    ENABLE_REDIS_CACHE: bool = True

    # ── ChromaDB ──
    CHROMA_PERSIST_DIR: str = "./chroma_db"

    # ── Search Runtime ──
    SEARCH_BACKEND: str = "lightweight"

    # ── Frontend ──
    FRONTEND_URL: str = "http://localhost:3000"

    # ── Rate Limiting ──
    RATE_LIMIT_PER_MINUTE: int = 10

    # ── Embedding Model (fastembed ONNX — lightweight, no PyTorch) ──
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"

    # ── Memory / Performance ──
    # Max topic cross-link edges per industry (prevents edge explosion)
    MAX_TOPIC_CROSS_LINKS: int = 50
    # Max experts for graph operations
    GRAPH_MAX_TRAVERSAL_RESULTS: int = 20
    # Graph feature toggle for local low-memory demos
    ENABLE_KNOWLEDGE_GRAPH: bool = False
    # Optional startup prewarm (loads all experts into in-memory index)
    PREWARM_LIGHTWEIGHT_INDEX: bool = False
    # Payload caps to avoid large response bodies
    GRAPH_MAX_RESPONSE_NODES: int = 32
    GRAPH_MAX_RESPONSE_EDGES: int = 64

    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.APP_ENV == "production"

    @property
    def groq_available(self) -> bool:
        """Check if Groq API key is configured."""
        return bool(
            self.ENABLE_REMOTE_LLM
            and self.GROQ_API_KEY
            and self.GROQ_API_KEY != "your_groq_api_key_here"
        )

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"



@lru_cache()
def get_settings() -> Settings:
    """Get cached application settings singleton."""
    return Settings()
