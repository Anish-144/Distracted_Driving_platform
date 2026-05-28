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
    try:
        summary = await behavior_analyzer.get_summary(db, current_user.id)
    except Exception as e:
        logger.error("PostSessionVoice: behavior_analyzer failed: %s", e)
        # Use safe defaults — don't fail the request
        from app.services.behavior_analyzer import BehavioralSummary
        summary = BehavioralSummary(
            dominant_pattern=current_user.profile_type.value,
            behavior_summary="Behavioral profile is being established.",
            consecutive_mistakes=0,
            pressure_level=0,
            pressure_level_label="low",
            safe_ratio=request.session_score / 100.0,
            avg_reaction_time=3.0,
            dominant_fail_scenario="general distraction",
        )

    safe_pct = int(summary.safe_ratio * 100)

    narration = await voice_orchestrator.generate_post_session_coaching(
        driver_type=current_user.profile_type.value,
        session_score=request.session_score,
        safe_pct=safe_pct,
        consecutive_mistakes=summary.consecutive_mistakes,
        dominant_fail_scenario=summary.dominant_fail_scenario,
        dominant_pattern=summary.dominant_pattern,
        behavior_summary=summary.behavior_summary,
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
