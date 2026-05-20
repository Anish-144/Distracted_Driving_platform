"""
Onboarding routes — Psychological Personality Assessment.

Endpoints:
  GET  /api/onboarding/questions         — Fetch assessment question bank
  POST /api/onboarding/submit            — Submit answers, derive personality profile
  GET  /api/onboarding/profile/me        — Get the authenticated user's personality profile
  GET  /api/onboarding/consistency/me    — Get behavioral consistency analysis

Resilience design:
  - If the personality_profiles table doesn't exist yet (migration pending),
    /submit returns a computed in-memory result instead of a 500 crash.
  - Every DB write is wrapped with try/except so the user always completes onboarding.
  - All operations emit structured logs for diagnostics.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List, Optional

from app.database import get_db
from app.models.user import User
from app.routes.auth import get_current_user
from app.services.personality_profiler import (
    personality_profiler,
    ASSESSMENT_QUESTIONS,
    _derive_profile_label,
    TRAIT_DIMENSIONS,
)
from app.models.behavioral_state import BehavioralState
from sqlalchemy import select, text

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/onboarding", tags=["Onboarding"])


# ── Pydantic Schemas ──────────────────────────────────────────────────────────

class QuestionOption(BaseModel):
    value: str
    text: str


class AssessmentQuestion(BaseModel):
    id: str
    text: str
    dimension: str
    options: List[QuestionOption]


class AssessmentAnswer(BaseModel):
    question_id: str
    answer_value: str


class SubmitAssessmentRequest(BaseModel):
    answers: List[AssessmentAnswer]


class PersonalityProfileResponse(BaseModel):
    onboarding_profile_label: str
    impulsiveness_score: float
    attention_control_score: float
    emotional_reactivity_score: float
    authority_compliance_score: float
    cognitive_patience_score: float
    risk_tolerance_score: float
    stress_resilience_score: float
    multitasking_tendency_score: float
    consistency_score: float
    self_awareness_score: float
    impulsiveness_mismatch: float
    attention_mismatch: float
    emotional_stability_mismatch: float
    total_simulations_since_assessment: int
    has_completed_assessment: bool = True
    # Extra field: indicates if the DB write succeeded or used in-memory fallback
    persisted: bool = True


class ConsistencyResponse(BaseModel):
    consistency_score: float
    self_awareness_score: float
    impulsiveness_mismatch: float
    attention_mismatch: float
    emotional_stability_mismatch: float
    flags: List[str]
    has_data: bool
    interpretation: str


# ── Helper: table existence check ─────────────────────────────────────────────

async def _personality_table_exists(db: AsyncSession) -> bool:
    """
    Quick check whether personality_profiles table exists in PostgreSQL.
    Returns True for SQLite (create_all handles it) or if the table exists.
    """
    try:
        await db.execute(
            text("SELECT 1 FROM personality_profiles LIMIT 1")
        )
        return True
    except Exception:
        return False


# ── Helper: in-memory fallback response ──────────────────────────────────────

def _build_fallback_response(
    scores: dict,
    label: str,
    persisted: bool = False,
) -> PersonalityProfileResponse:
    """Return a valid response from in-memory scores when DB is unavailable."""
    return PersonalityProfileResponse(
        onboarding_profile_label=label,
        impulsiveness_score=scores.get("impulsiveness_score", 0.5),
        attention_control_score=scores.get("attention_control_score", 0.5),
        emotional_reactivity_score=scores.get("emotional_reactivity_score", 0.5),
        authority_compliance_score=scores.get("authority_compliance_score", 0.5),
        cognitive_patience_score=scores.get("cognitive_patience_score", 0.5),
        risk_tolerance_score=scores.get("risk_tolerance_score", 0.5),
        stress_resilience_score=scores.get("stress_resilience_score", 0.5),
        multitasking_tendency_score=scores.get("multitasking_tendency_score", 0.5),
        consistency_score=1.0,
        self_awareness_score=0.5,
        impulsiveness_mismatch=0.0,
        attention_mismatch=0.0,
        emotional_stability_mismatch=0.0,
        total_simulations_since_assessment=0,
        has_completed_assessment=True,
        persisted=persisted,
    )


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/questions", response_model=List[AssessmentQuestion])
async def get_assessment_questions(
    current_user: User = Depends(get_current_user),
):
    """
    Return the full psychological assessment question bank.
    Questions cover 8 psychological dimensions and are phrased
    indirectly to prevent obvious gaming of results.
    """
    logger.info(
        "Assessment questions requested: user_id=%s email=%s",
        current_user.id, current_user.email,
    )
    return [
        AssessmentQuestion(
            id=q["id"],
            text=q["text"],
            dimension=q["dimension"],
            options=[
                QuestionOption(value=o["value"], text=o["text"])
                for o in q["options"]
            ]
        )
        for q in ASSESSMENT_QUESTIONS
    ]


@router.post("/submit", response_model=PersonalityProfileResponse, status_code=status.HTTP_201_CREATED)
async def submit_assessment(
    request: SubmitAssessmentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Process onboarding assessment answers and derive personality profile.

    RESILIENT: If the personality_profiles table is missing (pending migration),
    the endpoint returns a computed in-memory result instead of a 500 error.
    The user always completes onboarding successfully.

    Steps:
    1. Validate minimum answer count
    2. Score answers across 8 psychological dimensions
    3. Derive profile label from scores
    4. Attempt DB persistence (graceful fallback if table missing)
    5. Return profile response
    """
    user_id = current_user.id
    answer_count = len(request.answers)

    logger.info(
        "Onboarding submission started: user_id=%s answer_count=%d",
        user_id, answer_count,
    )

    if answer_count < 5:
        logger.warning(
            "Insufficient answers: user_id=%s count=%d (minimum 5 required)",
            user_id, answer_count,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Minimum 5 answers required for valid personality assessment",
        )

    # Step 1: Score answers in-memory (always succeeds, no DB needed)
    answers_dicts = [
        {"question_id": a.question_id, "answer_value": a.answer_value}
        for a in request.answers
    ]
    scores = personality_profiler._score_answers(answers_dicts)
    label = _derive_profile_label(scores)

    logger.info(
        "Personality scored: user_id=%s label=%s imp=%.2f att=%.2f emo=%.2f",
        user_id, label,
        scores.get("impulsiveness_score", 0.5),
        scores.get("attention_control_score", 0.5),
        scores.get("emotional_reactivity_score", 0.5),
    )

    # Step 2: Check table existence before attempting write
    table_ok = await _personality_table_exists(db)

    if not table_ok:
        logger.error(
            "SCHEMA ERROR: personality_profiles table does not exist. "
            "user_id=%s — returning in-memory result. "
            "Run: docker exec distracted_driving_backend python -c "
            "\"import asyncio; from app.database import init_db; asyncio.run(init_db())\"",
            user_id,
        )
        # Return graceful in-memory result — user completes onboarding normally
        return _build_fallback_response(scores, label, persisted=False)

    # Step 3: Attempt DB persistence
    try:
        profile = await personality_profiler.process_assessment(
            db=db,
            user_id=user_id,
            answers=answers_dicts,
        )
        await db.commit()
        logger.info(
            "Personality profile persisted: user_id=%s label=%s profile_id=%s",
            user_id, label, profile.id,
        )
        return PersonalityProfileResponse(
            onboarding_profile_label=profile.onboarding_profile_label,
            impulsiveness_score=profile.impulsiveness_score,
            attention_control_score=profile.attention_control_score,
            emotional_reactivity_score=profile.emotional_reactivity_score,
            authority_compliance_score=profile.authority_compliance_score,
            cognitive_patience_score=profile.cognitive_patience_score,
            risk_tolerance_score=profile.risk_tolerance_score,
            stress_resilience_score=profile.stress_resilience_score,
            multitasking_tendency_score=profile.multitasking_tendency_score,
            consistency_score=profile.consistency_score,
            self_awareness_score=profile.self_awareness_score,
            impulsiveness_mismatch=profile.impulsiveness_mismatch,
            attention_mismatch=profile.attention_mismatch,
            emotional_stability_mismatch=profile.emotional_stability_mismatch,
            total_simulations_since_assessment=profile.total_simulations_since_assessment,
            has_completed_assessment=True,
            persisted=True,
        )

    except Exception as exc:
        # Non-fatal: DB write failed but scoring succeeded
        # Roll back the broken transaction and return in-memory result
        try:
            await db.rollback()
        except Exception:
            pass

        logger.error(
            "DB write failed for personality profile: user_id=%s error=%s "
            "— returning in-memory fallback. User onboarding will complete normally.",
            user_id, str(exc),
            exc_info=True,
        )
        return _build_fallback_response(scores, label, persisted=False)


