"""
FastAPI main application entry point.
Includes all routers, CORS middleware, and startup hooks.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import logging
from app.config import settings
from app.database import init_db
from app.routes import auth, user, sessions, events, lessons, progress, ai

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
        
    await init_db()
    logger.info("✅ Database connections established")
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
