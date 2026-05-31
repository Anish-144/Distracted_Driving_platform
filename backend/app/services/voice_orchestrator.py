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
# 4 rotating variants per driver type so fallback never repeats consecutively.

_FALLBACK_POST_SESSION: dict[str, list[str]] = {
    "impulsive": [
        (
            "The data from this session is clear: your responses are occurring before your judgment has time to engage. "
            "That reflex is the training target. Before your next session, commit to a 3-second count after any alert appears before you allow yourself to react."
        ),
        (
            "Sub-2-second interactions were the defining pattern here. "
            "The dopamine pull of an alert is overriding your prefrontal brake — that's a physiological process you can interrupt. "
            "Practice counting 'one, two, three' silently every time you feel the urge to engage."
        ),
        (
            "Your reaction speed is fast — that's a strength in the right context. "
            "What this session shows is that the same speed is firing when you should be waiting. "
            "The intervention is a deliberate pause: insert it before every decision, without exception."
        ),
        (
            "Every sub-2-second reaction you made in this session was a reflex bypassing a decision. "
            "The goal isn't slower reactions — it's conscious ones. "
            "Your next session target: zero impulsive interactions, regardless of how urgent the alert sounds."
        ),
    ],
    "overconfident": [
        (
            "Your confidence is real, but this session shows it's creating blind spots. "
            "High perceived competence correlates with reduced vigilance — that's the mechanism here. "
            "Treat each distraction as a genuine threat, even the ones that feel manageable."
        ),
        (
            "The interaction pattern in this session suggests you're evaluating distractions mid-drive rather than pre-committing to ignore. "
            "Every evaluation is a cognitive cost — and a risk window. "
            "The goal is zero evaluation: pre-decide to ignore, before the session starts."
        ),
        (
            "Skill doesn't eliminate reaction-time risk — and this session's data confirms that. "
            "Your performance dropped in the scenarios you likely rated as 'easy.' "
            "Complacency is the specific vulnerability to target."
        ),
        (
            "The sessions where you feel most in control tend to be the ones with the most unforced errors. "
            "That pattern is characteristic of overconfidence — not incompetence. "
            "The counter-measure is deliberate humility: assume every scenario is harder than it looks."
        ),
    ],
    "anxious": [
        (
            "Extended hesitation is the cost pattern in this session. "
            "The indecision window itself is dangerous — not just the distraction. "
            "The goal isn't faster reactions; it's pre-committed ones. Decide before the event appears."
        ),
        (
            "Your instinct to be careful is correct. "
            "What this session shows is that the hesitation is exceeding the safe window — holding a decision open for longer than 5 seconds adds risk, not safety. "
            "Practice committing within 3 seconds of any distraction onset."
        ),
        (
            "Uncertainty is the specific mechanism working against you here. "
            "The data shows extended response latency — your brain is searching for the perfect answer when a good-enough answer already existed. "
            "Before next session: the rule is 'when uncertain, ignore.' Apply it without exception."
        ),
        (
            "This session's hesitation pattern reflects approach-avoidance conflict — the brain cycling between engagement and avoidance without resolving. "
            "The solution is a pre-committed rule that eliminates the choice entirely. "
            "'All alerts are ignored' is a rule. 'I'll see how it feels' is not."
        ),
    ],
    "distractible": [
        (
            "Attentional capture is the primary mechanism in this session. "
            "The alerts are pulling your focus before you've consciously decided to look. "
            "Your next session goal: decide to ignore before the alert finishes appearing."
        ),
        (
            "The pull you feel from notifications is a conditioned dopamine response — not urgency. "
            "Every interaction in this session reinforced that pathway. "
            "Every ignore you execute next session begins weakening it."
        ),
        (
            "The key pattern from this session: you looked before you decided to look. "
            "That's attentional capture — automatic, not intentional. "
            "The counter-move is a pre-session commitment: 'I will not check any alert, regardless of source.'"
        ),
        (
            "Your visual attention shifted to distractions faster than your decision-making engaged. "
            "That sequence — attention first, decision second — is the vulnerability this training targets. "
            "Next session: practice holding gaze forward for 2 full seconds after an alert appears before any decision."
        ),
    ],
    "rule_following": [
        (
            "Your discipline is genuine — this session confirms it in most scenarios. "
            "The data shows specific pressure contexts where your own rules are being overridden. "
            "Identify which distraction type caused you to break your standard. That's your primary target."
        ),
        (
            "Social pressure scenarios are where your otherwise strong performance drops. "
            "The rule you follow under low pressure stops applying when the pressure comes from another person. "
            "That gap is the specific training target — not your general discipline."
        ),
        (
            "Your safe decision rate holds well until the passenger pressure scenarios. "
            "That's a specific vulnerability: your behavioral standards are context-conditional. "
            "The intervention is making those standards unconditional — non-negotiable under any source of pressure."
        ),
        (
            "The pattern here is consistent with authority pressure susceptibility — your rules bend when someone else is watching or asking. "
            "The next session goal: apply the same ignore standard regardless of whether a passenger scenario is active. "
            "Your rules don't have a passenger exception."
        ),
    ],
    "unknown": [
        (
            "This session is contributing to your behavioral baseline. "
            "The decisions you made here — both safe and unsafe — are shaping your personalized intervention plan. "
            "Complete two more sessions to unlock your full behavioral profile."
        ),
        (
            "Your behavioral pattern is still being classified from early session data. "
            "What's already clear: the situations where you hesitated or interacted are your training targets. "
            "Keep playing to sharpen the profile."
        ),
        (
            "The early data from this session shows the beginning of a behavioral signature. "
            "Your safe decision rate and reaction times are being analyzed. "
            "After your next two sessions, your personalized intervention plan will activate."
        ),
        (
            "Baseline establishment is the purpose of early sessions — and this one added meaningful data. "
            "Your specific distraction vulnerability pattern is beginning to emerge. "
            "One more session will be enough to classify your driver type and unlock a targeted lesson plan."
        ),
    ],
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


def _get_fallback_post_session(driver_type: str, session_id: str = "") -> str:
    """Return a rotating fallback narration keyed by session_id hash to prevent repetition."""
    import hashlib
    pool = _FALLBACK_POST_SESSION.get(driver_type, _FALLBACK_POST_SESSION["unknown"])
    if session_id:
        idx = int(hashlib.md5(session_id.encode()).hexdigest(), 16) % len(pool)
    else:
        idx = 0
    return pool[idx]


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
            fallback_text=_get_fallback_post_session(driver_type, session_id),
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
