"""
AI Routes — behavioral coaching and voice synthesis endpoints.

POST /api/ai/pressure    → Generate social pressure when event starts (Passenger Agent)
POST /api/ai/feedback    → Generate coaching feedback after user decision
POST /api/ai/synthesize  → Convert text to audio (ElevenLabs TTS)
GET  /api/ai/behavior/me → Get current user's behavioral state summary
"""

import base64
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.routes.auth import get_current_user
from app.services.ai_coach import ai_coach
from app.services.behavior_analyzer import behavior_analyzer
from app.services.tts_service import tts_service
from app.services.intervention_observability import observability_engine

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ai", tags=["AI Coaching"])


# ── Pydantic Schemas ──────────────────────────────────────────────────────────

class PressureRequest(BaseModel):
    session_id: str
    event_type: str
    urgency: str = "medium"          # low | medium | high
    with_audio: bool = True


class PressureResponse(BaseModel):
    agent: str
    text: str
    audio_b64: Optional[str] = None  # base64-encoded MP3, None if TTS unavailable
    provider: str


class FeedbackRequest(BaseModel):
    session_id: str
    event_type: str
    decision_type: str               # safe_ignore | impulsive_unsafe | risky | delayed_hesitant
    response_time: float
    score_delta: float
    session_score: float
    urgency: str = "medium"
    with_audio: bool = True


class BehaviorState(BaseModel):
    dominant_pattern: str
    behavior_summary: str
    consecutive_mistakes: int
    pressure_level: int
    pressure_level_label: str
    safe_ratio: float
    avg_reaction_time: float
    dominant_fail_scenario: str


class EffectivenessStats(BaseModel):
    total_interventions: int
    positive_outcomes: int
    negative_outcomes: int
    most_effective_strategy: Optional[str]
    least_effective_strategy: Optional[str]

class ObservabilityMetrics(BaseModel):
    total_interventions_tracked: int
    unsafe_decision_reduction_pct: float
    authority_success_rate_pct: float
    cognitive_overload_failure_pct: float
    avg_hesitation_recovery_sec: float
    intervention_fatigue_index: float

class FeedbackResponse(BaseModel):
    agent: str
    text: str
    audio_b64: Optional[str] = None
    provider: str
    behavior: BehaviorState


