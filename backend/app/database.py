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
# During automated pytest sessions, if the default CHANGE_ME template is active,
# we fall back to standard local passwordless credentials to run tests securely.
if "pytest" in sys.modules and db_url == "postgresql://postgres:CHANGE_ME@localhost:5432/expertiq":
    db_url = "postgresql://postgres@localhost:5432/expertiq"

engine = create_engine(
    db_url,
    pool_size=10,
    max_overflow=20,
    pool_recycle=3600,
    echo=False,
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
