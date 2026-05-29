"""
Production monitoring and observability module.

Tracks:
- API performance metrics
- Cache hit rates
- LLM token usage
- Search pipeline performance
- System health
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, Optional
from prometheus_client import Counter, Histogram, Gauge, CollectorRegistry

logger = logging.getLogger(__name__)


@dataclass
class SearchMetrics:
    """Metrics for a single search operation."""
    query: str
    duration_ms: float
    results_count: int
    used_cache: bool
    llm_ranking_applied: bool
    error: bool = False
    error_message: str = ""
    timestamp: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "query": self.query[:50],
            "duration_ms": round(self.duration_ms, 2),
            "results_count": self.results_count,
            "used_cache": self.used_cache,
            "llm_ranking": self.llm_ranking_applied,
            "error": self.error,
            "timestamp": self.timestamp.isoformat(),
        }


class ProductionMonitoring:
    """Production monitoring and metrics collection."""

    def __init__(self) -> None:
        """Initialize monitoring with Prometheus metrics."""
        self.registry = CollectorRegistry()

        # Counters
        self.search_total = Counter(
            "expertiq_search_total",
            "Total search requests",
            registry=self.registry,
        )
        self.search_errors = Counter(
            "expertiq_search_errors_total",
            "Total search errors",
            registry=self.registry,
        )
        self.cache_hits = Counter(
            "expertiq_cache_hits_total",
            "Total cache hits",
            registry=self.registry,
        )
        self.llm_requests = Counter(
            "expertiq_llm_requests_total",
            "Total LLM requests",
            registry=self.registry,
        )

        # Histograms
        self.search_duration = Histogram(
            "expertiq_search_duration_seconds",
            "Search request duration",
            buckets=(0.1, 0.25, 0.5, 1, 2, 5),
            registry=self.registry,
        )
        self.embedding_generation_time = Histogram(
            "expertiq_embedding_generation_seconds",
            "Embedding generation time",
            buckets=(0.01, 0.05, 0.1, 0.25, 0.5),
            registry=self.registry,
        )

        # Gauges
        self.active_searches = Gauge(
            "expertiq_active_searches",
            "Active search operations",
            registry=self.registry,
        )
        self.cache_size = Gauge(
            "expertiq_cache_size_bytes",
            "Current cache size",
            registry=self.registry,
        )
        self.vector_db_size = Gauge(
            "expertiq_vector_db_size_bytes",
            "Vector database size",
            registry=self.registry,
        )

        # Metrics history
        self.recent_searches: list[SearchMetrics] = []
        self.max_history = 1000

        logger.info("✓ Production monitoring initialized")

    def record_search(self, metrics: SearchMetrics) -> None:
        """Record search metrics."""
        self.search_total.inc()

        if metrics.error:
            self.search_errors.inc()
        else:
            self.search_duration.observe(metrics.duration_ms / 1000)

        if metrics.used_cache:
            self.cache_hits.inc()

        if metrics.llm_ranking_applied:
            self.llm_requests.inc()

        # Add to history
        self.recent_searches.append(metrics)
        if len(self.recent_searches) > self.max_history:
            self.recent_searches.pop(0)

        logger.debug(f"Search recorded: {metrics.query[:30]}... ({metrics.duration_ms}ms)")

    def get_health_status(self) -> Dict[str, Any]:
        """Get current system health status."""
        total_searches = sum(
            1 for _ in self.recent_searches
        )
        total_errors = sum(
            1 for m in self.recent_searches if m.error
        )
        avg_duration = (
            sum(m.duration_ms for m in self.recent_searches) / len(self.recent_searches)
            if self.recent_searches
            else 0
        )

        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "total_searches": total_searches,
            "total_errors": total_errors,
            "error_rate": total_errors / max(total_searches, 1),
            "avg_search_duration_ms": round(avg_duration, 2),
            "recent_searches_sample": [
                m.to_dict() for m in self.recent_searches[-10:]
            ],
        }

    def get_performance_summary(self) -> Dict[str, Any]:
        """Get performance summary."""
        if not self.recent_searches:
            return {"status": "no_data"}

        durations = [m.duration_ms for m in self.recent_searches]
        errors = [m for m in self.recent_searches if m.error]
        cache_hits = [m for m in self.recent_searches if m.used_cache]

        return {
            "total_requests": len(self.recent_searches),
            "avg_duration_ms": round(sum(durations) / len(durations), 2),
            "min_duration_ms": round(min(durations), 2),
            "max_duration_ms": round(max(durations), 2),
            "error_count": len(errors),
            "error_rate": len(errors) / len(self.recent_searches),
            "cache_hit_rate": len(cache_hits) / len(self.recent_searches),
            "llm_ranking_applied_count": sum(
                1 for m in self.recent_searches if m.llm_ranking_applied
            ),
        }


# Global monitoring instance
_monitoring: Optional[ProductionMonitoring] = None


def get_monitoring() -> ProductionMonitoring:
    """Get singleton monitoring instance."""
    global _monitoring
    if _monitoring is None:
        _monitoring = ProductionMonitoring()
    return _monitoring
