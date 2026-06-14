"""
Onboarding routes — Behavioral Calibration Engine.

Endpoints:
  GET  /api/onboarding/questions                  — Fetch Layer 1 self-report question bank
  POST /api/onboarding/submit                     — Submit Layer 1 priors, derive initial profile
  GET  /api/onboarding/calibration/scenarios      — Fetch Layer 2 behavioral scenario definitions
  POST /api/onboarding/calibration/submit         — Submit Layer 2 behavioral telemetry
  GET  /api/onboarding/profile/me                 — Get authenticated user's personality profile
  GET  /api/onboarding/consistency/me             — Get behavioral consistency analysis

Architecture:
  Layer 1: Self-reported priors (4 indirect questions, no dimension labels)
  Layer 2: Behavioral calibration telemetry from micro-simulations (6 scenarios)
  Layer 3: Mismatch analysis — overconfidence detection, behavioral vs reported divergence

Resilience design:
  - If personality_profiles table doesn't exist, /submit returns computed in-memory result.
  - All DB writes wrapped with try/except — users always complete onboarding.
  - Structured logs for full diagnostics.
"""

import json
import logging
from fastapi import APIRouter, Depends, HTTPException, status
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List, Optional

from app.database import get_db
from app.models.user import User
from app.routes.auth import get_current_user
from app.services.personality_profiler import (
    personality_profiler,
    ASSESSMENT_QUESTIONS,
    CALIBRATION_SCENARIOS,
    _derive_profile_label,
    TRAIT_DIMENSIONS,
)
from app.models.behavioral_state import BehavioralState
from app.services.llm_provider import llm_provider
# pyrefly: ignore [missing-import]
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
    # NOTE: 'dimension' is deliberately NOT included in the response model.
    # Exposing the measured dimension to the client destroys measurement validity.
    options: List[QuestionOption]


class AssessmentAnswer(BaseModel):
    question_id: str
    answer_value: str


class SubmitAssessmentRequest(BaseModel):
    answers: List[AssessmentAnswer]


class DynamicQuestionRequest(BaseModel):
    answers: List[AssessmentAnswer]


class DynamicQuestionResponse(BaseModel):
    question_text: str


class CalibrationScenarioResponse(BaseModel):
    id: str
    title: str
    duration_ms: int
    ui_type: str
    instruction: str
    # primary_traits is server-side only — NOT included in response


class CalibrationEventTelemetry(BaseModel):
    """Raw telemetry from a single behavioral calibration scenario."""
    scenario_id: str
    first_response_ms: int = 0
    time_to_choice_ms: int = 0
    interaction_count: int = 0
    distraction_clicks: int = 0
    re_read_count: int = 0
    choice_made: str = ""
    abandoned: bool = False
    # Scenario-specific fields (optional — only relevant to specific scenarios)
    choice_changed: Optional[bool] = None
    followed_audio_authority: Optional[bool] = None
    followed_visual_rule: Optional[bool] = None
    primary_task_completed: Optional[bool] = None
    first_distraction_at_pulse: Optional[int] = None
    yielded_at_escalation_level: Optional[int] = None
    avg_response_speed_ms: Optional[int] = None
    changed_decision_under_pressure: Optional[bool] = None
    chose_higher_risk_option: Optional[bool] = None


class SubmitCalibrationRequest(BaseModel):
    events: List[CalibrationEventTelemetry]


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
    # Behavioral calibration fields
    calibration_completed: bool = False
    calibration_confidence: float = 0.0
    behavioral_impulsiveness: float = 0.5
    behavioral_attention: float = 0.5
    behavioral_notification_fixation: float = 0.5
    behavioral_urgency_susceptibility: float = 0.5
    behavioral_authority_compliance: float = 0.5
    behavioral_cognitive_overload: float = 0.5
    overconfidence_index: float = 0.0
    mismatch_flags: List[str] = []
    has_completed_assessment: bool = True
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
    # Extended calibration fields
    calibration_completed: bool = False
    calibration_confidence: float = 0.0
    overconfidence_index: float = 0.0


# ── Helper: table existence check ─────────────────────────────────────────────

async def _personality_table_exists(db: AsyncSession) -> bool:
    try:
        await db.execute(text("SELECT 1 FROM personality_profiles LIMIT 1"))
        return True
    except Exception:
        return False


# ── Helper: serialize profile to response ─────────────────────────────────────

