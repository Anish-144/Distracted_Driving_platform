"""
Voice Routes — ElevenLabs narration endpoints.

POST /api/voice/post-session    → Adaptive coaching narration after simulation
POST /api/voice/report          → Executive summary narration for cognitive report
POST /api/voice/lesson          → Lesson content narration

All endpoints:
  - Require JWT authentication
  - Return { text, audio_b64, provider, available }
  - Gracefully degrade if TTS is unavailable (audio_b64 = null, available = false)
  - Never return HTTP 500 — LLM and TTS failures fall back to substantive hardcoded content
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.routes.auth import get_current_user
from app.services.voice_orchestrator import voice_orchestrator
from app.services.behavior_analyzer import behavior_analyzer

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/voice", tags=["Voice Narration"])


# ── Pydantic Schemas ──────────────────────────────────────────────────────────

class VoiceNarrationResponse(BaseModel):
    text: str
    audio_b64: Optional[str] = None
    provider: str
    narration_type: str
    available: bool


class PostSessionVoiceRequest(BaseModel):
    session_id: str
    session_score: float
    with_audio: bool = True


class ReportVoiceRequest(BaseModel):
    driver_type: str
    personality_label: str
    safe_decision_rate: float          # 0.0–1.0
    executive_summary: str
    with_audio: bool = True


class LessonVoiceRequest(BaseModel):
    title: str
    lesson_category: str
    driver_type: str
    behavioral_diagnosis: str
    psychological_interpretation: str
    with_audio: bool = True


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post(
    "/post-session",
    response_model=VoiceNarrationResponse,
    status_code=status.HTTP_200_OK,
)
async def post_session_coaching(
    request: PostSessionVoiceRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate adaptive behavioral coaching narration immediately after a session.
    Pulls behavioral state for the user to personalize the narration.
    Falls back gracefully if LLM or TTS is unavailable.
    """
    # 1. Fetch the specific events logged during this session to tailor coaching directly to what occurred
    from sqlalchemy import select
    from app.models.event import Event, UserResponseType

    session_events: list[Event] = []
    try:
        events_res = await db.execute(
            select(Event).where(Event.session_id == request.session_id).order_by(Event.triggered_at.asc())
        )
        session_events = list(events_res.scalars().all())
    except Exception as e:
        logger.warning("Could not fetch session events for %s: %s", request.session_id, e)

    total_events = len(session_events)
    if total_events > 0:
        safe_events = [e for e in session_events if e.user_response in (UserResponseType.IGNORED, UserResponseType.VOICE_COMMAND)]
        unsafe_events = [e for e in session_events if e.user_response == UserResponseType.INTERACTED]
        timeout_events = [e for e in session_events if e.user_response == UserResponseType.NO_RESPONSE]
        impulsive_events = [e for e in unsafe_events if (e.response_time or 0) < 2.0]
        hesitant_events = [e for e in session_events if (e.response_time or 0) > 5.0]

        safe_count = len(safe_events)
        unsafe_count = len(unsafe_events)
        safe_pct = int((safe_count / total_events) * 100)

        failed_types = [e.event_type.value for e in unsafe_events + timeout_events]
        dominant_fail_scenario = max(set(failed_types), key=failed_types.count) if failed_types else "none"
        consecutive_mistakes = unsafe_count

        if safe_pct >= 80 or unsafe_count == 0:
            dominant_pattern = "safe"
            behavior_summary = f"Driver demonstrated exceptional attention control with {safe_count}/{total_events} safe decisions."
        elif len(impulsive_events) > 0:
            dominant_pattern = "impulsive"
            behavior_summary = f"Driver exhibited {len(impulsive_events)} impulsive sub-2-second interactions, failing primarily on {dominant_fail_scenario}."
        elif len(hesitant_events) > 0:
            dominant_pattern = "hesitant"
            behavior_summary = f"Driver exhibited prolonged hesitation exceeding 5 seconds on {dominant_fail_scenario}."
        else:
            dominant_pattern = current_user.profile_type.value
            behavior_summary = f"Driver completed session with {unsafe_count} unsafe interactions out of {total_events} events, struggling on {dominant_fail_scenario}."
    else:
        # Fallback to lifetime summary if session events are not yet indexed
        try:
            summary = await behavior_analyzer.get_summary(db, current_user.id)
            safe_pct = int(summary.safe_ratio * 100)
            consecutive_mistakes = summary.consecutive_mistakes
            dominant_fail_scenario = summary.dominant_fail_scenario
            dominant_pattern = summary.dominant_pattern
            behavior_summary = summary.behavior_summary
        except Exception as e:
            logger.error("PostSessionVoice: behavior_analyzer failed: %s", e)
            safe_pct = int(max(0.0, min(100.0, request.session_score)))
            consecutive_mistakes = 0 if safe_pct >= 70 else 2
            dominant_fail_scenario = "none" if safe_pct >= 70 else "incoming_call"
            dominant_pattern = "safe" if safe_pct >= 70 else current_user.profile_type.value
            behavior_summary = f"Session completed with a score of {request.session_score}/100."

    narration = await voice_orchestrator.generate_post_session_coaching(
        driver_type=current_user.profile_type.value,
        session_score=request.session_score,
        safe_pct=safe_pct,
        consecutive_mistakes=consecutive_mistakes,
        dominant_fail_scenario=dominant_fail_scenario,
        dominant_pattern=dominant_pattern,
        behavior_summary=behavior_summary,
        session_id=request.session_id,
        with_audio=request.with_audio,
    )

    return VoiceNarrationResponse(
        text=narration.text,
        audio_b64=narration.audio_b64,
        provider=narration.provider,
        narration_type=narration.narration_type,
        available=narration.available,
    )


@router.post(
    "/report",
    response_model=VoiceNarrationResponse,
    status_code=status.HTTP_200_OK,
)
async def report_narration(
    request: ReportVoiceRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Generate spoken executive summary narration for a cognitive report.
    The client passes report data directly — no additional DB queries needed.
    Falls back gracefully if TTS unavailable.
    """
    narration = await voice_orchestrator.generate_report_narration(
        driver_type=request.driver_type,
        personality_label=request.personality_label,
        safe_pct=int(request.safe_decision_rate * 100),
        executive_summary=request.executive_summary,
        with_audio=request.with_audio,
    )

    return VoiceNarrationResponse(
        text=narration.text,
        audio_b64=narration.audio_b64,
        provider=narration.provider,
        narration_type=narration.narration_type,
        available=narration.available,
    )


@router.post(
    "/lesson",
    response_model=VoiceNarrationResponse,
    status_code=status.HTTP_200_OK,
)
async def lesson_narration(
    request: LessonVoiceRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Generate spoken narration for an AI-generated lesson.
    Falls back gracefully if TTS unavailable — returns text-only narration.
    """
    narration = await voice_orchestrator.generate_lesson_narration(
        title=request.title,
        lesson_category=request.lesson_category,
        driver_type=request.driver_type,
        behavioral_diagnosis=request.behavioral_diagnosis,
        psychological_interpretation=request.psychological_interpretation,
        with_audio=request.with_audio,
    )

    return VoiceNarrationResponse(
        text=narration.text,
        audio_b64=narration.audio_b64,
        provider=narration.provider,
        narration_type=narration.narration_type,
        available=narration.available,
    )
