"""
FastAPI main application entry point.
Includes all routers, CORS middleware, and startup hooks.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)

import logging
from app.config import settings
from app.database import Base
from app.routes import auth, user, sessions, events, lessons, progress, ai, feedback
from app.routes import onboarding, scenarios, cognitive_reports, settings as settings_router, admin, admin_users  # new: personality + AI scenario routes
from app.routes import voice  # ElevenLabs voice narration routes
from app.routes import gamification  # Gamification: XP, levels, streaks, friends
from app.routes import missions  # Phase 1: Daily missions + Weekly Boss + Streak Freeze
from app.routes import insights  # Phase 2: Driver Persona + Weekly Brain Report
# Ensure all models are imported so Base.metadata.create_all picks them up
import app.models as _all_models  # noqa: F401

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
    if settings.JWT_SECRET_KEY == "change-this-secret-key-in-production" and not settings.DEBUG:
        logger.critical("CRITICAL: Running in production with default hardcoded JWT_SECRET_KEY! Halting startup.")
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
            logger.info("🌱 Checking and upserting scenarios...")
            for s in SEED_SCENARIOS:
                existing = await session.execute(
                    select(Scenario).where(Scenario.id == s["id"])
                )
                if not existing.scalar_one_or_none():
                    session.add(Scenario(
                        id=s["id"],
                        name=s["name"],
                        description=s["description"],
                        distraction_type=s["distraction_type"],
                        difficulty_level=s["difficulty_level"],
                        is_active=s["is_active"],
                        instruction_text=s["instruction_text"]
                    ))
            await session.commit()
            logger.info("✅ Scenarios upserted (%d total)", len(SEED_SCENARIOS))
                
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

            # 4. Seed Achievements
            from app.models.gamification import Achievement
            from app.services.gamification_service import SEED_ACHIEVEMENTS
            ach_result = await session.execute(select(Achievement))
            if not ach_result.scalars().first():
                logger.info("🌱 Seeding achievements catalog...")
                for ach_data in SEED_ACHIEVEMENTS:
                    session.add(Achievement(**ach_data))
                await session.commit()
                logger.info("✅ Achievements seeded (%d total)!", len(SEED_ACHIEVEMENTS))

            # 5. Ensure today's daily challenge exists
            from app.models.gamification import DailyChallenge, ChallengeType
            import datetime as dt
            today = dt.date.today()
            daily_result = await session.execute(
                select(DailyChallenge).where(DailyChallenge.challenge_date == today)
            )
            if not daily_result.scalar_one_or_none():
                logger.info("🌱 Creating today's daily challenge...")
                challenges = [
                    {"title": "Focus Sprint",  "description": "Complete 1 simulation session today.", "type": ChallengeType.COMPLETE_SESSIONS, "target": 1, "xp": 75},
                    {"title": "Safety Star",   "description": "Achieve a score above 80% in a session.", "type": ChallengeType.ACHIEVE_SCORE, "target": 80, "xp": 100},
                    {"title": "Daily Grind",   "description": "Log in and stay active today.", "type": ChallengeType.COMPLETE_SESSIONS, "target": 1, "xp": 50},
                ]
                import random
                pick = random.choice(challenges)
                session.add(DailyChallenge(
                    challenge_date=today,
                    title=pick["title"],
                    description=pick["description"],
                    challenge_type=pick["type"],
                    target_value=pick["target"],
                    xp_reward=pick["xp"],
                ))
                await session.commit()
                logger.info("✅ Daily challenge created: %s", pick["title"])

            # 6. Ensure today's 3 daily missions exist
            from app.models.gamification import DailyMission
            from app.routes.missions import _ensure_today_missions, _ensure_this_week_boss
            import datetime as dt
            today = dt.date.today()
            await _ensure_today_missions(session, today)
            logger.info("✅ Daily missions ensured for %s", today)

            # 7. Ensure this week's boss challenge exists
            from datetime import timedelta
            week_start = today - timedelta(days=today.weekday())
            await _ensure_this_week_boss(session, week_start)
            logger.info("✅ Weekly boss ensured for week starting %s", week_start)
                
        except Exception as e:
            logger.error(f"❌ Error during automatic database seeding: {e}")
            await session.rollback()

    yield
    logger.info("🛑 Shutting down...")


# ─── App Instance ─────────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
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

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


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
app.include_router(gamification.router)
app.include_router(missions.router)
app.include_router(insights.router)


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