def _profile_to_response(profile, persisted: bool = True) -> PersonalityProfileResponse:
    """Convert a PersonalityProfile ORM object to the API response model."""
    # Safely parse mismatch_flags JSON
    mismatch_flags = []
    if profile.mismatch_flags:
        try:
            mismatch_flags = json.loads(profile.mismatch_flags)
        except Exception:
            mismatch_flags = []

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
        calibration_completed=getattr(profile, "calibration_completed", False),
        calibration_confidence=getattr(profile, "calibration_confidence", 0.0),
        behavioral_impulsiveness=getattr(profile, "behavioral_impulsiveness", 0.5),
        behavioral_attention=getattr(profile, "behavioral_attention", 0.5),
        behavioral_notification_fixation=getattr(profile, "behavioral_notification_fixation", 0.5),
        behavioral_urgency_susceptibility=getattr(profile, "behavioral_urgency_susceptibility", 0.5),
        behavioral_authority_compliance=getattr(profile, "behavioral_authority_compliance", 0.5),
        behavioral_cognitive_overload=getattr(profile, "behavioral_cognitive_overload", 0.5),
        overconfidence_index=getattr(profile, "overconfidence_index", 0.0),
        mismatch_flags=mismatch_flags,
        has_completed_assessment=True,
        persisted=persisted,
    )


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
        calibration_completed=False,
        calibration_confidence=0.0,
        has_completed_assessment=True,
        persisted=persisted,
    )


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/questions", response_model=List[AssessmentQuestion])
async def get_assessment_questions(
    current_user: User = Depends(get_current_user),
):
    """
    Return the Layer 1 self-report question bank.

    IMPORTANT: Dimension labels are intentionally excluded from the response.
    Exposing which trait is being measured would allow users to game their answers,
    destroying the measurement validity of the self-report priors.
    """
    logger.info(
        "Layer 1 questions requested: user_id=%s email=%s",
        current_user.id, current_user.email,
    )
    return [
        AssessmentQuestion(
            id=q["id"],
            text=q["text"],
            # dimension intentionally omitted — server-side only
            options=[
                QuestionOption(value=o["value"], text=o["text"])
                for o in q["options"]
            ]
        )
        for q in ASSESSMENT_QUESTIONS
    ]


@router.get("/calibration/scenarios", response_model=List[CalibrationScenarioResponse])
async def get_calibration_scenarios(
    current_user: User = Depends(get_current_user),
):
    """
    Return Layer 2 behavioral calibration scenario definitions.

    IMPORTANT: primary_traits are intentionally excluded from the response.
    Users should not know what trait is being measured during each scenario.
    """
    logger.info(
        "Calibration scenarios requested: user_id=%s", current_user.id
    )
    return [
        CalibrationScenarioResponse(
            id=s["id"],
            title=s["title"],
            duration_ms=s["duration_ms"],
            ui_type=s["ui_type"],
            instruction=s["instruction"],
            # primary_traits intentionally omitted
        )
        for s in CALIBRATION_SCENARIOS
    ]


@router.post("/dynamic-question", response_model=DynamicQuestionResponse)
async def generate_dynamic_question(
    request: DynamicQuestionRequest,
    current_user: User = Depends(get_current_user),
):
    """Generate a customized open-ended follow-up question via LLM based on base answers."""
    # Score answers temporarily to get preliminary label
    answers_dicts = [{"question_id": a.question_id, "answer_value": a.answer_value} for a in request.answers]
    scores = personality_profiler._score_answers(answers_dicts)
    label = _derive_profile_label(scores)
    
    # Map their choices to text for the prompt context
    context = []
    q_lookup = {q["id"]: q for q in ASSESSMENT_QUESTIONS}
    for a in request.answers:
        q = q_lookup.get(a.question_id)
        if q:
            opt = next((o for o in q["options"] if o["value"] == a.answer_value), None)
            if opt:
                context.append(f"Q: {q['text']} A: {opt['text']}")
    
    prompt = (
        f"You are an AI driver coach for teenagers. The user just answered some questions:\n"
        f"{chr(10).join(context)}\n\n"
        f"Their preliminary profile is '{label}'. Generate exactly ONE engaging, open-ended follow-up question "
        f"to ask this teenager to dig deeper into their {label} nature regarding focus and driving. "
        f"Rules:\n"
        f"1. You MUST output ONLY the question itself.\n"
        f"2. The response MUST end with a question mark (?).\n"
        f"3. Do NOT make statements, comments, or summaries. ONLY output the question.\n"
        f"Keep it casual, brief (1-2 sentences), and highly relatable for teenagers."
    )
    
    llm_resp = await llm_provider.complete(
        prompt,
        agent_type=f"questionnaire_{label}",
        max_tokens=100
    )
    return DynamicQuestionResponse(question_text=llm_resp.text)


