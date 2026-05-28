"""
Voice Orchestrator — Central Voice Intelligence Layer.

Decides when voice plays, selects tone and narration type, triggers TTS generation,
and manages fallbacks. Sits above tts_service.py (low-level ElevenLabs) and below
the route handlers.

Use-cases:
  1. post_session_coaching  — After simulation completes
  2. report_narration       — Executive summary of a cognitive report
  3. lesson_narration       — AI-generated lesson content

Pipeline:
  Context → coaching_prompt_builder → LLM (for narration text) → tts_service → audio bytes

The orchestrator uses the existing llm_provider cascade and tts_service singleton.
It never blocks async routes or simulation gameplay.
"""

import base64
import logging
from dataclasses import dataclass
from typing import Optional

from app.services.llm_provider import llm_provider
from app.services.tts_service import tts_service
from app.services.coaching_prompt_builder import (
    build_post_session_prompt,
    build_report_narration_prompt,
    build_lesson_narration_prompt,
)

logger = logging.getLogger(__name__)


@dataclass
class VoiceNarration:
    """Result from the voice orchestrator."""
    text: str                        # Generated narration text
    audio_b64: Optional[str]         # Base64-encoded MP3, None if TTS unavailable
    provider: str                    # LLM provider used, or "fallback"
    narration_type: str              # post_session | report | lesson
    available: bool                  # True if TTS is configured and audio was produced


# ── Fallback narration pools (when all LLMs fail) ─────────────────────────────

_FALLBACK_POST_SESSION = {
    "impulsive": (
        "Your session revealed a clear pattern of sub-2-second reactions to auditory stimuli. "
        "Before your next session, practice a 3-second pause rule: "
        "when a distraction appears, count to three before deciding."
    ),
    "overconfident": (
        "Your confidence in handling distractions is leading to higher interaction rates "
        "than your scores justify. Skill does not eliminate reaction-time risk. "
        "Treat each distraction as a full threat, regardless of your perceived ability."
    ),
    "anxious": (
        "Extended hesitation is costing you points and creating dangerous indecision windows. "
        "Your instinct to ignore is correct — the delay is the problem. "
        "Practice committing to the ignore decision within 2 seconds of distraction onset."
    ),
    "distractible": (
        "External alerts are consistently capturing your visual attention. "
        "The pull you feel is a conditioned dopamine response, not urgency. "
        "Your next session goal: decide to ignore before the alert finishes appearing."
    ),
    "rule_following": (
        "Your discipline is real, but social pressure is overriding it in specific scenarios. "
        "Identify which distraction type most frequently causes you to break your own rule. "
        "That is your primary target."
    ),
    "unknown": (
        "Your baseline behavioral profile is being established. "
        "The patterns from this session will inform your personalized intervention plan. "
        "Complete two more sessions to unlock your full behavioral dossier."
    ),
}

_FALLBACK_REPORT = (
    "Your cognitive report reveals measurable patterns in how you process distraction under pressure. "
    "Review the behavioral timeline to identify which scenario types triggered the fastest — "
    "and therefore most impulsive — responses. That intersection is your primary training target."
)

_FALLBACK_LESSON = (
    "This lesson addresses the specific behavioral pattern detected in your recent sessions. "
    "Read the diagnosis carefully — understanding the mechanism is the first step toward "
    "changing the automatic response."
)


def _get_fallback_post_session(driver_type: str) -> str:
    return _FALLBACK_POST_SESSION.get(driver_type, _FALLBACK_POST_SESSION["unknown"])


# ── Main Orchestrator ─────────────────────────────────────────────────────────

