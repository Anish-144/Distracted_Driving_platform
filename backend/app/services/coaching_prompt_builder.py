"""
Coaching Prompt Builder — Emotionally Adaptive Voice Narration Prompts.

Generates prompts for the ElevenLabs voice orchestrator that produce
psychologically intelligent narration. Not generic assistant text.
Three use-cases:
  1. post_session  — Delivered after simulation completes
  2. lesson        — Narrates AI-generated lesson content
  3. report        — Reads the executive summary of a cognitive report
"""

import hashlib
import logging

logger = logging.getLogger(__name__)

# ── Tone profiles by driver type ─────────────────────────────────────────────

_TONE_DIRECTIVES = {
    "impulsive": (
        "Your tone is firm and direct, without being harsh. "
        "You do not sugarcoat. You name behaviors precisely. "
        "You speak with the calm authority of someone who has seen this pattern many times."
    ),
    "overconfident": (
        "Your tone is measured and analytical. You do not validate overconfidence. "
        "You present data and let it speak. You correct the illusion of competence "
        "without triggering defensiveness."
    ),
    "anxious": (
        "Your tone is grounding and reassuring — steady, not cheerful. "
        "You acknowledge difficulty before prescribing change. "
        "You do not rush. You speak like someone who genuinely believes the person can improve."
    ),
    "distractible": (
        "Your tone is calm and corrective. You name the pull of distraction matter-of-factly. "
        "You do not shame. You describe the mechanism and offer a specific counter-action."
    ),
    "rule_following": (
        "Your tone is collegial and precise. You respect their discipline while "
        "pointing to where social pressure overrode their own standards. "
        "You are a peer, not a superior."
    ),
    "unknown": (
        "Your tone is professional and observational. You describe behavioral patterns "
        "clinically, without judgment. You give the user clear, actionable language."
    ),
}

# ── Post-session narration prompts ───────────────────────────────────────────

_POST_SESSION_PROMPT = """\
You are a cognitive behavioral driving coach delivering a 2–3 sentence spoken summary \
immediately after a driver completes a simulation session.

DRIVER TYPE: {driver_type}
SESSION SCORE: {session_score}/100
SAFE DECISIONS: {safe_pct}%
CONSECUTIVE MISTAKES: {consecutive_mistakes}
DOMINANT FAIL SCENARIO: {dominant_fail_scenario}
DOMINANT BEHAVIORAL PATTERN: {dominant_pattern}
BEHAVIORAL SUMMARY: {behavior_summary}

TONE DIRECTIVE:
{tone_directive}

RULES:
- 2–3 sentences. Spoken aloud. Natural rhythm, not robotic.
- Name the specific pattern you observed — do not generalize.
- If score >= 70, acknowledge what they did right AND name the primary remaining vulnerability.
- If score < 70, name the dominant failure mechanism and one precise counter-action.
- Do NOT use: "Great job", "Well done", "Remember to", "It's important to", "You should always".
- Do NOT start with "I".
- Sound like a psychologist who has watched the session recording, not an AI reading a score.

Write ONLY the spoken narration. No prefix. No quotes."""


_POST_SESSION_VARIANTS = [
    # 3 structural variants to prevent repetition across consecutive sessions
    "Open with the behavioral observation. End with a psychologically-specific instruction.",
    "Open with the cognitive mechanism (why they responded the way they did). Close with the consequence if uncorrected.",
    "Open with what improved or stayed consistent. Pivot to what the data now reveals about their profile.",
]


