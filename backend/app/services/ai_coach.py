"""
AI Coach Orchestrator (V2 — Behavioral Realism Overhaul).

Pipeline:
  Event/Context → Persona Selection → Memory Check → LLM (if applicable) → TTS → Response

Key updates:
  - Passenger agent uses zero-latency psychological phrase pools (no LLM).
  - Instructor/Authority use LLM with session memory injected to prevent repetition.
  - Hard fallbacks to phrase pools if LLM fails/timeouts.
  - Records all dialogue in session memory.
"""

import asyncio
import logging
from dataclasses import dataclass
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.llm_provider import llm_provider
from app.services.behavior_analyzer import behavior_analyzer, BehavioralSummary
from app.services.tts_service import tts_service
from app.services.session_memory import add as memory_add, get_recent_text
from app.services.phrase_pools import (
    get_instructor_safe_phrase,
    get_instructor_unsafe_phrase,
    get_authority_phrase,
)
from app.services.prompt_templates import (
    build_instructor_prompt,
    build_authority_prompt,
)
from app.services.intervention_engine import intervention_engine

logger = logging.getLogger(__name__)


@dataclass
class CoachResponse:
    agent: str              # passenger | instructor | authority
    text: str               # spoken dialogue
    audio_bytes: Optional[bytes]  # MP3 audio, None if TTS unavailable
    provider: str           # llm name or 'phrase_pool'
    behavior: Optional[BehavioralSummary] = None


# ── Persona Selection Logic ───────────────────────────────────────────────────

def _select_post_decision_agent(
    decision_type: str,
    consecutive_mistakes: int,
    pressure_level: int,
) -> str:
    safe_decisions = {"safe_ignore", "acceptable"}
    if decision_type in safe_decisions:
        return "instructor"
    if consecutive_mistakes <= 1:
        return "instructor"
    return "authority"


# ── Main Orchestrator ─────────────────────────────────────────────────────────

class AICoach:

    async def generate_feedback(
        self,
        db: AsyncSession,
        user_id: str,
        session_id: str,
        event_type: str,
        decision_type: str,
        response_time: float,
        score_delta: float,
        session_score: float,
        driver_profile: str,
        urgency: str = "medium",
        with_audio: bool = True,
    ) -> CoachResponse:
        """
        Feedback after decision.
        For Immersion mode: We only analyze the event and resolve pending interventions.
        No mid-session dialogue is generated.
        """
        behavior = await behavior_analyzer.analyze_event(
            db=db,
            user_id=user_id,
            event_type=event_type,
            decision_type=decision_type,
            response_time=response_time,
            score_delta=score_delta,
            urgency=urgency,
        )

        # 0. Resolve any pending interventions from the PRIOR event
        await intervention_engine.resolve_pending_interventions(
            db=db,
            user_id=user_id,
            session_id=session_id,
            next_event_id=event_type,
            decision_type=decision_type,
            reaction_time=response_time,
        )

        return CoachResponse(
            agent="none",
            text="",
            audio_bytes=None,
            provider="none",
            behavior=behavior,
        )


ai_coach = AICoach()
