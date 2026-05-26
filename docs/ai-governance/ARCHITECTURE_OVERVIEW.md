# ARCHITECTURE_OVERVIEW.md — SafeDrive AI Full Stack Architecture

---

## Stack Summary

| Layer | Technology | Notes |
|-------|-----------|-------|
| Backend API | FastAPI (Python 3.11+) | Async, uvicorn ASGI |
| Database | PostgreSQL (prod) / SQLite (dev) | Async SQLAlchemy 2.0 |
| ORM | SQLAlchemy 2.0 (async) | Alembic for migrations |
| Frontend | Next.js 14 (TypeScript) | Pages router |
| State Management | Redux Toolkit | 4 slices: auth, session, progress, ai |
| AI Generation | Gemini Flash → GPT-4o-mini → DeepSeek → Fallback | httpx, no SDK |
| Voice Synthesis | ElevenLabs TTS | Optional, gracefully degraded |
| Containerization | Docker Compose | 3 services: db, backend, frontend |

---

## Backend Directory Structure

```
backend/app/
├── main.py              # FastAPI app, lifespan, router registration, auto-seeding
├── config.py            # Settings (Pydantic BaseSettings, reads .env)
├── database.py          # Async engine, session factory, Base, get_db()
├── models/
│   ├── user.py          # User, ProfileType enum
│   ├── session.py       # Session (simulation run)
│   ├── event.py         # Event (individual distraction), EventType, UserResponseType
│   ├── behavioral_log.py # BehavioralLog (per-event decision classification)
│   ├── behavioral_state.py # BehavioralState (per-user lifetime analytics — one row)
│   ├── lesson.py        # Static Lesson (seed data)
│   ├── user_lesson.py   # UserLesson (AI-generated, personalized)
│   ├── cognitive_report.py # CognitiveReport (post-session AI analysis)
│   ├── personality_profile.py # PersonalityProfile (onboarding assessment)
│   ├── generated_scenario.py # GeneratedScenario (AI scenario cache)
│   ├── scenario.py      # Static Scenario (seed data)
│   └── intervention_log.py # InterventionLog (AI coaching interaction log)
├── routes/
│   ├── auth.py          # POST /api/auth/register, /login; GET /me; get_current_user()
│   ├── sessions.py      # POST /api/session/create, /{id}/end; GET /latest, /{id}
│   ├── events.py        # POST /api/event; GET /api/event/{id}
│   ├── ai.py            # POST /api/ai/pressure, /feedback; GET /behavior/me, /observability/metrics, /psychological/metrics
│   ├── lessons.py       # GET/POST /api/lessons/*; AI lesson CRUD
│   ├── onboarding.py    # POST /api/onboarding/assessment; GET /status, /profile
│   ├── scenarios.py     # POST /api/scenarios/generate; GET /api/scenarios/next
│   ├── cognitive_reports.py # GET /api/cognitive-reports/latest, /{id}
│   ├── progress.py      # GET /api/progress/me
│   └── user.py          # GET /api/user/me; PATCH /api/user/me
└── services/
    ├── llm_provider.py      # LLMProvider: Gemini→GPT→DeepSeek→Fallback cascade
    ├── ai_coach.py          # AICoach: Passenger/Instructor/Authority orchestration
    ├── behavior_analyzer.py # BehaviorAnalyzer: analyze_event(), get_summary()
    ├── intervention_engine.py # InterventionEngine: strategy selection & logging
    ├── intervention_observability.py # ObservabilityEngine: longitudinal metrics
    ├── scenario_generator.py # ScenarioGenerator: AI scenario creation
    ├── cognitive_report_service.py # CognitiveReportService: report generation
    ├── lesson_service.py    # LessonGenerationService: AI lesson creation
    ├── personality_profiler.py # PersonalityProfiler: onboarding assessment scoring
    ├── tts_service.py       # TTSService: ElevenLabs voice synthesis
    ├── session_memory.py    # In-memory dialogue history (per session, ephemeral)
    ├── phrase_pools.py      # Psychologically crafted phrase pools (agent dialogue)
    ├── prompt_templates.py  # LLM prompt builders for instructor/authority agents
    ├── cognitive_report_prompt.py # CognitiveReport LLM prompt template
    └── scoring_service.py   # Score calculation helpers
```

---

## Frontend Directory Structure

