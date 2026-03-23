"""SQLAlchemy engine and session factory (MySQL via PyMySQL driver)."""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

# pool_pre_ping avoids stale MySQL connections after idle timeouts
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    echo=settings.debug,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """FastAPI dependency: yields one request-scoped session, then closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