@router.post("/submit", response_model=PersonalityProfileResponse, status_code=status.HTTP_201_CREATED)
async def submit_assessment(
    request: SubmitAssessmentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Process Layer 1 self-report priors and derive initial personality profile.

    This sets weak prior scores only (prior_weight=0.4).
    The profile label will be refined once Layer 2 behavioral calibration completes.

    Minimum 3 answers required (reduced from 5 — only 4 questions now).
    """
    user_id = current_user.id
    answer_count = len(request.answers)

    logger.info(
        "Layer 1 submission started: user_id=%s answer_count=%d",
        user_id, answer_count,
    )

    if answer_count < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Minimum 3 answers required for valid prior assessment",
        )

    answers_dicts = [
        {"question_id": a.question_id, "answer_value": a.answer_value}
        for a in request.answers
    ]
    scores = personality_profiler._score_answers(answers_dicts)
    label = _derive_profile_label(scores)

    logger.info(
        "Layer 1 scored: user_id=%s label=%s imp=%.2f att=%.2f",
        user_id, label,
        scores.get("impulsiveness_score", 0.5),
        scores.get("attention_control_score", 0.5),
    )

    table_ok = await _personality_table_exists(db)
    if not table_ok:
        logger.error(
            "SCHEMA ERROR: personality_profiles missing. user_id=%s — returning in-memory result.",
            user_id,
        )
        return _build_fallback_response(scores, label, persisted=False)

    try:
        profile = await personality_profiler.process_assessment(
            db=db, user_id=user_id, answers=answers_dicts,
        )
        await db.commit()
        logger.info(
            "Layer 1 profile persisted: user_id=%s label=%s profile_id=%s",
            user_id, label, profile.id,
        )
        return _profile_to_response(profile, persisted=True)

    except Exception as exc:
        try:
            await db.rollback()
        except Exception:
            pass
        logger.error(
            "DB write failed for Layer 1 profile: user_id=%s error=%s — in-memory fallback.",
            user_id, str(exc), exc_info=True,
        )
        return _build_fallback_response(scores, label, persisted=False)


@router.post("/calibration/submit", response_model=PersonalityProfileResponse, status_code=status.HTTP_200_OK)
async def submit_calibration(
    request: SubmitCalibrationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Process Layer 2 behavioral calibration telemetry from micro-simulations.

    Receives interaction telemetry from 1–6 behavioral scenarios.
    Extracts trait evidence, updates behavioral scores, runs Layer 3 mismatch analysis,
    and re-derives the profile label from blended prior + behavioral evidence.

    Minimum 1 scenario event required.
    """
    user_id = current_user.id
    event_count = len(request.events)

    logger.info(
        "Layer 2 calibration submission: user_id=%s events=%d",
        user_id, event_count,
    )

    if event_count < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least 1 calibration scenario event required",
        )

    # Convert pydantic models to dicts for the scorer
    scenario_events = []
    for ev in request.events:
        telemetry = {
            "first_response_ms": ev.first_response_ms,
            "time_to_choice_ms": ev.time_to_choice_ms,
            "interaction_count": ev.interaction_count,
            "distraction_clicks": ev.distraction_clicks,
            "re_read_count": ev.re_read_count,
            "choice_made": ev.choice_made,
            "abandoned": ev.abandoned,
        }
        # Include optional scenario-specific fields if present
        if ev.choice_changed is not None:
            telemetry["choice_changed"] = ev.choice_changed
        if ev.followed_audio_authority is not None:
            telemetry["followed_audio_authority"] = ev.followed_audio_authority
        if ev.followed_visual_rule is not None:
            telemetry["followed_visual_rule"] = ev.followed_visual_rule
        if ev.primary_task_completed is not None:
            telemetry["primary_task_completed"] = ev.primary_task_completed
        if ev.first_distraction_at_pulse is not None:
            telemetry["first_distraction_at_pulse"] = ev.first_distraction_at_pulse
        if ev.yielded_at_escalation_level is not None:
            telemetry["yielded_at_escalation_level"] = ev.yielded_at_escalation_level
        if ev.avg_response_speed_ms is not None:
            telemetry["avg_response_speed_ms"] = ev.avg_response_speed_ms
        if ev.changed_decision_under_pressure is not None:
            telemetry["changed_decision_under_pressure"] = ev.changed_decision_under_pressure
        if ev.chose_higher_risk_option is not None:
            telemetry["chose_higher_risk_option"] = ev.chose_higher_risk_option

        scenario_events.append({
            "scenario_id": ev.scenario_id,
            "telemetry": telemetry,
        })

    table_ok = await _personality_table_exists(db)
    if not table_ok:
        logger.error(
            "SCHEMA ERROR: personality_profiles missing during calibration. user_id=%s", user_id
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database schema not ready. Run pending migrations.",
        )

    try:
        profile = await personality_profiler.process_calibration(
            db=db, user_id=user_id, scenario_events=scenario_events,
        )
        await db.commit()
        logger.info(
            "Layer 2 calibration persisted: user_id=%s label=%s confidence=%.2f overconfidence=%.2f",
            user_id, profile.onboarding_profile_label,
            profile.calibration_confidence, profile.overconfidence_index,
        )
        return _profile_to_response(profile, persisted=True)

    except Exception as exc:
        try:
            await db.rollback()
        except Exception:
            pass
        logger.error(
            "Calibration processing failed: user_id=%s error=%s",
            user_id, str(exc), exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Calibration processing failed. Please retry.",
        )


