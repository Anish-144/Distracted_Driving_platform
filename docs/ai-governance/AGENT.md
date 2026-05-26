# AGENT.md — SafeDrive AI Master Governance File

> **This file is the authoritative engineering operating manual for the SafeDrive AI platform.**
> All AI coding agents, engineers, and contributors MUST read this before making any changes.

---

## 1. Project Philosophy

SafeDrive AI is a **cognitive behavioral training platform** — not a gamified quiz or a simple notification blocker. Every engineering decision must serve one mission:

> *"Use AI to understand, predict, and reshape driver behavior at the psychological level."*

This means:
- The platform generates **personalized**, not templated, responses
- Every piece of user data flows toward deeper behavioral understanding
- The observability layer is a **research instrument**, not a dashboard decoration
- The simulation engine creates **genuine psychological pressure**, not fake timers

The system is built to feel like a professional cognitive laboratory — premium, precise, and adaptive.

---

## 2. Architecture Rules (NEVER VIOLATE)

### Backend
1. **FastAPI + async SQLAlchemy ONLY.** Never introduce synchronous DB calls into async routes.
2. **All routes use `Depends(get_db)` for DB sessions.** Never instantiate `AsyncSessionLocal()` inside a route handler directly — only in background tasks.
3. **Background tasks MUST self-contain all imports** inside the nested `async def`. They run in a different execution context and cannot reliably access outer-scope lazy imports.
4. **The `get_db()` dependency auto-commits on success and auto-rolls back on exception.** Do not call `db.commit()` in route handlers — only in background tasks that use their own `AsyncSessionLocal()` context.
5. **Models must be imported in `main.py`** with `# noqa: F401` to register them with `Base.metadata` before `create_all` runs.
6. **Never use `session.execute(text(...))` in production code** — always use SQLAlchemy ORM constructs.

### Frontend
1. **Redux is the single source of truth** for all cross-component state. No local state for data that needs to be shared.
2. **All API calls go through `src/api/` modules.** Never call `fetch()` or `axios` directly in a component.
3. **Never break the simulation Redux slice.** The simulation engine depends on atomic session state updates.
4. **The dark theme is mandatory.** The platform uses a dark-first design system; do not introduce light-only components.

### AI Pipeline
1. **The LLM cascade order is: Gemini Flash → GPT-4o-mini → DeepSeek → Hardcoded Fallback.** Never skip a provider or reorder.
2. **Fallback pools are NOT placeholders.** They must contain substantive, psychologically informed content.
3. **All LLM prompts must enforce a structured JSON output** when the response will be parsed. Validate parsing in `_parse_llm_response()`.

---

## 3. Engineering Principles

### Data Integrity First
- Every piece of behavioral data must reach the DB before the API response returns
- `db.flush()` after every model creation so IDs are available for dependent records
- Never silently swallow exceptions in data-writing paths — always log with `exc_info=True`

### User Isolation is Absolute
- Every DB query that reads user data MUST include a `WHERE user_id = :user_id` clause
- Every route that modifies a resource MUST verify ownership before modification
- Cross-user data access is a security violation — treat it as critical

### Behavioral Continuity
- `BehavioralState` (one record per user, updated on every AI coaching event) is the source of truth for longitudinal analysis
- `Session` + `Event` + `BehavioralLog` (one record per simulation event) are the source of truth for observability when `BehavioralState.total_events == 0`
- Never delete behavioral history — only append

### Adaptive Generation
- AI generation must use user context: `driver_profile`, `consecutive_mistakes`, `dominant_fail_scenario`, `recent_dialogue`
- Never produce the same response twice in the same session (use session memory injection)
- Fallback content must be varied via hash-based selection, never static

---

## 4. Forbidden Modifications

**NEVER:**
- Rewrite the async architecture to synchronous
- Remove Redux and replace with local component state
- Replace the `LLMProvider` cascade with a single-provider implementation
- Delete or bypass the `InterventionEngine` (it enables adaptive strategy selection)
- Remove `session_memory` (it prevents AI response repetition within a session)
- Hardcode observability analytics values
- Expose one user's behavioral data to another user
- Return empty strings from AI generation endpoints without logging the failure
- Skip `await db.commit()` in background tasks that write cognitive reports
- Remove `BehavioralState` updates from the `behavior_analyzer.analyze_event()` call chain

---

## 5. Debugging Philosophy

**Always follow this order:**

1. **DB first** — Query the database directly to verify data exists before debugging the UI
2. **Backend service** — Run the service function in isolation with a test script
3. **API endpoint** — Test the endpoint with a real JWT token via `/docs`
4. **Redux store** — Inspect the store state in the browser devtools
5. **Component render** — Only debug UI rendering after all above are confirmed correct

**Key principle:** If the UI shows empty data, the bug is almost always in the data pipeline, not in the rendering logic.

See `DEBUGGING_PROTOCOL.md` for full methodology.

---

## 6. AI Generation Standards

- All AI-generated content must be **behaviorally specific** — reference the user's `driver_type`, `consecutive_mistakes`, `dominant_fail_scenario`
- Content must never feel **templated** — use hash-based variation, session memory, and profile-aware selection
- All LLM JSON responses must be validated against a required key set before saving
- Failed LLM calls must fall through to phrase pools, never return HTTP 500 to the user

---

## 7. Workflow Expectations

When making any change:
1. Read the relevant governance file for the subsystem being changed
2. Trace the full data flow end-to-end before modifying any part of it
3. After modifying backend code, verify in Docker with `docker exec distracted_driving_backend python -c "..."` before restarting
4. After modifying frontend, verify Redux state updates as expected in devtools
5. After any DB schema change, create an Alembic migration — never modify schema with `create_all` in production

---

*Last updated by AI governance initialization. For the full architecture, see `ARCHITECTURE_OVERVIEW.md`.*
