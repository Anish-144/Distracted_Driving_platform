"""
FastAPI main application entry point.
Includes all routers, CORS middleware, security headers, and startup hooks.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

import logging
from app.config import settings
from app.database import Base
from app.routes import auth, user, sessions, events, lessons, progress, ai, feedback
from app.routes import onboarding, scenarios, cognitive_reports, settings as settings_router, admin, admin_users
from app.routes import voice
from app.models import user as _user_model  # noqa: F401
from app.models import lesson as _lesson_model  # noqa: F401
from app.models import user_lesson as _user_lesson_model  # noqa: F401
from app.models import personality_profile as _personality_profile_model  # noqa: F401
from app.models import generated_scenario as _generated_scenario_model  # noqa: F401
from app.models import cognitive_report as _cognitive_report_model  # noqa: F401
from app.models import behavioral_state as _behavioral_state_model  # noqa: F401
from app.models import calibration_event as _calibration_event_model  # noqa: F401
from app.models import intervention_log as _intervention_log_model  # noqa: F401

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)


# ─── Security Headers Middleware ──────────────────────────────────────────────

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adds security headers to every HTTP response."""

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
        )
        csp_parts = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: blob:",
            "media-src 'self' blob:",
            "connect-src 'self'",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
        ]
        response.headers["Content-Security-Policy"] = "; ".join(csp_parts)
        if not settings.DEBUG:
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )
        response.headers.pop("server", None)
        return response


# ─── Lifespan ────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run startup and shutdown logic."""
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")

    _bad_secrets = {
        "change-this-secret-key-in-production",
        "your-super-secret-jwt-key-change-in-production-please",
    }
    if not settings.DEBUG:
        if settings.JWT_SECRET_KEY in _bad_secrets or "REPLACE_WITH" in settings.JWT_SECRET_KEY:
            logger.critical("CRITICAL: Insecure JWT_SECRET_KEY in production! Halting.")
            import sys; sys.exit(1)
        if len(settings.JWT_SECRET_KEY) < 32:
            logger.critical("CRITICAL: JWT_SECRET_KEY too short (< 32 chars). Halting.")
            import sys; sys.exit(1)

    if settings.DEBUG:
        logger.warning("DEBUG=True — stack traces exposed. NEVER use in production.")

    if not settings.GEMINI_API_KEY and not settings.OPENAI_API_KEY and not settings.DEEPSEEK_API_KEY:
        logger.warning("No LLM API keys provided. AI coaching will use hardcoded fallback pools only.")
    if not settings.ELEVENLABS_API_KEY:
        logger.warning("No ElevenLabs API key provided. AI voice synthesis will be disabled.")

    logger.info("Startup checks complete.")

    from app.database import engine
    from app.database import Base

    def check_schema_drift(connection):
        from alembic.autogenerate import compare_metadata
        from alembic.runtime.migration import MigrationContext
        context = MigrationContext.configure(connection)
        diff = compare_metadata(context, Base.metadata)
        if diff:
            import sys
            logger.critical(f"CRITICAL: Schema drift detected! Diffs: {diff}")
            sys.exit(1)

    try:
        async with engine.begin() as conn:
            await conn.run_sync(check_schema_drift)
        logger.info("Schema validation passed.")
    except SystemExit:
        raise
    except Exception as e:
        logger.warning(f"Schema validation could not be completed: {e}")

    from app.database import AsyncSessionLocal
    from app.models.user import User
    from app.models.lesson import Lesson, LessonTag
    from app.models.scenario import Scenario, SEED_SCENARIOS
    from app.services import auth_service
    # pyrefly: ignore [missing-import]
    from sqlalchemy import select

    async with AsyncSessionLocal() as session:
        try:
            scenarios_result = await session.execute(select(Scenario))
            if not scenarios_result.scalars().first():
                logger.info("Seeding default scenarios...")
                session.add_all([
                    Scenario(
                        id=s["id"], name=s["name"], description=s["description"],
                        distraction_type=s["distraction_type"], difficulty_level=s["difficulty_level"],
                        is_active=s["is_active"], instruction_text=s["instruction_text"]
                    )
                    for s in SEED_SCENARIOS
                ])
                await session.commit()
                logger.info("Scenarios seeded.")

            # Test user only in dev — NEVER in production
            if settings.DEBUG:
                email = "test@example.com"
                user_result = await session.execute(select(User).where(User.email == email))
                if not user_result.scalar_one_or_none():
                    logger.info(f"[DEV] Creating test user: {email}")
                    new_user = User(
                        name="Test Driver", email=email,
                        hashed_password=auth_service.hash_password("password123")
                    )
                    session.add(new_user)
                    await session.commit()
                    logger.info("[DEV] Test user created.")

            lessons_result = await session.execute(select(Lesson))
            if not lessons_result.scalars().first():
                logger.info("Seeding default lessons...")
                session.add_all([
                    Lesson(title="Impulse Control While Driving", description="Learn how to delay your reaction to sudden notifications.", difficulty="Intermediate", tag=LessonTag.IMPULSIVE),
                    Lesson(title="Managing Digital Distractions", description="Step-by-step guide to using your phone's 'Do Not Disturb' effectively.", difficulty="Beginner", tag=LessonTag.DISTRACTED),
                    Lesson(title="Peripheral Vision Mastery", description="Maintain focus while keeping an eye on your surroundings.", difficulty="Advanced", tag=LessonTag.SAFE),
                    Lesson(title="The 2-Second Rule", description="General defensive driving distance rules.", difficulty="Beginner", tag=LessonTag.GENERAL),
                ])
                await session.commit()
                logger.info("Lessons seeded.")
        except Exception as e:
            logger.error(f"Error during seeding: {e}")
            await session.rollback()

    yield
    logger.info("Shutting down...")


# ─── App Instance ─────────────────────────────────────────────────────────────

_docs_url    = "/docs"         if settings.DEBUG else None
_redoc_url   = "/redoc"        if settings.DEBUG else None
_openapi_url = "/openapi.json" if settings.DEBUG else None

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    description="AI-Powered Distracted Driving Platform API",
    docs_url=_docs_url,
    redoc_url=_redoc_url,
    openapi_url=_openapi_url,
)


# ─── Middleware ───────────────────────────────────────────────────────────────

app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
)


# ─── Routers ──────────────────────────────────────────────────────────────────

app.include_router(auth.router)
app.include_router(user.router)
app.include_router(sessions.router)
app.include_router(events.router)
app.include_router(lessons.router)
app.include_router(progress.router)
app.include_router(ai.router)
app.include_router(feedback.router)
app.include_router(onboarding.router)
app.include_router(scenarios.router)
app.include_router(cognitive_reports.router)
app.include_router(admin.router)
app.include_router(admin_users.router)
app.include_router(settings_router.router, prefix="/api/settings", tags=["Settings"])
app.include_router(voice.router)


# ─── Health Check ─────────────────────────────────────────────────────────────

@app.get("/health", tags=["Health"])
async def health_check():
    """Basic health check."""
    return {"status": "ok", "version": settings.APP_VERSION, "app": settings.APP_NAME}


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint."""
    return {
        "message": "Distracted Driving Platform API",
        "docs": "/docs" if settings.DEBUG else "disabled in production",
    }