import sys
import logging
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.config import get_settings

logger = logging.getLogger("expertiq.limiter")
settings = get_settings()

storage_uri = "memory://"
if settings.REDIS_URL:
    try:
        import redis
        # Quick connect check
        r = redis.Redis.from_url(settings.REDIS_URL, socket_connect_timeout=1)
        r.ping()
        storage_uri = settings.REDIS_URL
        logger.info("✓ Redis connected successfully for rate limiting.")
    except Exception as e:
        logger.warning(f"⚠ Redis unavailable for rate limiting, falling back to in-memory: {e}")

# Disable rate limiting during automated unit tests
enabled = "pytest" not in sys.modules
limiter = Limiter(key_func=get_remote_address, storage_uri=storage_uri, enabled=enabled)
