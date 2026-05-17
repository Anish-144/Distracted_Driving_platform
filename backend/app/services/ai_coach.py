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
    get_passenger_phrase,
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
    behavior: BehavioralSummary


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

    async def generate_pressure(
        self,
        db: AsyncSession,
        user_id: str,
        session_id: str,
        event_type: str,
        driver_profile: str,
        urgency: str = "medium",
        with_audio: bool = True,
    ) -> CoachResponse:
        """
        PASSENGER AGENT: Generates social pressure before a decision.
        Zero LLM latency. Uses psychologically crafted phrase pools.
        """
        behavior = await behavior_analyzer.get_summary(db, user_id)

        # 1. Get phrase directly from pool (fast, no LLM)
        text = get_passenger_phrase(driver_profile, urgency, session_id)

        # 2. Log intervention BEFORE TTS/return
        await intervention_engine.record_intervention(
            db=db,
            user_id=user_id,
            session_id=session_id,
            event_id=event_type, # passing event_type as proxy for ID since it's pre-event
            agent_type="passenger",
            intervention_phase="pre_decision",
            strategy_used=f"pressure_{urgency}",
            dialogue_text=text,
            prior_consecutive_mistakes=behavior.consecutive_mistakes,
        )

        # 3. Record in memory
        memory_add(session_id, "passenger", text)

        # 4. TTS (parallel-safe)
        audio = None
        if with_audio and tts_service.is_available():
            audio = await tts_service.synthesize(text, agent_type="passenger")

        return CoachResponse(
            agent="passenger",
            text=text,
            audio_bytes=audio,
            provider="phrase_pool",
            behavior=behavior,
        )

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
        INSTRUCTOR / AUTHORITY: Feedback after decision.
        Calls LLM with memory context. Falls back to phrase pools.
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

        # 1. Determine baseline agent and strategy
        baseline_agent = _select_post_decision_agent(
            decision_type=decision_type,
            consecutive_mistakes=behavior.consecutive_mistakes,
            pressure_level=behavior.pressure_level,
        )
        baseline_strategy = "calm_reinforcement" if decision_type in ("safe_ignore", "acceptable") else "correction"

        # 2. Query InterventionEngine for historical optimal strategy
        agent, strategy = await intervention_engine.select_optimal_strategy(
            db=db,
            user_id=user_id,
            intervention_phase="post_decision",
            consecutive_mistakes=behavior.consecutive_mistakes,
            default_agent=baseline_agent,
            default_strategy=baseline_strategy,
        )

        recent_dialogue = get_recent_text(session_id, n=3)
        text = ""
        provider = ""

        # 3. Build prompt and call LLM
        if agent == "instructor":
            prompt = build_instructor_prompt(
                event_type=event_type,
                decision_type=decision_type,
                response_time=response_time,
                score_delta=score_delta,
                session_score=session_score,
                driver_profile=driver_profile,
                consecutive_mistakes=behavior.consecutive_mistakes,
                recent_dialogue=recent_dialogue,
            )
        else:  # authority
            prompt = build_authority_prompt(
                event_type=event_type,
                response_time=response_time,
                consecutive_mistakes=behavior.consecutive_mistakes,
                driver_profile=driver_profile,
                pressure_level=behavior.pressure_level,
                recent_dialogue=recent_dialogue,
            )

        llm_resp = await llm_provider.complete(
            prompt=prompt,
            agent_type=agent,
            max_tokens=40,
            temperature=0.7,
        )

        text = llm_resp.text
        provider = llm_resp.provider

        # 2. Hard Fallbacks if LLM fails/times out
        if provider == "fallback" or len(text.split()) > 20:
            provider = "phrase_pool_fallback"
            is_safe = decision_type in ("safe_ignore", "acceptable")
            if agent == "instructor":
                text = get_instructor_safe_phrase(session_id) if is_safe else get_instructor_unsafe_phrase(driver_profile, session_id)
            else:
                text = get_authority_phrase(driver_profile, session_id)

        # Truncate just in case
        if len(text) > 120:
            text = text.split('.')[0] + '.'

        # 4. Log the intervention for future learning
        await intervention_engine.record_intervention(
            db=db,
            user_id=user_id,
            session_id=session_id,
            event_id=event_type,
            agent_type=agent,
            intervention_phase="post_decision",
            strategy_used=strategy,
            dialogue_text=text,
            prior_consecutive_mistakes=behavior.consecutive_mistakes,
            prior_reaction_time=response_time,
        )

        # 5. Save to memory
        memory_add(session_id, agent, text)

        # 6. TTS
        audio = None
        if with_audio and tts_service.is_available():
            audio = await tts_service.synthesize(text, agent_type=agent)

        return CoachResponse(
            agent=agent,
            text=text,
            audio_bytes=audio,
            provider=provider,
            behavior=behavior,
        )


ai_coach = AICoach()
