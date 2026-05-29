"""
SQLAlchemy database engine and session management.

Uses PostgreSQL. The session factory provides
request-scoped database sessions via FastAPI dependency injection.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

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

if db_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False
else:
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20
    engine_kwargs["pool_recycle"] = 3600
    engine_kwargs["pool_pre_ping"] = True

engine = create_engine(
    db_url,
    connect_args=connect_args,
    **engine_kwargs
)


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