def build_post_session_prompt(
    driver_type: str,
    session_score: float,
    safe_pct: int,
    consecutive_mistakes: int,
    dominant_fail_scenario: str,
    dominant_pattern: str,
    behavior_summary: str,
    session_id: str,
) -> str:
    """Build a psychologically-adaptive post-session coaching narration prompt."""
    tone = _TONE_DIRECTIVES.get(driver_type, _TONE_DIRECTIVES["unknown"])

    # Use session_id hash to deterministically rotate structural variants
    variant_idx = int(hashlib.md5(session_id.encode()).hexdigest(), 16) % len(_POST_SESSION_VARIANTS)
    structural_hint = _POST_SESSION_VARIANTS[variant_idx]

    return _POST_SESSION_PROMPT.format(
        driver_type=driver_type,
        session_score=round(session_score, 1),
        safe_pct=safe_pct,
        consecutive_mistakes=consecutive_mistakes,
        dominant_fail_scenario=dominant_fail_scenario or "general distraction",
        dominant_pattern=dominant_pattern,
        behavior_summary=behavior_summary,
        tone_directive=f"{tone}\n\nSTRUCTURE: {structural_hint}",
    )


# ── Report executive narration prompt ────────────────────────────────────────

_REPORT_NARRATION_PROMPT = """\
You are a senior behavioral analyst reading an executive summary aloud from a \
Cognitive Behavioral Driving Report.

DRIVER TYPE: {driver_type}
PERSONALITY LABEL: {personality_label}
SAFE DECISION RATE: {safe_pct}%
EXECUTIVE SUMMARY TO NARRATE:
\"\"\"{executive_summary}\"\"\"

TONE DIRECTIVE:
{tone_directive}

RULES:
- Narrate in 3–5 sentences. Spoken. Measured pace.
- Preserve the key psychological findings — do not simplify to clichés.
- Adapt the language to feel spoken, not read. Remove overly academic syntax.
- Begin with the most significant behavioral insight from the summary.
- Close with one specific action the driver should take before their next session.
- Do NOT use: "As your report shows", "According to the data", "Based on this analysis".
- Sound like a cognitive behavioral specialist, not a text-to-speech system.

Write ONLY the spoken narration. No prefix. No quotes."""


def build_report_narration_prompt(
    driver_type: str,
    personality_label: str,
    safe_pct: int,
    executive_summary: str,
) -> str:
    """Build a spoken executive summary narration prompt for a cognitive report."""
    tone = _TONE_DIRECTIVES.get(driver_type, _TONE_DIRECTIVES["unknown"])
    return _REPORT_NARRATION_PROMPT.format(
        driver_type=driver_type,
        personality_label=personality_label,
        safe_pct=safe_pct,
        executive_summary=executive_summary[:600],  # Guard against massive summaries
        tone_directive=tone,
    )


# ── Lesson narration prompt ───────────────────────────────────────────────────

_LESSON_NARRATION_PROMPT = """\
You are a cognitive behavioral therapist narrating a driving safety lesson aloud.

LESSON TITLE: {title}
LESSON CATEGORY: {lesson_category}
DRIVER TYPE: {driver_type}
BEHAVIORAL DIAGNOSIS:
\"\"\"{behavioral_diagnosis}\"\"\"
PSYCHOLOGICAL INTERPRETATION:
\"\"\"{psychological_interpretation}\"\"\"

TONE DIRECTIVE:
{tone_directive}

RULES:
- Narrate in 3–4 sentences. Spoken. Warm but precise.
- Open with the diagnosis (the "what") — the behavioral pattern identified.
- Move to the interpretation (the "why") — the psychological mechanism.
- Close with a single, concrete exercise or mindset shift from the lesson content.
- Do NOT use: "In this lesson", "Today we will", "This lesson covers", "It is important".
- Sound like a therapist who has read the driver's profile, not a narrator reading slides.

Write ONLY the spoken narration. No prefix. No quotes."""


def build_lesson_narration_prompt(
    title: str,
    lesson_category: str,
    driver_type: str,
    behavioral_diagnosis: str,
    psychological_interpretation: str,
) -> str:
    """Build a spoken narration prompt for an AI-generated lesson."""
    tone = _TONE_DIRECTIVES.get(driver_type, _TONE_DIRECTIVES["unknown"])
    return _LESSON_NARRATION_PROMPT.format(
        title=title,
        lesson_category=lesson_category,
        driver_type=driver_type,
        behavioral_diagnosis=behavioral_diagnosis[:400],
        psychological_interpretation=psychological_interpretation[:400],
        tone_directive=tone,
    )
