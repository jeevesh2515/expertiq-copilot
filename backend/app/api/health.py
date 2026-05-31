"""
Health check endpoint.

Provides liveness and readiness checks for monitoring
and container orchestration.
"""

from datetime import datetime, timezone
from typing import Dict

from fastapi import APIRouter

from app.config import get_settings

router = APIRouter(tags=["Health"])
settings = get_settings()


@router.get(
    "/api/health",
    summary="Health check",
    response_model=Dict[str, object],
)
async def health_check() -> Dict[str, object]:
    """
    Liveness and readiness health check.

    Returns service name, version, status, available features,
    and the current server timestamp.
    """
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "features": {
            "llm_available": settings.groq_available,
            "search_backend": settings.SEARCH_BACKEND,
            "embedding_model": settings.EMBEDDING_MODEL if settings.groq_available else None,
            "knowledge_graph_enabled": settings.ENABLE_KNOWLEDGE_GRAPH,
            "index_prewarm_enabled": settings.PREWARM_LIGHTWEIGHT_INDEX,
            "pinecone_configured": settings.pinecone_available,
        },
    }

@router.get(
    "/api/debug-db",
    summary="Secure database diagnostics check",
    response_model=Dict[str, object],
)
async def debug_db() -> Dict[str, object]:
    """
    Secure database diagnostics endpoint to inspect connectivity status
    and configuration settings on the backend container.
    """
    import os
    from sqlalchemy import text
    from app.database import SessionLocal, db_url

    # Redact password in DB URL for safety
    redacted_url = None
    if db_url:
        if "@" in db_url:
            parts = db_url.split("@")
            prefix = parts[0]
            if ":" in prefix:
                subparts = prefix.split(":")
                # Keep scheme, redact password
                redacted_url = f"{subparts[0]}:{subparts[1]}:REDACTED@{parts[1]}"
            else:
                redacted_url = f"REDACTED@{parts[1]}"
        else:
            redacted_url = db_url

    db_status = "unknown"
    error_msg = None
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db_status = "connected"
        db.close()
    except Exception as e:
        db_status = "error"
        error_msg = str(e)

    return {
        "db_url": redacted_url,
        "db_status": db_status,
        "error": error_msg,
        "app_env": os.environ.get("APP_ENV"),
        "settings_app_env": settings.APP_ENV,
        "database_url_env_present": "DATABASE_URL" in os.environ,
    }