class VoiceOrchestrator:
    """
    Central voice intelligence layer.

    All methods are async and non-blocking.
    TTS synthesis is skipped silently if ElevenLabs is not configured.
    LLM generation falls back to hardcoded content if all providers fail.
    """

    # Use the higher-quality multilingual model for long narration (vs flash for simulation)
    NARRATION_MODEL = "eleven_multilingual_v2"
    NARRATION_AGENT = "instructor"    # Uses the calm, steady instructor voice profile

    async def generate_post_session_coaching(
        self,
        driver_type: str,
        session_score: float,
        safe_pct: int,
        consecutive_mistakes: int,
        dominant_fail_scenario: str,
        dominant_pattern: str,
        behavior_summary: str,
        session_id: str,
        with_audio: bool = True,
    ) -> VoiceNarration:
        """
        Generate adaptive coaching narration after a simulation session completes.
        Called from the /api/voice/post-session endpoint.
        """
        prompt = build_post_session_prompt(
            driver_type=driver_type,
            session_score=session_score,
            safe_pct=safe_pct,
            consecutive_mistakes=consecutive_mistakes,
            dominant_fail_scenario=dominant_fail_scenario,
            dominant_pattern=dominant_pattern,
            behavior_summary=behavior_summary,
            session_id=session_id,
        )

        narration_text, provider = await self._generate_narration_text(
            prompt=prompt,
            fallback_text=_get_fallback_post_session(driver_type),
            max_tokens=120,
        )

        audio_b64 = await self._synthesize_to_b64(narration_text, with_audio)

        logger.info(
            "VoiceOrchestrator[post_session] driver=%s score=%.0f provider=%s audio=%s",
            driver_type, session_score, provider, "yes" if audio_b64 else "no",
        )

        return VoiceNarration(
            text=narration_text,
            audio_b64=audio_b64,
            provider=provider,
            narration_type="post_session",
            available=bool(audio_b64),
        )

    async def generate_report_narration(
        self,
        driver_type: str,
        personality_label: str,
        safe_pct: int,
        executive_summary: str,
        with_audio: bool = True,
    ) -> VoiceNarration:
        """
        Generate spoken narration of the executive summary from a cognitive report.
        Called from /api/voice/report-narration.
        """
        prompt = build_report_narration_prompt(
            driver_type=driver_type,
            personality_label=personality_label,
            safe_pct=safe_pct,
            executive_summary=executive_summary,
        )

        narration_text, provider = await self._generate_narration_text(
            prompt=prompt,
            fallback_text=_FALLBACK_REPORT,
            max_tokens=150,
        )

        audio_b64 = await self._synthesize_to_b64(narration_text, with_audio)

        logger.info(
            "VoiceOrchestrator[report] driver=%s provider=%s audio=%s",
            driver_type, provider, "yes" if audio_b64 else "no",
        )

        return VoiceNarration(
            text=narration_text,
            audio_b64=audio_b64,
            provider=provider,
            narration_type="report",
            available=bool(audio_b64),
        )

    async def generate_lesson_narration(
        self,
        title: str,
        lesson_category: str,
        driver_type: str,
        behavioral_diagnosis: str,
        psychological_interpretation: str,
        with_audio: bool = True,
    ) -> VoiceNarration:
        """
        Generate spoken narration for an AI-generated lesson.
        Called from /api/voice/lesson-narration.
        """
        prompt = build_lesson_narration_prompt(
            title=title,
            lesson_category=lesson_category,
            driver_type=driver_type,
            behavioral_diagnosis=behavioral_diagnosis,
            psychological_interpretation=psychological_interpretation,
        )

        narration_text, provider = await self._generate_narration_text(
            prompt=prompt,
            fallback_text=_FALLBACK_LESSON,
            max_tokens=120,
        )

        audio_b64 = await self._synthesize_to_b64(narration_text, with_audio)

        logger.info(
            "VoiceOrchestrator[lesson] title=%s driver=%s provider=%s audio=%s",
            title[:40], driver_type, provider, "yes" if audio_b64 else "no",
        )

        return VoiceNarration(
            text=narration_text,
            audio_b64=audio_b64,
            provider=provider,
            narration_type="lesson",
            available=bool(audio_b64),
        )

    # ── Internal helpers ──────────────────────────────────────────────────────

    async def _generate_narration_text(
        self,
        prompt: str,
        fallback_text: str,
        max_tokens: int = 120,
    ) -> tuple[str, str]:
        """
        Run the LLM cascade to generate narration text.
        Returns (text, provider_name).
        Falls back to fallback_text if all providers fail.
        """
        try:
            # Use higher token limit for narration (vs 40 for simulation coaching)
            response = await llm_provider.complete(
                prompt=prompt,
                agent_type="instructor",
                max_tokens=max_tokens,
                temperature=0.75,
            )
            if response.provider != "fallback" and len(response.text.split()) >= 10:
                return response.text, response.provider
        except Exception as e:
            logger.error("VoiceOrchestrator LLM narration failed: %s", e, exc_info=True)

        logger.warning("VoiceOrchestrator: using fallback narration text")
        return fallback_text, "fallback"

    async def _synthesize_to_b64(
        self,
        text: str,
        with_audio: bool,
    ) -> Optional[str]:
        """
        Synthesize text to audio and return base64-encoded MP3.
        Returns None if TTS is not configured or synthesis fails.
        Never raises — always degrades gracefully.
        """
        if not with_audio or not tts_service.is_available():
            return None

        try:
            # Use the narration-optimized model for long-form coaching content
            audio_bytes = await tts_service.synthesize_with_model(
                text=text,
                agent_type=self.NARRATION_AGENT,
                model_id=self.NARRATION_MODEL,
            )
            if audio_bytes:
                return base64.b64encode(audio_bytes).decode()
        except Exception as e:
            logger.error("VoiceOrchestrator TTS synthesis failed: %s", e)

        return None


# ── Singleton ─────────────────────────────────────────────────────────────────
voice_orchestrator = VoiceOrchestrator()
