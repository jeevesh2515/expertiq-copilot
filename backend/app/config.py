"""
Application configuration loaded from environment variables.

Uses pydantic-settings for type-safe config with validation.
All secrets are read from .env — never hardcoded.
"""

from functools import lru_cache
from typing import List, Optional
import os
from dotenv import load_dotenv

# Load .env file from the workspace root (parent directory search is automatic)
# override=False ensures platform-injected env vars (Railway, etc.) take precedence
load_dotenv(override=False)

# Standardise LangSmith vs LangChain environment variables to ensure tracing works
if os.environ.get("LANGSMITH_TRACING") == "true":
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
if os.environ.get("LANGSMITH_API_KEY"):
    os.environ["LANGCHAIN_API_KEY"] = os.environ["LANGSMITH_API_KEY"]
if os.environ.get("LANGSMITH_ENDPOINT"):
    os.environ["LANGCHAIN_ENDPOINT"] = os.environ["LANGSMITH_ENDPOINT"]
if os.environ.get("LANGSMITH_PROJECT"):
    # Strip any potential surrounding quotes from the .env project value
    project_val = os.environ["LANGSMITH_PROJECT"].strip('\'"')
    os.environ["LANGCHAIN_PROJECT"] = project_val
    os.environ["LANGSMITH_PROJECT"] = project_val

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
        "extra": "ignore",
    }

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

    # ── Pinecone ──
    PINECONE_API_KEY: Optional[str] = None
    PINECONE_INDEX_NAME: str = "expertiq-experts"
    PINECONE_CLOUD: str = "aws"
    PINECONE_REGION: str = "us-east-1"
    PINECONE_NAMESPACE: str = ""

    # ── Search Runtime ──
    SEARCH_BACKEND: str = "lightweight"

    @property
    def pinecone_available(self) -> bool:
        """Check if Pinecone is properly configured."""
        return bool(
            self.PINECONE_API_KEY
            and self.PINECONE_API_KEY != "your_pinecone_api_key_here"
        )

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
    ENABLE_KNOWLEDGE_GRAPH: bool = True
    # Optional startup prewarm (loads all experts into in-memory index)
    PREWARM_LIGHTWEIGHT_INDEX: bool = False
    # Payload caps to avoid large response bodies
    GRAPH_MAX_RESPONSE_NODES: int = 32
    GRAPH_MAX_RESPONSE_EDGES: int = 64

    # ── Seed Users (set via env vars, never hardcode credentials) ──
    SEED_DEMO_EMAIL: Optional[str] = None
    SEED_DEMO_PASSWORD: Optional[str] = None
    SEED_DEMO_NAME: str = "Demo User"
    SEED_ADMIN_EMAIL: Optional[str] = None
    SEED_ADMIN_PASSWORD: Optional[str] = None
    SEED_ADMIN_NAME: str = "Admin User"

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



@lru_cache()
def get_settings() -> Settings:
    """Get cached application settings singleton."""
    return Settings()
