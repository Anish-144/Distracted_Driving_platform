"""
Application configuration using Pydantic Settings.
Loads from .env file automatically.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Distracted Driving Platform API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/distracted_driving_db"
    SYNC_DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/distracted_driving_db"

    # JWT
    JWT_SECRET_KEY: str = "change-this-secret-key-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "ignore",   # Ignore POSTGRES_* and other Docker-only vars
    }


@lru_cache()
def get_settings() -> Settings:
    """Return cached Settings instance."""
    return Settings()


settings = get_settings()
