# REPORT_ENGINE.md — Cognitive Report Generation

---

## Overview

The Report Engine generates a deep "Cognitive Behavioral Dossier" after every completed session. It is the most comprehensive AI analysis in the platform, looking at the entire session holistically.

## Execution Flow

1. Frontend calls `/api/session/{id}/end`.
2. Backend updates session state and returns a response immediately.
3. Backend schedules a **Background Task** (`_generate_report_bg` in `sessions.py`).
4. The background task fetches all `Event`s for the session, the user's `BehavioralState`, and their `PersonalityProfile`.
5. Calls `CognitiveReportService.generate_report()`.
6. LLM generates a structured markdown/JSON report.
7. Background task `commit()`s the report to the DB.

## Background Task Safety Rules (CRITICAL)

Background tasks in FastAPI run in a separate execution context.
1. **Lazy Imports**: ALL necessary imports (e.g., `AsyncSessionLocal`, `BehavioralState`, `Event`) MUST be inside the `async def _generate_report_bg()` function scope. Outer-scope imports will cause silent `NameError`s.
2. **Separate DB Session**: The task MUST instantiate its own `AsyncSessionLocal()`. It cannot reuse the `Depends(get_db)` session from the route, as that session is closed before the background task runs.
3. **Explicit Commits**: The task MUST explicitly call `await db.commit()` after generating the report.
4. **Error Handling**: The task MUST have a broad `try/except` block with `logger.error(..., exc_info=True)` so failures don't disappear silently.

## LLM constraints

- The report must synthesize the user's claimed personality (e.g., "Highly cautious") with their actual session behavior (e.g., "Yielded to social pressure 3 times").
- The output format is structured JSON containing narrative sections (`executive_summary`, `emotional_trigger_analysis`, `risk_projection`).
- **Prompt Formatting**: When embedding JSON structures within Python prompts intended for `str.format()`, you MUST double-escape all literal curly braces (e.g., `{{` and `}}`) to prevent `KeyError` exceptions during string interpolation.
- Must handle missing data gracefully (e.g., if the user skipped onboarding).
