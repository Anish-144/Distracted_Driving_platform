"""
Database engine and session factory (async SQLAlchemy).
"""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

# Async engine configuration
is_sqlite = settings.DATABASE_URL.startswith("sqlite")
engine_args = {
    "echo": settings.DEBUG,
}

if is_sqlite:
    # SQLite-specific args
    engine_args["connect_args"] = {"check_same_thread": False}
else:
    # PostgreSQL-specific args (QueuePool)
    engine_args.update({
        "pool_pre_ping": True,
        "pool_size": 5,
        "max_overflow": 10,
    })

engine = create_async_engine(settings.DATABASE_URL, **engine_args)

# Async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


async def get_db() -> AsyncSession:
    """
    FastAPI dependency: yield an async DB session, ensure it's closed after use.
    Usage in route:
        async def route(db: AsyncSession = Depends(get_db)):
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Create all tables (called on app startup)."""
    async with engine.begin() as conn:
        from app.models import user, session, event, behavioral_log, scenario  # noqa: F401
        await conn.run_sync(Base.metadata.create_all)
