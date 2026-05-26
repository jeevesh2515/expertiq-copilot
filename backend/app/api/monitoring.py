"""
Monitoring and health check endpoints for production.

Exposes:
- /api/health - Basic health check
- /api/metrics/system - System performance metrics
- /api/metrics/search - Search pipeline metrics
- /metrics - Prometheus metrics endpoint
"""

import logging
from typing import Any, Dict

from fastapi import APIRouter, HTTPException, status
from app.core.monitoring import get_monitoring, SearchMetrics
from app.core.vector_store_pro import get_production_vector_store
from app.core.embeddings_pro import get_production_embedding_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Monitoring"])


@router.get(
    "/health",
    summary="Health check endpoint",
    responses={
        200: {"description": "System healthy"},
        503: {"description": "System unhealthy"},
    },
)
async def health_check() -> Dict[str, Any]:
    """
    Basic health check endpoint.
    
    Returns:
        Health status and component information
    """
    try:
        monitoring = get_monitoring()
        health = monitoring.get_health_status()

        return {
            "status": "healthy" if health["error_rate"] < 0.1 else "degraded",
            "timestamp": health["timestamp"],
            "version": "2.0.0",
            "components": {
                "api": "healthy",
                "vector_db": "healthy",
                "embedding_service": "healthy",
                "monitoring": "healthy",
            },
            "metrics": {
                "total_searches": health["total_searches"],
                "error_rate": round(health["error_rate"], 4),
                "avg_search_duration_ms": health["avg_search_duration_ms"],
            },
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Health check failed",
        )


@router.get(
    "/metrics/system",
    summary="System performance metrics",
    responses={200: {"description": "System metrics"}},
)
async def system_metrics() -> Dict[str, Any]:
    """
    Get system performance metrics.
    
    Returns:
        Performance summary and resource usage
    """
    try:
        monitoring = get_monitoring()
        embedding_service = get_production_embedding_service()
        vector_store = get_production_vector_store()

        return {
            "timestamp": monitoring.get_health_status()["timestamp"],
            "search_performance": monitoring.get_performance_summary(),
            "embedding_metrics": embedding_service.get_metrics(),
            "vector_store_metrics": vector_store.get_metrics(),
            "monitoring": {
                "active_searches": len([m for m in monitoring.recent_searches]),
                "recent_searches_sample": [
                    m.to_dict() for m in monitoring.recent_searches[-5:]
                ],
            },
        }
    except Exception as e:
        logger.error(f"System metrics endpoint failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve metrics",
        )


@router.get(
    "/metrics/search",
    summary="Search pipeline metrics",
    responses={200: {"description": "Search metrics"}},
)
async def search_metrics() -> Dict[str, Any]:
    """
    Get search pipeline performance metrics.
    
    Returns:
        Detailed search statistics
    """
    try:
        monitoring = get_monitoring()
        perf = monitoring.get_performance_summary()

        return {
            "timestamp": monitoring.get_health_status()["timestamp"],
            "performance": perf,
            "recent_searches": [
                m.to_dict() for m in monitoring.recent_searches[-20:]
            ],
            "summary": {
                "total_requests": perf.get("total_requests", 0),
                "cache_hit_rate": round(perf.get("cache_hit_rate", 0), 4),
                "error_rate": round(perf.get("error_rate", 0), 4),
                "avg_latency_ms": perf.get("avg_duration_ms", 0),
            },
        }
    except Exception as e:
        logger.error(f"Search metrics endpoint failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve search metrics",
        )


@router.get(
    "/metrics/prometheus",
    summary="Prometheus metrics endpoint",
    responses={200: {"description": "Prometheus formatted metrics"}},
)
async def prometheus_metrics() -> str:
    """
    Get metrics in Prometheus format.
    
    Returns:
        Prometheus-formatted metrics text
    """
    try:
        from prometheus_client import generate_latest, REGISTRY

        return generate_latest(REGISTRY).decode("utf-8")
    except Exception as e:
        logger.error(f"Prometheus metrics endpoint failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate Prometheus metrics",
        )
