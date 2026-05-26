# DEBUGGING_PROTOCOL.md — SafeDrive AI Standardized Debugging Methodology

> **CRITICAL RULE**: Before debugging any frontend rendering issue, always verify the data pipeline first.
> 90% of "empty UI" bugs are backend data persistence failures, not frontend rendering bugs.

---

## Phase 1 — Database Persistence Verification (ALWAYS FIRST)

Run inside the Docker container:

```bash
docker exec distracted_driving_backend python -c "
import asyncio
from app.database import AsyncSessionLocal
from sqlalchemy import select, text

async def check():
    async with AsyncSessionLocal() as db:
        tables = ['users', 'sessions', 'events', 'behavioral_logs',
                  'behavioral_states', 'user_lessons', 'cognitive_reports',
                  'intervention_logs', 'personality_profiles']
        for t in tables:
            r = await db.execute(text('SELECT COUNT(*) FROM ' + t))
            print(t + ':', r.scalar())

asyncio.run(check())
"
```

**Interpretation:**
- `sessions > 0` but `behavioral_states.total_events = 0` → `analyze_event()` not being called (AI feedback endpoint not hit)
- `events > 0` but `behavioral_states = 0` → `behavior_analyzer` not called during simulation
- `cognitive_reports = 0` but sessions exist → background report task failing (check logs)
- `user_lessons > 0` but content empty → fallback pool key names mismatched DB schema
- `intervention_logs = 0` → AI coaching endpoint not being hit OR intervention_engine failing silently

---

## Phase 2 — Backend Service Verification

Test a specific service function in isolation:

```bash
docker exec distracted_driving_backend python -c "
import asyncio
from app.database import AsyncSessionLocal
from app.services.intervention_observability import observability_engine
from app.models.session import Session
from sqlalchemy import select

async def test():
    async with AsyncSessionLocal() as db:
        # Get first user with sessions
        r = await db.execute(select(Session).where(Session.end_time.isnot(None)).limit(1))
        s = r.scalar_one_or_none()
        if not s:
            print('No completed sessions')
            return
        metrics = await observability_engine.get_longitudinal_metrics(db, s.user_id)
        for k, v in metrics.items():
            print(k, v)

asyncio.run(test())
"
```

**Key service verification commands:**
```bash
# Verify fallback lesson pool keys match DB schema
docker exec distracted_driving_backend python -c "
from app.services.lesson_service import _FALLBACK_LESSONS
d = _FALLBACK_LESSONS['impulsive']
required = ['behavioral_diagnosis','psychological_interpretation','cognitive_coaching_narrative',
            'behavioral_exercises','personalized_improvement_strategy']
for key in required:
    print(key + ':', 'OK' if key in d else 'MISSING')
"

# Verify live code is loaded (not stale)
docker exec distracted_driving_backend python -c "
import inspect
from app.services.lesson_service import _FALLBACK_LESSONS
print('behavioral_diagnosis preview:', _FALLBACK_LESSONS['impulsive'].get('behavioral_diagnosis','MISSING')[:60])
"
```

---

## Phase 3 — API Endpoint Verification

1. Open `http://localhost:9000/docs` in browser
2. Authenticate via `POST /api/auth/login` (use the Authorize button with JWT)
3. Test the specific endpoint that's failing
4. Inspect the response — verify all fields are populated, not empty strings

**Critical endpoints to test after any data pipeline change:**
```
GET  /api/ai/observability/metrics   → Should return non-zero values after simulations
GET  /api/ai/psychological/metrics   → has_completed_assessment should match DB state
GET  /api/lessons/ai/recommended     → behavioral_diagnosis field must not be ""
GET  /api/cognitive-reports/latest   → Should return report after sessions with AI coaching
GET  /api/session/latest             → score, avg_reaction_time
GET  /api/progress/me                → total_sessions, safe_rate
```

---

## Phase 4 — Backend Log Inspection

