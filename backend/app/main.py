"""
FastAPI application entry point.

Configures CORS, route registration, and startup tasks
(DB init, expert seeding).
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

from app.api.experts import router as experts_router
from app.api.health import router as health_router
from app.api.interactions import router as interaction_router
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


# ── Application Lifespan ──
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application startup: init DB and seed expert profiles."""
    logger.info("═" * 60)
    logger.info("ExpertIQ Copilot starting up...")
    logger.info("═" * 60)

    init_db()
    logger.info("✓ Database tables initialised.")

    db = SessionLocal()
    try:
        expert_count = db.query(Expert).count()
        if expert_count == 0:
            from app.data.seed_experts import seed_experts
            count = seed_experts(db)
            logger.info(f"✓ Seeded {count} expert profiles.")
        else:
            logger.info(f"✓ Found {expert_count} existing experts.")
    finally:
        db.close()

    logger.info("═" * 60)
    logger.info("ExpertIQ Copilot ready! 🚀")
    logger.info("═" * 60)

    yield

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
app.include_router(experts_router)
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
