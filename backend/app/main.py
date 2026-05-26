"""
FastAPI application entry point.

Configures CORS, security headers, rate limiting, structured logging,
route registration, and startup tasks (DB init, expert seeding,
lightweight search indexing, knowledge graph building).
"""

import logging
import sys
import time
import uuid
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.api.experts import router as experts_router
from app.api.health import router as health_router
from app.api.interactions import router as interaction_router
from app.api.search import router as search_router
from app.auth.routes import router as auth_router
from app.config import get_settings
from app.database import SessionLocal, init_db
from app.models.expert import Expert

settings = get_settings()

# ── Logging Configuration ──
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL, logging.INFO),
    format='{"time":"%(asctime)s","level":"%(levelname)s","logger":"%(name)s","message":"%(message)s"}',
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("expertiq")

# ── Rate Limiter ──
limiter = Limiter(key_func=get_remote_address)


# ── Application Lifespan ──
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application startup and shutdown lifecycle.

    On startup:
    1. Initialise database tables
    2. Seed expert profiles if empty
    3. Build lightweight local search index
    4. Build knowledge graph
    """
    logger.info("═" * 60)
    logger.info("ExpertIQ Copilot starting up...")
    logger.info("═" * 60)

    # 1. Init database
    init_db()
    logger.info("✓ Database tables initialised.")

    # 2. Seed experts
    db = SessionLocal()
    try:
        expert_count = db.query(Expert).count()
        if expert_count == 0:
            from app.data.seed_experts import seed_experts
            count = seed_experts(db)
            logger.info(f"✓ Seeded {count} expert profiles.")
        else:
            logger.info(f"✓ Found {expert_count} existing experts.")

        # 3. Prewarm search index
        if settings.PREWARM_LIGHTWEIGHT_INDEX:
            try:
                from app.core.lightweight_search import get_lightweight_search_engine

                experts = db.query(Expert).all()
                search_engine = get_lightweight_search_engine()
                search_engine.refresh([expert.to_dict() for expert in experts])
                logger.info("✓ Lightweight search index prewarmed.")
            except Exception as e:
                logger.warning(f"⚠ Lightweight search index prewarm deferred: {e}")
        else:
            logger.info("✓ Search index lazy-loaded on first search.")

        # 4. Build knowledge graph (optional in low-memory local mode)
        if settings.ENABLE_KNOWLEDGE_GRAPH:
            try:
                from app.core.knowledge_graph import get_knowledge_graph
                kg = get_knowledge_graph()
                if experts is None:
                    experts = db.query(Expert).all()
                expert_dicts = [e.to_dict() for e in experts]
                kg.build_from_experts(expert_dicts)
                stats = kg.get_stats()
                logger.info(f"✓ Knowledge graph built: {stats}")
            except Exception as e:
                logger.warning(f"⚠ Knowledge graph build deferred: {e}")
        else:
            logger.info("✓ Knowledge graph disabled for low-memory local mode.")

    finally:
        db.close()

    logger.info("═" * 60)
    logger.info("ExpertIQ Copilot ready! 🚀")
    logger.info(f"  LLM available: {settings.groq_available}")
    logger.info(f"  Environment: {settings.APP_ENV}")
    logger.info("═" * 60)

    yield  # Application runs here

    logger.info("ExpertIQ Copilot shutting down...")


# ── FastAPI App ──
app = FastAPI(
    title="ExpertIQ Copilot API",
    description=(
        "Expert Discovery and Research Intelligence Platform. "
        "AI-powered expert matching using semantic search, knowledge graphs, "
        "and LLM agent re-ranking."
    ),
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── Rate Limiting ──
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# ── Security Headers Middleware ──
@app.middleware("http")
async def add_security_headers(request: Request, call_next) -> Response:
    """Add security headers to every response."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "img-src 'self' data: https:; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; "
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
        "font-src 'self' https://fonts.gstatic.com;"
    )
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = (
        "camera=(), microphone=(), geolocation=(), interest-cohort=()"
    )
    return response


# ── Request ID Middleware ──
@app.middleware("http")
async def add_request_id(request: Request, call_next) -> Response:
    """Attach a unique request ID for structured logging."""
    request_id = str(uuid.uuid4())[:8]
    request.state.request_id = request_id
    start = time.time()

    response = await call_next(request)

    duration_ms = round((time.time() - start) * 1000, 2)
    response.headers["X-Request-ID"] = request_id
    logger.info(
        f"request_id={request_id} method={request.method} "
        f"path={request.url.path} status={response.status_code} "
        f"duration_ms={duration_ms}"
    )
    return response


# ── Global Exception Handler ──
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch unhandled exceptions — never expose stack traces to clients."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "detail": "An unexpected error occurred. Please try again.",
        },
    )


# ── Register Routers ──
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(experts_router)
app.include_router(search_router)
app.include_router(interaction_router)


# ── Root Endpoint ──
@app.get("/", tags=["Root"])
async def root() -> dict:
    """Root endpoint with API information."""
    return {
        "service": "ExpertIQ Copilot API",
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/api/health",
    }
