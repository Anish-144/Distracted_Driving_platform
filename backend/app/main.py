"""
FastAPI main application entry point.
Includes all routers, CORS middleware, and startup hooks.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import logging
from app.config import settings
from app.database import Base
from app.routes import auth, user, sessions, events, lessons, progress, ai, feedback
from app.routes import onboarding, scenarios, cognitive_reports, settings as settings_router, admin, admin_users  # new: personality + AI scenario routes
from app.routes import voice  # ElevenLabs voice narration routes
# Ensure all models are imported so Base.metadata.create_all picks them up
from app.models import user as _user_model  # noqa: F401
from app.models import lesson as _lesson_model  # noqa: F401
from app.models import user_lesson as _user_lesson_model  # noqa: F401
from app.models import personality_profile as _personality_profile_model  # noqa: F401
from app.models import generated_scenario as _generated_scenario_model  # noqa: F401
from app.models import cognitive_report as _cognitive_report_model # noqa: F401
from app.models import behavioral_state as _behavioral_state_model  # noqa: F401
from app.models import calibration_event as _calibration_event_model  # noqa: F401
from app.models import intervention_log as _intervention_log_model  # noqa: F401

# Setup structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)


# ─── Lifespan ────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run startup and shutdown logic."""
    logger.info(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    
    # Security check: Never run prod with fallback secret
    if settings.SECRET_KEY == "change-this-secret-key-in-production-please" and settings.ENVIRONMENT == "production":
        logger.critical("CRITICAL: Running in production with default hardcoded SECRET_KEY! Halting startup.")
        import sys
        sys.exit(1)
        
    # Validation: Warn if AI keys are missing
    if not settings.GEMINI_API_KEY and not settings.OPENAI_API_KEY and not settings.DEEPSEEK_API_KEY:
        logger.warning("No LLM API keys provided. AI coaching will use hardcoded fallback pools only.")
        
    if not settings.ELEVENLABS_API_KEY:
        logger.warning("No ElevenLabs API key provided. AI voice synthesis will be disabled.")
        
    logger.info("✅ Startup checks complete. Database migrations are managed via Alembic.")

    # ─── Schema Drift Validation ────────────────────────────────────────────────
    from app.database import engine
    from app.database import Base

    def check_schema_drift(connection):
        from alembic.autogenerate import compare_metadata
        from alembic.runtime.migration import MigrationContext
        context = MigrationContext.configure(connection)
        diff = compare_metadata(context, Base.metadata)
        if diff:
            import sys
            logger.critical(f"CRITICAL: Schema drift detected between Models and Database! Diffs: {diff}")
            logger.critical("Failing startup. Please generate and apply missing migrations.")
            sys.exit(1)

    try:
        async with engine.begin() as conn:
            await conn.run_sync(check_schema_drift)
        logger.info("✅ Schema validation passed: Models match Database")
    except SystemExit:
        raise
    except Exception as e:
        logger.warning(f"Schema validation could not be completed: {e}")

    # ─── Automatic DB Seeding ───────────────────────────────────────────────────
    # Automatically seed default scenarios, test user, and lessons if they are missing
    from app.database import AsyncSessionLocal
    from app.models.user import User
    from app.models.lesson import Lesson, LessonTag
    from app.models.scenario import Scenario, SEED_SCENARIOS
    from app.services import auth_service
    # pyrefly: ignore [missing-import]
    from sqlalchemy import select

    async with AsyncSessionLocal() as session:
        try:
            # 1. Seed Scenarios
            scenarios_result = await session.execute(select(Scenario))
            if not scenarios_result.scalars().first():
                logger.info("🌱 Database empty. Seeding default scenarios...")
                scenarios_to_add = [
                    Scenario(
                        id=s["id"],
                        name=s["name"],
                        description=s["description"],
                        distraction_type=s["distraction_type"],
                        difficulty_level=s["difficulty_level"],
                        is_active=s["is_active"],
                        instruction_text=s["instruction_text"]
                    )
                    for s in SEED_SCENARIOS
                ]
                session.add_all(scenarios_to_add)
                await session.commit()
                logger.info("✅ Scenarios seeded successfully!")
                
            # 2. Seed Test User
            email = "test@example.com"
            user_result = await session.execute(select(User).where(User.email == email))
            if not user_result.scalar_one_or_none():
                logger.info(f"🌱 Creating default test user: {email}")
                hashed_password = auth_service.hash_password("password123")
                new_user = User(
                    name="Test Driver",
                    email=email,
                    hashed_password=hashed_password
                )
                session.add(new_user)
                await session.commit()
                logger.info("✅ Test user created successfully!")
                
            # 3. Seed Lessons
            lessons_result = await session.execute(select(Lesson))
            if not lessons_result.scalars().first():
                logger.info("🌱 Seeding default lessons...")
                lessons_to_add = [
                    Lesson(
                        title="Impulse Control While Driving",
                        description="Learn how to delay your reaction to sudden notifications.",
                        difficulty="Intermediate",
                        tag=LessonTag.IMPULSIVE
                    ),
                    Lesson(
                        title="Managing Digital Distractions",
                        description="Step-by-step guide to using your phone's 'Do Not Disturb' effectively.",
                        difficulty="Beginner",
                        tag=LessonTag.DISTRACTED
                    ),
                    Lesson(
                        title="Peripheral Vision Mastery",
                        description="Maintain focus while keeping an eye on your surroundings.",
                        difficulty="Advanced",
                        tag=LessonTag.SAFE
                    ),
                    Lesson(
                        title="The 2-Second Rule",
                        description="General defensive driving distance rules.",
                        difficulty="Beginner",
                        tag=LessonTag.GENERAL
                    ),
                ]
                session.add_all(lessons_to_add)
                await session.commit()
                logger.info("✅ Lessons seeded successfully!")
                
        except Exception as e:
            logger.error(f"❌ Error during automatic database seeding: {e}")
            await session.rollback()

    yield
    logger.info("🛑 Shutting down...")


# ─── App Instance ─────────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
## AI-Powered Distracted Driving Platform API

Core behavioral training loop:
**Simulation → Decision → Score → Feedback**

### Week 1 Endpoints
- **Auth**: register, login, me
- **Sessions**: create, get, end, score
- **Events**: post event (auto-scores), get event
    """,
    docs_url="/docs",
    redoc_url="/redoc",
)


# ─── Middleware ───────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    """Basic health check — returns API version and status."""
    return {
        "status": "ok",
        "version": settings.APP_VERSION,
        "app": settings.APP_NAME,
    }


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint — redirects to API docs."""
    return {"message": "Distracted Driving Platform API", "docs": "/docs"}
