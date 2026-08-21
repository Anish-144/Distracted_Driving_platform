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


_SCENARIO_DISPLAY: dict[str, str] = {
    "incoming_call": "incoming phone calls",
    "whatsapp_notification": "WhatsApp messages",
    "social_media": "social media alerts",
    "email_alert": "urgent email alerts",
    "gps_rerouting": "GPS rerouting displays",
    "passenger_question": "passenger conversations",
    "radio_distraction": "radio and audio adjustments",
    "roadside_event": "roadside distractions",
}


def _get_fallback_post_session(
    driver_type: str,
    session_id: str = "",
    session_score: float = 70.0,
    safe_pct: int = 70,
    consecutive_mistakes: int = 0,
    dominant_fail_scenario: str = "none",
    dominant_pattern: str = "safe",
) -> str:
    """
    Return dynamic, personalized behavioral debrief tailored to the user's actual answers,
    score, and failure modes in this specific session.
    """
    import hashlib
    h_idx = int(hashlib.md5(session_id.encode()).hexdigest(), 16) if session_id else 0
    scenario_human = _SCENARIO_DISPLAY.get(dominant_fail_scenario, dominant_fail_scenario)

    # ── Category 1: Flawless / High Score (Zero or minimal mistakes, safe >= 80%) ──
    if safe_pct >= 80 or session_score >= 85 or consecutive_mistakes == 0:
        high_score_pool = [
            (
                f"Exceptional cognitive control throughout this session. You safely neutralized high-risk alerts "
                f"by refusing engagement, maintaining a {safe_pct}% safe decision rate. Your split-second road vigilance "
                f"was sharp — continue applying this automatic refusal standard during real-world drives."
            ),
            (
                f"Flawless road vigilance in this run. With a {safe_pct}% safe decision score, you proved that high-urgency "
                f"alerts cannot easily hijack your attention. Carry this exact composure and discipline forward into everyday traffic."
            ),
            (
                f"Strong session execution with consistent attention control across all scenarios. You demonstrated deliberate "
                f"prefrontal restraint and resisted reflexive urges across both digital and passenger distractions. Maintain this standard."
            ),
            (
                f"Outstanding focus. You filtered out sudden notifications and maintained full situational awareness with a {safe_pct}% safe score. "
                f"Your cognitive threshold under pressure is solid."
            ),
        ]
        return high_score_pool[h_idx % len(high_score_pool)]

    # ── Category 2: Digital Notifications (Phone, WhatsApp, Social, Email) ──────
    if dominant_fail_scenario in ("incoming_call", "whatsapp_notification", "social_media", "email_alert"):
        if dominant_pattern == "impulsive" or driver_type == "impulsive":
            digital_impulsive_pool = [
                (
                    f"Sub-2-second interactions on {scenario_human} were your defining vulnerability this session. "
                    f"The immediate dopamine pull of an alert is overriding your prefrontal brake — that's a physiological process you can interrupt. "
                    f"Practice counting 'one, two, three' silently every time you feel the urge to engage."
                ),
                (
                    f"Reflexive tapping occurred immediately when {scenario_human} appeared. That reaction speed indicates an automated habit loop "
                    f"rather than a deliberate safety decision. Before your next drive, pre-commit to a strict zero-touch standard for incoming alerts."
                ),
            ]
            return digital_impulsive_pool[h_idx % len(digital_impulsive_pool)]
        else:
            digital_general_pool = [
                (
                    f"Digital alerts from {scenario_human} repeatedly pulled your gaze away from the roadway during this session. "
                    f"Every in-drive glance creates a blind hazard window. Set your device to Do Not Disturb or keep it out of view before driving."
                ),
                (
                    f"Your decision latency on {scenario_human} shows your brain was evaluating whether to answer mid-drive. "
                    f"Eliminate evaluation entirely by pre-committing to ignore all incoming alerts while behind the wheel."
                ),
            ]
            return digital_general_pool[h_idx % len(digital_general_pool)]

    # ── Category 3: Passenger & Conversational Pressure ──────────────────────────
    if dominant_fail_scenario in ("passenger_question", "roadside_event"):
        passenger_pool = [
            (
                f"Conversational and social pressure caused your standards to drop during the passenger scenarios. "
                f"The instinct to be socially accommodating cannot override roadway safety. Next session, practice verbal boundary-setting: "
                f"inform passengers that road focus comes first."
            ),
            (
                f"Passenger demands and roadside visual cues repeatedly split your attention. Context-switching under conversational pressure "
                f"is your primary growth target — make your safe driving standard non-negotiable regardless of who is in the car."
            ),
        ]
        return passenger_pool[h_idx % len(passenger_pool)]

    # ── Category 4: GPS & Vehicle Controls ───────────────────────────────────────
    if dominant_fail_scenario in ("gps_rerouting", "radio_distraction"):
        cabin_pool = [
            (
                f"In-cabin navigation and audio adjustments compromised your visual attention during key driving moments. "
                f"Glancing at rerouting displays in motion adds cognitive overload. Rely on audio-only navigation cues to keep your eyes forward."
            ),
            (
                f"Secondary vehicle tasks like GPS rerouting and radio controls created attentional drift. Set navigation destinations "
                f"and playlists before shifting into drive to eliminate in-motion distractions."
            ),
        ]
        return cabin_pool[h_idx % len(cabin_pool)]

    # ── Category 5: Hesitation / Anxiety ─────────────────────────────────────────
    if dominant_pattern == "anxious" or dominant_pattern == "hesitant":
        hesitant_pool = [
            (
                f"Extended hesitation exceeding 5 seconds was your primary cost pattern. Holding decisions open while in motion "
                f"creates prolonged cognitive hazard windows. Train yourself on a decisive rule: when in doubt, immediately ignore."
            ),
            (
                f"Uncertainty led to response delays across multiple alerts. The goal is not faster evaluation, but pre-committed decisions. "
                f"Decide before the journey begins that non-critical alerts will be ignored without deliberation."
            ),
        ]
        return hesitant_pool[h_idx % len(hesitant_pool)]

    # ── Category 6: General Moderate/Low Performance ─────────────────────────────
    general_pool = [
        (
            f"This session revealed vulnerability to rapid-fire distractions, with a {safe_pct}% safe decision rate. "
            f"Incoming stimuli consistently overwhelmed your attention filters. Target one clear objective next time: keep your hands on the wheel "
            f"and let every alert ring out without touching the screen."
        ),
        (
            f"Multiple competing stimuli triggered lapses in focus across the scenario sequence. "
            f"The psychological counter-measure is radical simplicity: treat every single in-drive alert as non-urgent."
        ),
    ]
    return general_pool[h_idx % len(general_pool)]


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

        fallback_text = _get_fallback_post_session(
            driver_type=driver_type,
            session_id=session_id,
            session_score=session_score,
            safe_pct=safe_pct,
            consecutive_mistakes=consecutive_mistakes,
            dominant_fail_scenario=dominant_fail_scenario,
            dominant_pattern=dominant_pattern,
        )

        narration_text, provider = await self._generate_narration_text(
            prompt=prompt,
            fallback_text=fallback_text,
            max_tokens=120,
        )

        audio_b64 = await self._synthesize_to_b64(narration_text, with_audio)

        logger.info(
            "VoiceOrchestrator[post_session] driver=%s score=%.0f safe=%d%% provider=%s audio=%s",
            driver_type, session_score, safe_pct, provider, "yes" if audio_b64 else "no",
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