```bash
# Real-time logs
docker logs distracted_driving_backend --tail 50 -f

# Filter for errors only
docker logs distracted_driving_backend --tail 100 2>&1 | grep -i "error\|warning\|critical\|exception"

# Check background task execution
docker logs distracted_driving_backend 2>&1 | grep "cognitive report\|_generate_report_bg\|Lesson generated"
```

**Common log patterns and their meaning:**
| Log Pattern | Root Cause |
|-------------|-----------|
| `All LLM providers failed. Using hardcoded fallback.` | All API keys invalid/rate-limited. Fallback pool is used. Normal. |
| `LLM provider _call_gemini error: 429` | Gemini rate limit. System falls through to OpenAI. Normal. |
| `LLM provider _call_openai error: 401` | Invalid OpenAI API key. System falls through to DeepSeek. Check `.env`. |
| `_generate_report_bg failed:` | Background report task exception. Check full traceback. |
| `Skipping report: behavioral_state=None` | `BehavioralState` not created — `analyze_event()` never called. |
| `Lesson generated for user=... via fallback` | Lesson used fallback pool. Content should be populated if keys match schema. |
| `NameError: name 'X' is not defined` | Import missing from inside background task function. Add import inside the function. |

---

## Phase 5 — Redux Store Verification

1. Open Chrome DevTools → Redux DevTools extension
2. Inspect the `state` after a relevant user action
3. Verify the correct slice (`auth`, `session`, `progress`, `ai`) has updated

**State to verify per feature:**
| Feature | Redux Slice | State Key |
|---------|-------------|-----------|
| Observability tab | `ai` | `observabilityMetrics` |
| Psychological profile | `ai` | `psychologicalMetrics` |
| AI Lessons list | `progress` | `aiLessons` |
| Session stats | `session` | `currentSession` |
| Dashboard stats | `progress` | `stats` |

---

## Phase 6 — Frontend Rendering Verification

Only reach this phase after all above pass.

1. Check component data null guards: `if (!data) return <Skeleton />`
2. Check field mapping: frontend type field names must match backend response field names exactly
3. Check array vs. object: some fields are JSON strings in DB, parsed to arrays in serialization
4. Verify API type definitions in `src/api/*.ts` match the Pydantic response models in `routes/*.py`

**Common mismatch pattern:**
```typescript
// WRONG — if backend sends snake_case
lesson.behavioralDiagnosis  // undefined

// RIGHT — backend sends snake_case directly
lesson.behavioral_diagnosis  // correct
```

---

## Regression Prevention Checklist

Before merging any change that touches backend services:

- [ ] `docker exec distracted_driving_backend python -c "from app.main import app"` — no ImportError
- [ ] All table row counts are as expected (Phase 1)
- [ ] Target API endpoint returns non-empty data (Phase 3)
- [ ] No new ERROR or WARNING log lines introduced (Phase 4)
- [ ] Frontend displays correct data after Redux refresh (Phase 5-6)

---

## Emergency Recovery Procedures

### Backend won't start
```bash
docker logs distracted_driving_backend --tail 20
# Look for: ImportError, SyntaxError, AttributeError on startup
docker compose up --build backend  # Force rebuild
```

### Database migration failed
```bash
docker exec distracted_driving_backend alembic downgrade -1  # Roll back one step
docker exec distracted_driving_backend alembic upgrade head   # Re-apply
```

### All data appears empty after restart
```bash
# Check if DB volume persisted
docker volume ls | grep postgres_data
docker exec distracted_driving_db psql -U postgres -d distracted_driving -c "SELECT COUNT(*) FROM users;"
```

### LLM all failing
```bash
# Check API keys
docker exec distracted_driving_backend python -c "
from app.config import settings
print('Gemini:', bool(settings.GEMINI_API_KEY))
print('OpenAI:', bool(settings.OPENAI_API_KEY))
print('DeepSeek:', bool(settings.DEEPSEEK_API_KEY))
"
# System falls back to phrase pools — platform still functional
```