class SynthesizeRequest(BaseModel):
    text: str
    agent_type: str = "instructor"  # passenger | instructor | authority


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/pressure", response_model=PressureResponse)
async def generate_pressure(
    request: PressureRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Called when a simulation distraction event STARTS.
    Returns Passenger Agent social pressure dialogue + optional audio.
    """
    try:
        coach_resp = await ai_coach.generate_pressure(
            db=db,
            user_id=current_user.id,
            session_id=request.session_id,
            event_type=request.event_type,
            driver_profile=current_user.profile_type.value,
            urgency=request.urgency,
            with_audio=request.with_audio,
        )
    except Exception as e:
        logger.error("generate_pressure error: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI coaching temporarily unavailable",
        )

    audio_b64 = None
    if coach_resp.audio_bytes:
        audio_b64 = base64.b64encode(coach_resp.audio_bytes).decode()

    return PressureResponse(
        agent=coach_resp.agent,
        text=coach_resp.text,
        audio_b64=audio_b64,
        provider=coach_resp.provider,
    )


@router.post("/feedback", response_model=FeedbackResponse)
async def generate_feedback(
    request: FeedbackRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Called after a user makes a decision in simulation.
    Returns Instructor or Authority Agent dialogue + behavioral state update.
    """
    try:
        coach_resp = await ai_coach.generate_feedback(
            db=db,
            user_id=current_user.id,
            session_id=request.session_id,
            event_type=request.event_type,
            decision_type=request.decision_type,
            response_time=request.response_time,
            score_delta=request.score_delta,
            session_score=request.session_score,
            driver_profile=current_user.profile_type.value,
            urgency=request.urgency,
            with_audio=request.with_audio,
        )
    except Exception as e:
        logger.error("generate_feedback error: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI coaching temporarily unavailable",
        )

    audio_b64 = None
    if coach_resp.audio_bytes:
        audio_b64 = base64.b64encode(coach_resp.audio_bytes).decode()

    b = coach_resp.behavior
    return FeedbackResponse(
        agent=coach_resp.agent,
        text=coach_resp.text,
        audio_b64=audio_b64,
        provider=coach_resp.provider,
        behavior=BehaviorState(
            dominant_pattern=b.dominant_pattern,
            behavior_summary=b.behavior_summary,
            consecutive_mistakes=b.consecutive_mistakes,
            pressure_level=b.pressure_level,
            pressure_level_label=b.pressure_level_label,
            safe_ratio=round(b.safe_ratio, 3),
            avg_reaction_time=b.avg_reaction_time,
            dominant_fail_scenario=b.dominant_fail_scenario,
        ),
    )


@router.post("/synthesize")
async def synthesize_audio(
    request: SynthesizeRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Convert arbitrary text to MP3 audio via ElevenLabs.
    Returns raw audio/mpeg bytes.
    """
    if not tts_service.is_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="TTS service not configured",
        )

    if len(request.text) > 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text too long for real-time synthesis (max 200 chars)",
        )

    audio = await tts_service.synthesize(request.text, agent_type=request.agent_type)
    if not audio:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="TTS synthesis failed",
        )

    return Response(content=audio, media_type="audio/mpeg")


@router.get("/behavior/me", response_model=BehaviorState)
async def get_my_behavior(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the authenticated user's current behavioral intelligence state."""
    summary = await behavior_analyzer.get_summary(db, current_user.id)
    return BehaviorState(
        dominant_pattern=summary.dominant_pattern,
        behavior_summary=summary.behavior_summary,
        consecutive_mistakes=summary.consecutive_mistakes,
        pressure_level=summary.pressure_level,
        pressure_level_label=summary.pressure_level_label,
        safe_ratio=round(summary.safe_ratio, 3),
        avg_reaction_time=summary.avg_reaction_time,
        dominant_fail_scenario=summary.dominant_fail_scenario,
    )

@router.get("/interventions/effectiveness", response_model=EffectivenessStats)
async def get_effectiveness(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Analytics: How effective are the AI interventions for this user?"""
    from sqlalchemy.future import select
    from app.models.intervention_log import InterventionLog
    
    stmt = select(InterventionLog.strategy_used, InterventionLog.effectiveness_score).where(
        InterventionLog.user_id == current_user.id,
        InterventionLog.effectiveness_score != None
    )
    result = await db.execute(stmt)
    logs = result.fetchall()
    
    if not logs:
        return EffectivenessStats(
            total_interventions=0, positive_outcomes=0, negative_outcomes=0,
            most_effective_strategy=None, least_effective_strategy=None
        )

    strategy_scores = {}
    pos = 0
    neg = 0
    for strat, score in logs:
        if strat not in strategy_scores:
            strategy_scores[strat] = []
        strategy_scores[strat].append(score)
        if score > 0: pos += 1
        if score < 0: neg += 1
        
    averages = {k: sum(v)/len(v) for k, v in strategy_scores.items()}
    best = max(averages.items(), key=lambda x: x[1]) if averages else (None, 0)
    worst = min(averages.items(), key=lambda x: x[1]) if averages else (None, 0)

    return EffectivenessStats(
        total_interventions=len(logs),
        positive_outcomes=pos,
        negative_outcomes=neg,
        most_effective_strategy=best[0] if best[1] > 0 else None,
        least_effective_strategy=worst[0] if worst[1] < 0 else None,
    )

@router.get("/observability/metrics", response_model=ObservabilityMetrics)
async def get_observability_metrics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Research-grade longitudinal behavioral metrics."""
    metrics = await observability_engine.get_longitudinal_metrics(db, current_user.id)
    return ObservabilityMetrics(**metrics)

