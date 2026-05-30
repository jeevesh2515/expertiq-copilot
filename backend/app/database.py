"""
SQLAlchemy database engine and session management.

Uses PostgreSQL. The session factory provides
request-scoped database sessions via FastAPI dependency injection.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import get_settings

import sys
settings = get_settings()

db_url = settings.DATABASE_URL
# During automated pytest sessions, we isolate testing on an in-memory SQLite database
# to prevent tests from wiping or dropping the active development PostgreSQL tables.
if "pytest" in sys.modules:
    db_url = "sqlite:///expertiq_test.db"

connect_args = {}
engine_kwargs = {
    "echo": False,
}

import os

# Set fallback database path (persistent local SQLite file)
fallback_db_path = "/app/data/expertiq.db" if os.path.exists("/app/data") else "./expertiq.db"
fallback_db_url = f"sqlite:///{fallback_db_path}"

use_fallback = False

# 1. Check if the database URL is missing or has defaults
if not db_url or "CHANGE_ME" in db_url:
    print("WARNING: DATABASE_URL has default/missing values. Using SQLite fallback.", file=sys.stderr)
    use_fallback = True

# 2. Check if we are running in a production container but pointing to localhost
elif "localhost" in db_url or "127.0.0.1" in db_url or "[::1]" in db_url:
    is_production_container = (
        os.environ.get("PORT") is not None or
        os.environ.get("RAILWAY_STATIC_URL") is not None or
        os.environ.get("RAILWAY_ENVIRONMENT") is not None or
        settings.APP_ENV == "production"
    )
    if is_production_container:
        print("WARNING: Production environment detected with a localhost DATABASE_URL. Forcing SQLite fallback.", file=sys.stderr)
        use_fallback = True

# 3. Test active connection if it's external PostgreSQL
if not use_fallback and not db_url.startswith("sqlite"):
    try:
        engine_kwargs["pool_size"] = 10
        engine_kwargs["max_overflow"] = 20
        engine_kwargs["pool_recycle"] = 3600
        engine_kwargs["pool_pre_ping"] = True
        
        test_engine = create_engine(db_url, **engine_kwargs)
        # Force a quick connection test
        with test_engine.connect() as conn:
            pass
        engine = test_engine
        print(f"✓ Connected to database successfully: {db_url.split('@')[-1] if '@' in db_url else db_url}")
    except Exception as e:
        print(
            f"WARNING: PostgreSQL connection failed ({e}). "
            f"Falling back to persistent SQLite database for production safety.",
            file=sys.stderr
        )
        use_fallback = True

# 4. Fallback implementation if PostgreSQL check failed
if use_fallback or db_url.startswith("sqlite"):
    db_url = fallback_db_url
    connect_args["check_same_thread"] = False
    # Use StaticPool to ensure database connections behave correctly in multi-threaded Uvicorn
    from sqlalchemy.pool import StaticPool
    engine = create_engine(
        db_url,
        connect_args=connect_args,
        poolclass=StaticPool,
        echo=False
    )
    print(f"✓ Database fallback active. Using persistent SQLite file: {db_url}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""
    pass


def get_db() -> Session:
    """
    FastAPI dependency that provides a database session.

    Yields a session and ensures it is closed after the request.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create all tables defined by ORM models."""
    # Import all models here to register them with Base
    import app.models
    Base.metadata.create_all(bind=engine)
