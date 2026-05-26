"""
Production configuration for ExpertIQ Copilot.

Environment-specific settings for production deployment:
- Memory optimization
- Caching strategies
- LLM settings
- Monitoring
"""

from typing import Optional
from pydantic_settings import BaseSettings


class ProductionSettings(BaseSettings):
    """Production-specific settings."""

    # ── Environment ──
    ENVIRONMENT: str = "production"
    DEBUG: bool = False

    # ── Performance ──
    EMBEDDING_BATCH_SIZE: int = 128  # Optimize for throughput
    QUERY_CACHE_SIZE: int = 10000
    QUERY_CACHE_TTL_SECONDS: int = 3600
    RESULT_CACHE_SIZE: int = 50000
    RESULT_CACHE_TTL_SECONDS: int = 1800

    # ── LLM & Semantic Search ──
    ENABLE_LLM_RANKING: bool = True
    LLM_TEMPERATURE: float = 0.2  # Lower for consistency
    LLM_MAX_TOKENS: int = 500
    LLM_RETRY_ATTEMPTS: int = 3
    LLM_RETRY_WAIT_SECONDS: int = 2

    # ── Vector DB ──
    VECTOR_DB_PERSIST: bool = True
    SEMANTIC_SEARCH_THRESHOLD: float = 0.3
    TOP_K_RESULTS: int = 20

    # ── Rate Limiting ──
    RATE_LIMIT_PER_MINUTE: int = 100  # Increased for production
    RATE_LIMIT_BURST: int = 200

    # ── Database Connection ──
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 40
    DB_POOL_RECYCLE: int = 3600

    # ── Monitoring ──
    ENABLE_PROMETHEUS_METRICS: bool = True
    METRICS_PORT: int = 8001
    HEALTH_CHECK_INTERVAL_SECONDS: int = 60

    # ── Logging ──
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"

    # ── CORS ──
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_MAX_AGE: int = 600

    class Config:
        env_file = ".env.production"
        case_sensitive = True


def get_production_settings() -> ProductionSettings:
    """Get production settings."""
    return ProductionSettings()