@router.get("/profile/me", response_model=PersonalityProfileResponse)
async def get_my_personality_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return the authenticated user's personality profile.
    Includes both Layer 1 prior scores and Layer 2 behavioral scores (if calibration complete).
    """
    user_id = current_user.id

    table_ok = await _personality_table_exists(db)
    if not table_ok:
        logger.warning(
            "profile/me: personality_profiles table missing — returning placeholder: user_id=%s", user_id
        )
        return PersonalityProfileResponse(
            onboarding_profile_label="unknown",
            impulsiveness_score=0.5, attention_control_score=0.5,
            emotional_reactivity_score=0.5, authority_compliance_score=0.5,
            cognitive_patience_score=0.5, risk_tolerance_score=0.5,
            stress_resilience_score=0.5, multitasking_tendency_score=0.5,
            consistency_score=1.0, self_awareness_score=0.5,
            impulsiveness_mismatch=0.0, attention_mismatch=0.0,
            emotional_stability_mismatch=0.0,
            total_simulations_since_assessment=0,
            calibration_completed=False,
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
            impulsiveness_score=0.5, attention_control_score=0.5,
            emotional_reactivity_score=0.5, authority_compliance_score=0.5,
            cognitive_patience_score=0.5, risk_tolerance_score=0.5,
            stress_resilience_score=0.5, multitasking_tendency_score=0.5,
            consistency_score=1.0, self_awareness_score=0.5,
            impulsiveness_mismatch=0.0, attention_mismatch=0.0,
            emotional_stability_mismatch=0.0,
            total_simulations_since_assessment=0,
            calibration_completed=False,
            has_completed_assessment=False,
            persisted=False,
        )

    logger.info(
        "Profile retrieved: user_id=%s label=%s calibrated=%s simulations=%d",
        user_id, profile.onboarding_profile_label,
        getattr(profile, "calibration_completed", False),
        profile.total_simulations_since_assessment,
    )
    return _profile_to_response(profile, persisted=True)


@router.get("/consistency/me", response_model=ConsistencyResponse)
async def get_consistency_analysis(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return behavioral consistency analysis.

    Compares the user's profile (Layer 1 priors + Layer 2 behavioral evidence)
    against their actual simulation performance.

    Requires: completed onboarding + at least 5 simulation events.
    """
    user_id = current_user.id

    table_ok = await _personality_table_exists(db)
    if not table_ok:
        return ConsistencyResponse(
            consistency_score=0.0, self_awareness_score=0.0,
            impulsiveness_mismatch=0.0, attention_mismatch=0.0,
            emotional_stability_mismatch=0.0,
            flags=[], has_data=False,
            interpretation="Personality assessment database is initializing.",
            calibration_completed=False, calibration_confidence=0.0, overconfidence_index=0.0,
        )

    try:
        profile = await personality_profiler.get_profile(db, user_id)
    except Exception as exc:
        logger.error("consistency/me profile read failed: user_id=%s error=%s", user_id, exc)
        profile = None

    if profile is None:
        return ConsistencyResponse(
            consistency_score=0.0, self_awareness_score=0.0,
            impulsiveness_mismatch=0.0, attention_mismatch=0.0,
            emotional_stability_mismatch=0.0,
            flags=[], has_data=False,
            interpretation="Complete the behavioral calibration first to enable consistency analysis.",
            calibration_completed=False, calibration_confidence=0.0, overconfidence_index=0.0,
        )

    try:
        state_result = await db.execute(
            select(BehavioralState).where(BehavioralState.user_id == user_id)
        )
        state = state_result.scalar_one_or_none()
    except Exception as exc:
        logger.error("consistency/me behavioral state read failed: user_id=%s error=%s", user_id, exc)
        state = None

    if state is None or state.total_events < 5:
        calibration_flags = []
        if profile.mismatch_flags:
            try:
                calibration_flags = json.loads(profile.mismatch_flags)
            except Exception:
                pass

        return ConsistencyResponse(
            consistency_score=profile.consistency_score,
            self_awareness_score=profile.self_awareness_score,
            impulsiveness_mismatch=profile.impulsiveness_mismatch,
            attention_mismatch=profile.attention_mismatch,
            emotional_stability_mismatch=profile.emotional_stability_mismatch,
            flags=calibration_flags,
            has_data=False,
            interpretation="Complete at least 5 simulation events to enable cross-session consistency analysis.",
            calibration_completed=getattr(profile, "calibration_completed", False),
            calibration_confidence=getattr(profile, "calibration_confidence", 0.0),
            overconfidence_index=getattr(profile, "overconfidence_index", 0.0),
        )

    analysis = personality_profiler._compute_consistency(profile, state)

    # Merge calibration mismatch flags with simulation consistency flags
    all_flags = list(analysis.flags)
    if profile.mismatch_flags:
        try:
            cal_flags = json.loads(profile.mismatch_flags)
            # Deduplicate — add calibration flags not already covered
            all_flags = list(dict.fromkeys(cal_flags + all_flags))
        except Exception:
            pass

    logger.info(
        "Consistency analysis: user_id=%s score=%.2f self_awareness=%.2f flags=%d calibrated=%s",
        user_id, analysis.consistency_score, analysis.self_awareness_score,
        len(all_flags), getattr(profile, "calibration_completed", False),
    )

    interpretation = _build_consistency_interpretation(
        analysis.consistency_score,
        analysis.self_awareness_score,
        all_flags,
        calibration_completed=getattr(profile, "calibration_completed", False),
        overconfidence_index=getattr(profile, "overconfidence_index", 0.0),
    )

    return ConsistencyResponse(
        consistency_score=analysis.consistency_score,
        self_awareness_score=analysis.self_awareness_score,
        impulsiveness_mismatch=analysis.impulsiveness_mismatch,
        attention_mismatch=analysis.attention_mismatch,
        emotional_stability_mismatch=analysis.emotional_stability_mismatch,
        flags=all_flags,
        has_data=True,
        interpretation=interpretation,
        calibration_completed=getattr(profile, "calibration_completed", False),
        calibration_confidence=getattr(profile, "calibration_confidence", 0.0),
        overconfidence_index=getattr(profile, "overconfidence_index", 0.0),
    )