```
frontend/src/
├── pages/
│   ├── _app.tsx          # Redux Provider, auth persistence
│   ├── index.tsx         # Landing / redirect
│   ├── onboarding.tsx    # 5-step cognitive assessment (1,300 lines)
│   ├── settings.tsx      # User settings
│   ├── auth/
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── dashboard/
│   │   ├── index.tsx     # Main dashboard (stats, latest session)
│   │   ├── research.tsx  # Observability + Psychological Profile tabs
│   │   └── report.tsx    # Cognitive Behavioral Dossier
│   ├── simulation/
│   │   └── index.tsx     # Full simulation runtime UI
│   └── lessons/
│       └── index.tsx     # AI lesson library
├── store/
│   ├── index.ts          # Store configuration, typed hooks
│   ├── authSlice.ts      # Auth state, login/register thunks
│   ├── sessionSlice.ts   # Simulation session state
│   ├── progressSlice.ts  # Lessons, AI lessons, progress stats
│   └── aiSlice.ts        # Behavioral state, observability metrics
├── api/
│   ├── client.ts         # Axios instance (base URL, auth header injection)
│   ├── auth.ts           # Login, register, me
│   ├── sessions.ts       # Create, end, get session
│   ├── events.ts         # Post event
│   ├── lessons.ts        # Get/generate/complete AI lessons
│   ├── ai.ts             # Behavioral state, observability, psychological metrics
│   └── progress.ts       # Progress stats
├── components/
│   ├── layout/AppShell.tsx   # Nav, sidebar, layout wrapper
│   └── motion/ScrollReveal.tsx # FadeUp animation component
└── styles/
    └── globals.css       # Global styles, CSS variables, dark theme tokens
```

---

## Database Schema (Entity Relationships)

```
User (1)
  ├─── Session (many)          — one simulation run
  │       ├─── Event (many)    — one distraction event response
  │       └─── BehavioralLog (many) — one decision classification log per event
  ├─── BehavioralState (1)     — lifetime behavioral analytics (one row per user)
  ├─── PersonalityProfile (1)  — onboarding assessment results (one row per user)
  ├─── UserLesson (many)       — AI-generated personalized lessons
  ├─── CognitiveReport (many)  — post-session behavioral dossier
  ├─── GeneratedScenario (many)— AI-generated simulation scenarios (cache)
  └─── InterventionLog (many)  — AI coaching intervention history
```

---

## Key Architectural Patterns

### 1. Singleton Services
All backend services are module-level singletons:
```python
behavior_analyzer = BehaviorAnalyzer()   # One instance for the process lifetime
ai_coach = AICoach()
llm_provider = LLMProvider()
observability_engine = ObservabilityEngine()
```
They are stateless workers — all state is in the database.

### 2. Background Task Pattern
Cognitive report generation runs asynchronously to avoid blocking the session end response:
```python
async def _generate_report_bg(u_id, s_id, score):
    # ALL imports must be inside this function — background task context
    from app.database import AsyncSessionLocal
    from app.services.cognitive_report_service import cognitive_report_service
    async with AsyncSessionLocal() as bg_db:
        # ... generate and commit
        await bg_db.commit()
background_tasks.add_task(_generate_report_bg, user.id, session_id, score)
```

### 3. Provider Cascade Pattern
```python
providers = []
if settings.GEMINI_API_KEY: providers.append(self._call_gemini)
if settings.OPENAI_API_KEY: providers.append(self._call_openai)
if settings.DEEPSEEK_API_KEY: providers.append(self._call_deepseek)
for fn in providers:
    try:
        return await asyncio.wait_for(fn(...), timeout=6.0)
    except: continue
return LLMResponse(text=fallback_text, provider="fallback")
```

### 4. Observability Dual-Source Pattern
The observability engine reads from two source tiers:
1. **Primary**: `Session + Event + BehavioralLog` (always populated after simulations)
2. **Supplementary**: `BehavioralState` (if `total_events > 0`)
3. **Override**: `InterventionLog` (highest precision, if populated)

This ensures the Observability tab never shows "Awaiting Data" after simulations complete.

### 5. Session Memory (Ephemeral, In-Process)
```python
# session_memory.py — dict of session_id → deque of recent dialogues
# Used to inject recent dialogue history into LLM prompts (anti-repetition)
# Cleared on session end via clear_memory(session_id)
```

---

## Async Data Flow: Simulation Event

```
Frontend posts /api/event →
  [events.py] validate session ownership
  [events.py] evaluate_decision(user_response, response_time) → (DecisionType, score_delta)
  [events.py] create Event record → db.add()
  [events.py] create BehavioralLog record → db.add()
  [events.py] session_service.update_session_score() → db.add()
  await db.flush() → IDs available
  return EventResponse

Frontend posts /api/ai/feedback →
  [ai.py] behavior_analyzer.analyze_event() → updates BehavioralState → db.flush()
  [ai.py] intervention_engine.resolve_pending_interventions()
  [ai.py] intervention_engine.select_optimal_strategy() → agent, strategy
  [ai.py] llm_provider.complete(prompt) → Gemini→GPT→DeepSeek→Fallback
  [ai.py] intervention_engine.record_intervention() → db.add()
  [ai.py] session_memory.add() → in-memory only
  [ai.py] tts_service.synthesize() → optional audio
  return FeedbackResponse(text, audio_b64, behavior_state)
```

---

## Docker Compose Architecture

```yaml
services:
  db:         postgres:16-alpine  → port 6432:5432  (host:container)
  backend:    python FastAPI      → port 9000:8000
  frontend:   Next.js Node        → port 4000:3000

Networks: All services on internal bridge network
Volumes:  postgres_data (persistent DB), backend source mounted for hot reload
```

---

*For debugging methodology, see `DEBUGGING_PROTOCOL.md`.*
*For AI pipeline details, see `AI_PIPELINE.md`.*