@router.get("/profile/me", response_model=PersonalityProfileResponse)
async def get_my_personality_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return the authenticated user's personality profile from onboarding assessment.
    Returns a 'not assessed' placeholder if assessment not yet completed
    or if the table doesn't exist yet.
    """
    user_id = current_user.id

    # Graceful: if table doesn't exist, return unauthenticated profile
    table_ok = await _personality_table_exists(db)
    if not table_ok:
        logger.warning(
            "profile/me: personality_profiles table missing — returning placeholder: user_id=%s",
            user_id,
        )
        return PersonalityProfileResponse(
            onboarding_profile_label="unknown",
            impulsiveness_score=0.5,
            attention_control_score=0.5,
            emotional_reactivity_score=0.5,
            authority_compliance_score=0.5,
            cognitive_patience_score=0.5,
            risk_tolerance_score=0.5,
            stress_resilience_score=0.5,
            multitasking_tendency_score=0.5,
            consistency_score=1.0,
            self_awareness_score=0.5,
            impulsiveness_mismatch=0.0,
            attention_mismatch=0.0,
            emotional_stability_mismatch=0.0,
            total_simulations_since_assessment=0,
            has_completed_assessment=False,
            persisted=False,
        )

    try:
        profile = await personality_profiler.get_profile(db, user_id)
    except Exception as exc:
        logger.error("profile/me DB read failed: user_id=%s error=%s", user_id, exc)
        profile = None

    if profile is None:
        logger.info("No personality profile found: user_id=%s", user_id)
        return PersonalityProfileResponse(
            onboarding_profile_label="unknown",
            impulsiveness_score=0.5,
            attention_control_score=0.5,
            emotional_reactivity_score=0.5,
            authority_compliance_score=0.5,
            cognitive_patience_score=0.5,
            risk_tolerance_score=0.5,
            stress_resilience_score=0.5,
            multitasking_tendency_score=0.5,
            consistency_score=1.0,
            self_awareness_score=0.5,
            impulsiveness_mismatch=0.0,
            attention_mismatch=0.0,
            emotional_stability_mismatch=0.0,
            total_simulations_since_assessment=0,
            has_completed_assessment=False,
            persisted=False,
        )

    logger.info(
        "Personality profile retrieved: user_id=%s label=%s simulations=%d",
        user_id, profile.onboarding_profile_label,
        profile.total_simulations_since_assessment,
    )
    return PersonalityProfileResponse(
        onboarding_profile_label=profile.onboarding_profile_label,
        impulsiveness_score=profile.impulsiveness_score,
        attention_control_score=profile.attention_control_score,
        emotional_reactivity_score=profile.emotional_reactivity_score,
        authority_compliance_score=profile.authority_compliance_score,
        cognitive_patience_score=profile.cognitive_patience_score,
        risk_tolerance_score=profile.risk_tolerance_score,
        stress_resilience_score=profile.stress_resilience_score,
        multitasking_tendency_score=profile.multitasking_tendency_score,
        consistency_score=profile.consistency_score,
        self_awareness_score=profile.self_awareness_score,
        impulsiveness_mismatch=profile.impulsiveness_mismatch,
        attention_mismatch=profile.attention_mismatch,
        emotional_stability_mismatch=profile.emotional_stability_mismatch,
        total_simulations_since_assessment=profile.total_simulations_since_assessment,
        has_completed_assessment=True,
        persisted=True,
    )


@router.get("/consistency/me", response_model=ConsistencyResponse)
async def get_consistency_analysis(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return behavioral consistency analysis:
    How well does the user's self-reported personality match their simulation behavior?

    Requires: completed onboarding + at least 5 simulation events.
    Returns safe placeholder data if requirements not met or table missing.
    """
    user_id = current_user.id

    # Graceful: table check
    table_ok = await _personality_table_exists(db)
    if not table_ok:
        return ConsistencyResponse(
            consistency_score=0.0,
            self_awareness_score=0.0,
            impulsiveness_mismatch=0.0,
            attention_mismatch=0.0,
            emotional_stability_mismatch=0.0,
            flags=[],
            has_data=False,
            interpretation="Personality assessment database is initializing. Complete the assessment and run a simulation to enable this analysis.",
        )

    try:
        profile = await personality_profiler.get_profile(db, user_id)
    except Exception as exc:
        logger.error("consistency/me profile read failed: user_id=%s error=%s", user_id, exc)
        profile = None

    if profile is None:
        return ConsistencyResponse(
            consistency_score=0.0,
            self_awareness_score=0.0,
            impulsiveness_mismatch=0.0,
            attention_mismatch=0.0,
            emotional_stability_mismatch=0.0,
            flags=[],
            has_data=False,
            interpretation="Complete the personality assessment first to enable consistency analysis.",
        )

    # Fetch behavioral state
    try:
        state_result = await db.execute(
            select(BehavioralState).where(BehavioralState.user_id == user_id)
        )
        state = state_result.scalar_one_or_none()
    except Exception as exc:
        logger.error("consistency/me behavioral state read failed: user_id=%s error=%s", user_id, exc)
        state = None

    if state is None or state.total_events < 5:
        return ConsistencyResponse(
            consistency_score=profile.consistency_score,
            self_awareness_score=profile.self_awareness_score,
            impulsiveness_mismatch=profile.impulsiveness_mismatch,
            attention_mismatch=profile.attention_mismatch,
            emotional_stability_mismatch=profile.emotional_stability_mismatch,
            flags=[],
            has_data=False,
            interpretation="Complete at least 5 simulation events to enable cross-session consistency analysis.",
        )

    # Compute fresh consistency analysis
    analysis = personality_profiler._compute_consistency(profile, state)

    logger.info(
        "Consistency analysis computed: user_id=%s score=%.2f self_awareness=%.2f flags=%d",
        user_id, analysis.consistency_score, analysis.self_awareness_score, len(analysis.flags),
    )

    interpretation = _build_consistency_interpretation(
        analysis.consistency_score,
        analysis.self_awareness_score,
        analysis.flags,
    )

    return ConsistencyResponse(
        consistency_score=analysis.consistency_score,
        self_awareness_score=analysis.self_awareness_score,
        impulsiveness_mismatch=analysis.impulsiveness_mismatch,
        attention_mismatch=analysis.attention_mismatch,
        emotional_stability_mismatch=analysis.emotional_stability_mismatch,
        flags=analysis.flags,
        has_data=True,
        interpretation=interpretation,
    )