# ── Diagnostic endpoint ────────────────────────────────────────────────────────

@router.get("/health/schema")
async def check_schema_health(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Diagnostic: Check if the personality_profiles table exists."""
    table_ok = await _personality_table_exists(db)
    return {
        "personality_profiles_table": "ok" if table_ok else "missing",
        "status": "ready" if table_ok else "schema_pending",
        "message": (
            "Database schema is ready."
            if table_ok
            else "personality_profiles table missing. Run pending Alembic migrations."
        ),
    }


@router.post("/admin/migrate")
async def trigger_schema_migration(
    current_user: User = Depends(get_current_user),
):
    """Emergency: Re-run init_db() to create any missing tables."""
    logger.warning(
        "Manual schema migration triggered: user_id=%s email=%s",
        current_user.id, current_user.email,
    )
    try:
        from app.database import init_db
        await init_db()
        return {"status": "success", "message": "Database schema refreshed."}
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
    calibration_completed: bool = False,
    overconfidence_index: float = 0.0,
) -> str:
    base = ""
    if consistency_score >= 0.85:
        base = "Strong self-awareness. Your self-reported profile closely matches both behavioral calibration and simulation behavior."
    elif consistency_score >= 0.65:
        base = f"Moderate self-awareness. Minor divergences detected across {len(flags)} indicator(s)."
    elif consistency_score >= 0.4:
        base = f"Significant behavioral inconsistency detected across {len(flags)} key dimension(s). This is common and indicates areas where cognitive bias affects self-assessment."
    else:
        base = "Strong behavioral inconsistency. Your actual decisions under pressure differ substantially from your self-reported profile — a high-value insight for targeted training."

    if calibration_completed and overconfidence_index > 0.25:
        base += f" Behavioral calibration detected overconfidence in self-control (index: {overconfidence_index:.2f})."
    elif calibration_completed and overconfidence_index < -0.20:
        base += " Behavioral calibration detected better real-world performance than self-reported."

    return base
