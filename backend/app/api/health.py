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
            "embedding_model": settings.EMBEDDING_MODEL,
        },
    }
