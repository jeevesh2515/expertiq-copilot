import json
import logging
from typing import Any, Optional
from cachetools import TTLCache
from app.config import get_settings

logger = logging.getLogger("expertiq.cache")
settings = get_settings()

class InMemoryCacheManager:
    """Fallback in-memory cache manager."""
    def __init__(self, ttl: int = 3600, maxsize: int = 1000):
        self._cache = TTLCache(maxsize=maxsize, ttl=ttl)
        logger.info("✓ Local In-Memory cache manager initialised.")

    def get(self, key: str) -> Optional[Any]:
        return self._cache.get(key)

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        self._cache[key] = value

class RedisCacheManager:
    """Redis-backed cache manager with json serialization."""
    def __init__(self, redis_url: str):
        import redis
        self._client = redis.Redis.from_url(redis_url, decode_responses=True)
        # Verify connection
        self._client.ping()
        logger.info("✓ Redis cache manager connected successfully.")

    def get(self, key: str) -> Optional[Any]:
        try:
            val = self._client.get(key)
            if val is not None:
                return json.loads(val)
        except Exception as e:
            logger.warning(f"Failed to read from Redis cache: {e}")
        return None

    def set(self, key: str, value: Any, ttl: Optional[int] = 3600) -> None:
        try:
            val_str = json.dumps(value)
            if ttl:
                self._client.setex(key, ttl, val_str)
            else:
                self._client.set(key, val_str)
        except Exception as e:
            logger.warning(f"Failed to write to Redis cache: {e}")

_cache_manager = None

def get_cache_manager():
    global _cache_manager
    if _cache_manager is not None:
        return _cache_manager

    if settings.ENABLE_REDIS_CACHE and settings.REDIS_URL:
        try:
            _cache_manager = RedisCacheManager(settings.REDIS_URL)
            return _cache_manager
        except Exception as e:
            logger.warning(f"⚠ Redis cache connection failed, falling back to local memory: {e}")

    _cache_manager = InMemoryCacheManager()
    return _cache_manager
