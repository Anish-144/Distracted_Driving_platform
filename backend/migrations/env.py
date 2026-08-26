import asyncio
from logging.config import fileConfig

# pyrefly: ignore [missing-import]
from sqlalchemy import engine_from_config
# pyrefly: ignore [missing-import]
from sqlalchemy import pool

# pyrefly: ignore [missing-import]
from alembic import context

# Import our app configuration and metadata
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.config import settings
from app.database import Base

# Ensure all models are imported so Alembic can see them
from app.models import (  # noqa: F401 -- all imports required for Base.metadata discovery
    user, session, event, behavioral_log, scenario, lesson,
    behavioral_state, intervention_log, user_lesson,
    personality_profile, generated_scenario, cognitive_report
)

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# IMPORTANT: Alembic MUST use the synchronous DB URL (psycopg2).
# The asyncpg driver (DATABASE_URL) is incompatible with Alembic sync runner
# and causes "RuntimeError: no running event loop" on `alembic upgrade head`.
_migration_url = settings.SYNC_DATABASE_URL or settings.DATABASE_URL.replace(
    "postgresql+asyncpg://", "postgresql://"
)
config.set_main_option("sqlalchemy.url", _migration_url)


def run_migrations_offline() -> None:
    """Run migrations in offline mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(
        connection=connection, target_metadata=target_metadata, compare_type=True
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in online mode using a synchronous connection."""
    configuration = config.get_section(config.config_ini_section)
    configuration["sqlalchemy.url"] = _migration_url

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        do_run_migrations(connection)

    connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()