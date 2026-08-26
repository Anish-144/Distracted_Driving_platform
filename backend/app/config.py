"""
Application configuration using Pydantic Settings.
Loads from .env file automatically.
"""

# pyrefly: ignore [missing-import]
from pydantic_settings import BaseSettings
from pydantic import model_validator
from functools import lru_cache
from typing import Any


_KNOWN_BAD_SECRETS = {
    "change-this-secret-key-in-production",
    "your-super-secret-jwt-key-change-in-production-please",
    "local-dev-jwt-secret-do-not-use-in-prod",
}


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Distracted Driving Platform API"
    APP_VERSION: str = "1.0.0"
    # ⚠️  DEBUG defaults to False — never set True in production
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./distracted_driving.db"
    SYNC_DATABASE_URL: str = "sqlite:///./distracted_driving.db"

    # JWT
    JWT_SECRET_KEY: str = "change-this-secret-key-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60  # 1 hour (was 24h — reduced for security)

    # CORS — restrict to your actual frontend origin in production
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # ── LLM Providers (set at least one) ────────────────────────────────────
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    DEEPSEEK_API_KEY: str = ""

    # ── ElevenLabs TTS ───────────────────────────────────────────────────────
    ELEVENLABS_API_KEY: str = ""
    # Voice IDs — leave empty to use defaults
    ELEVENLABS_PASSENGER_VOICE_ID: str = "EXAVITQu4vr4xnSDxMaL"  # Bella
    ELEVENLABS_INSTRUCTOR_VOICE_ID: str = "onwK4e9ZLuTAKqWW03F9"  # Daniel
    ELEVENLABS_AUTHORITY_VOICE_ID: str = "pNInz6obpgDQGcFmaJgB"   # Adam

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    @model_validator(mode="after")
    def validate_secret_key(self) -> "Settings":
        """Refuse to start in production with a weak or placeholder JWT secret."""
        if not self.DEBUG:
            if self.JWT_SECRET_KEY in _KNOWN_BAD_SECRETS:
                raise ValueError(
                    "JWT_SECRET_KEY is set to a known-insecure placeholder. "
                    "Generate a strong key: python -c \"import secrets; print(secrets.token_hex(32))\""
                )
            if "REPLACE_WITH" in self.JWT_SECRET_KEY:
                raise ValueError(
                    "JWT_SECRET_KEY still contains placeholder text. Set a real secret."
                )
            if len(self.JWT_SECRET_KEY) < 32:
                raise ValueError(
                    f"JWT_SECRET_KEY is too short ({len(self.JWT_SECRET_KEY)} chars). "
                    "Minimum 32 characters required."
                )
        return self

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