# ── Diagnostic endpoint ────────────────────────────────────────────────────────

@router.get("/health/schema")
async def check_schema_health(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Diagnostic: Check if the personality_profiles table exists in the DB.
    Returns schema status so frontend can detect migration lag.
    """
    table_ok = await _personality_table_exists(db)
    logger.info(
        "Schema health check: user_id=%s personality_profiles_exists=%s",
        current_user.id, table_ok,
    )
    return {
        "personality_profiles_table": "ok" if table_ok else "missing",
        "status": "ready" if table_ok else "schema_pending",
        "message": (
            "Database schema is ready."
            if table_ok
            else "personality_profiles table not yet created. Restart the backend container to trigger create_all()."
        ),
    }


# ── Re-trigger init_db endpoint ───────────────────────────────────────────────

@router.post("/admin/migrate")
async def trigger_schema_migration(
    current_user: User = Depends(get_current_user),
):
    """
    Emergency: Re-run init_db() to create any missing tables.
    Safe to call on a running system — create_all uses IF NOT EXISTS internally.
    """
    logger.warning(
        "Manual schema migration triggered: user_id=%s email=%s",
        current_user.id, current_user.email,
    )
    try:
        from app.database import init_db
        await init_db()
        logger.info("Manual init_db() completed successfully")
        return {"status": "success", "message": "Database schema refreshed. personality_profiles table created if missing."}
    except Exception as exc:
        logger.error("Manual init_db() failed: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Schema migration failed: {str(exc)}",
        )


# ── Private helpers ───────────────────────────────────────────────────────────

def _build_consistency_interpretation(
    consistency_score: float,
    self_awareness_score: float,
    flags: list,
) -> str:
    if consistency_score >= 0.85:
        return "Strong self-awareness. Your self-reported personality closely matches your simulation behavior — a rare cognitive trait."
    elif consistency_score >= 0.65:
        return f"Moderate self-awareness. Minor divergences detected between your self-perception and simulation behavior ({len(flags)} mismatch indicator(s))."
    elif consistency_score >= 0.4:
        return f"Significant behavioral inconsistency detected. Your simulation decisions diverge from your self-reported traits in {len(flags)} key dimension(s). This is common and indicates areas where cognitive bias affects self-assessment."
    else:
        return "Strong behavioral inconsistency. Your actual driving decisions under pressure differ substantially from your self-reported personality profile — a high-value insight for targeted training."
