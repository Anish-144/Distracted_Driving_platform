"""
Prompt Templates — overhauled for behavioral realism.

Key improvements over v1:
- Profile-adaptive framing (5 driver types × 2 agents = 10 variants)
- Anti-repetition via session transcript injection
- Output constraint enforcement with negative examples
- Hesitation context injection
- Behavioral pattern specificity
"""

# ── Distraction context labels ─────────────────────────────────────────────────

DISTRACTION_LABELS = {
    "incoming_call":         "incoming phone call",
    "whatsapp_notification": "WhatsApp message",
    "gps_rerouting":         "GPS rerouting alert",
    "email_alert":           "email notification",
    "social_media":          "social media alert",
}

DECISION_LABELS = {
    "safe_ignore":       "ignored the distraction",
    "acceptable":        "handled it acceptably",
    "impulsive_unsafe":  "reacted and interacted within 2 seconds",
    "risky":             "interacted with the distraction",
    "delayed_hesitant":  "hesitated for over 5 seconds before deciding",
}

PROFILE_DESCRIPTIONS = {
    "impulsive":       "reacts before thinking — decisions are reflexes",
    "overconfident":   "believes they can multitask; underestimates risk",
    "anxious":         "freezes under pressure; slow to commit",
    "distractible":    "easily pulled by novelty; low attention resistance",
    "rule_following":  "disciplined by default but socially pressured",
    "unknown":         "profile not yet established",
}

# ── Profile-specific instructor framing ───────────────────────────────────────

INSTRUCTOR_FRAMING = {
    "impulsive": {
        "safe_focus":   "acknowledge their restraint — it's genuinely hard for them",
        "unsafe_focus": "name the speed of the reaction, not just the outcome",
    },
    "overconfident": {
        "safe_focus":   "keep it neutral — don't over-praise; they'll get complacent",
        "unsafe_focus": "make clear their confidence was a liability, not an asset",
    },
    "anxious": {
        "safe_focus":   "reinforce that inaction under pressure was the right call",
        "unsafe_focus": "address the hesitation itself — the pause cost them",
    },
    "distractible": {
        "safe_focus":   "name that they broke the pull — that's the hard part",
        "unsafe_focus": "make them aware of the automatic pull response",
    },
    "rule_following": {
        "safe_focus":   "affirm their instinct — that discipline is real",
        "unsafe_focus": "hold up the contradiction — they chose to break their own standard",
    },
    "unknown": {
        "safe_focus":   "brief positive reinforcement",
        "unsafe_focus": "direct correction",
    },
}

# ── Authority framing by profile ───────────────────────────────────────────────

AUTHORITY_FRAMING = {
    "impulsive":      "cite the speed of the reaction as a legal indicator of recklessness",
    "overconfident":  "use statistics to counter the belief that skill reduces risk",
    "anxious":        "reference extended distraction duration during hesitation",
    "distractible":   "reference the pattern — this is not a first incident",
    "rule_following": "reference the contradiction between knowledge and choice",
    "unknown":        "cite a specific legal consequence or accident statistic",
}


# ── INSTRUCTOR PROMPT (post-decision coaching) ─────────────────────────────────

INSTRUCTOR_PROMPT = """\
You are a driving instructor giving a single spoken line immediately after a driver's decision.

DRIVER PROFILE: {profile_description}
COACHING FOCUS: {coaching_focus}
DISTRACTION: {distraction_label}
DECISION MADE: {decision_label}
REACTION TIME: {response_time}s
SCORE CHANGE: {score_delta:+.0f} pts (session total: {session_score:.0f}/100)
CONSECUTIVE MISTAKES: {consecutive_mistakes}
RECENT DIALOGUE THIS SESSION: {recent_dialogue}

RULES — read these carefully:
- ONE sentence only. Hard stop.
- Under 15 words.
- Do NOT repeat anything in recent dialogue above.
- Do NOT start with: "Good job", "Well done", "I understand", "Remember", "Always"
- Do NOT explain or lecture.
- Sound like a human instructor in the car, not an AI assistant.
- Reference the specific situation — no generic safety platitudes.

FORBIDDEN phrases: "stay focused", "eyes on the road", "great job", "as an AI",
"it's important to", "remember to always", "of course".

Write ONLY the instructor's line. No quotes. No prefix."""


# ── AUTHORITY PROMPT (consequence-focused, escalating) ────────────────────────

AUTHORITY_PROMPT = """\
You are a road safety enforcement officer reviewing a driver's decision in simulation.

DRIVER PROFILE: {profile_description}
ENFORCEMENT ANGLE: {authority_framing}
DISTRACTION: {distraction_label}
REACTION TIME: {response_time}s
CONSECUTIVE VIOLATIONS THIS SESSION: {consecutive_mistakes}
PRESSURE LEVEL: {pressure_level}/3
RECENT AUTHORITY STATEMENTS: {recent_dialogue}

RULES — non-negotiable:
- ONE sentence only.
- Under 15 words.
- Do NOT repeat anything from recent statements above.
- Cite a SPECIFIC consequence: a number, a law, a statistic, or a precedent.
- No exclamation marks. Stern. Factual.
- Sound like an officer, not a chatbot.
- Escalate tone with pressure level: 1=firm, 2=serious, 3=severe.

FORBIDDEN: "stay safe", "be careful", "it's important", "as an authority",
"I would like to", "please remember".

Write ONLY the officer's statement. No quotes. No prefix."""


# ── Builder functions ─────────────────────────────────────────────────────────

def build_instructor_prompt(
    event_type: str,
    decision_type: str,
    response_time: float,
    score_delta: float,
    session_score: float,
    driver_profile: str,
    consecutive_mistakes: int,
    recent_dialogue: str,
) -> str:
    is_safe = decision_type in ("safe_ignore", "acceptable")
    framing = INSTRUCTOR_FRAMING.get(driver_profile, INSTRUCTOR_FRAMING["unknown"])
    coaching_focus = framing["safe_focus"] if is_safe else framing["unsafe_focus"]

    return INSTRUCTOR_PROMPT.format(
        profile_description=PROFILE_DESCRIPTIONS.get(driver_profile, PROFILE_DESCRIPTIONS["unknown"]),
        coaching_focus=coaching_focus,
        distraction_label=DISTRACTION_LABELS.get(event_type, event_type),
        decision_label=DECISION_LABELS.get(decision_type, decision_type),
        response_time=round(response_time, 1),
        score_delta=score_delta,
        session_score=session_score,
        consecutive_mistakes=consecutive_mistakes,
        recent_dialogue=recent_dialogue or "None yet.",
    )


def build_authority_prompt(
    event_type: str,
    response_time: float,
    consecutive_mistakes: int,
    driver_profile: str,
    pressure_level: int,
    recent_dialogue: str,
) -> str:
    return AUTHORITY_PROMPT.format(
        profile_description=PROFILE_DESCRIPTIONS.get(driver_profile, PROFILE_DESCRIPTIONS["unknown"]),
        authority_framing=AUTHORITY_FRAMING.get(driver_profile, AUTHORITY_FRAMING["unknown"]),
        distraction_label=DISTRACTION_LABELS.get(event_type, event_type),
        response_time=round(response_time, 1),
        consecutive_mistakes=consecutive_mistakes,
        pressure_level=pressure_level,
        recent_dialogue=recent_dialogue or "None yet.",
    )


# ── PSYCHOGRAPHIC COACHING PROMPT ─────────────────────────────────────────────
# Uses personality trait scores for deeply personalized, non-generic coaching.

PSYCHOGRAPHIC_COACHING_PROMPT = """\
You are a cognitive behavioral specialist coaching a driver after their decision in simulation.

PSYCHOLOGICAL TRAIT PROFILE (from onboarding assessment):
{trait_context}

SELF-AWARENESS SCORE: {self_awareness_score:.0%} (how accurately they know themselves)
BEHAVIORAL PROFILE LABEL: {profile_label}
CONSISTENCY FLAGS: {consistency_flags}

SIMULATION CONTEXT:
Distraction: {distraction_label}
Decision: {decision_label}
Reaction time: {response_time}s
Consecutive mistakes: {consecutive_mistakes}
Score delta: {score_delta:+.0f} pts
Recent session dialogue: {recent_dialogue}

COACHING RULES:
- ONE sentence only. Maximum 18 words.
- Reference their SPECIFIC psychological trait, not just the decision outcome.
- If they have low self-awareness (score < 0.5) AND made an unsafe decision, call out the cognitive gap.
- If they have high impulsiveness AND reacted fast, specifically name the impulse mechanism.
- Do NOT use: "good job", "well done", "remember", "always", "try to".
- Sound like a psychologist who knows their profile — not a generic driving instructor.
- No platitudes. No generic safety advice.

Write ONLY the coaching line. No quotes. No prefix."""


PSYCHOGRAPHIC_PRESSURE_PROMPT = """\
You are a passenger in a car creating social/emotional pressure during a distraction event.

DRIVER PSYCHOLOGICAL PROFILE:
{trait_context}

SCENARIO CONTEXT:
{narrative_context}

EMOTIONAL PRESSURE TYPE TO USE: {emotional_pressure_type}
TARGET PSYCHOLOGICAL WEAKNESS: {target_weakness}
URGENCY LEVEL: {urgency_level}/3

RULES:
- ONE sentence only. Sound like a real person, not a warning system.
- Exploit the {emotional_pressure_type} pressure specifically — be psychologically realistic.
- If urgency is 3, be genuinely urgent and emotionally pointed.
- If urgency is 1, be subtle — just a gentle nudge, not dramatic.
- No robotic phrases like "You should check this" or "This might be important."
- Sound human. Sound present. Sound real.

Write ONLY the passenger's spoken line. No quotes. No prefix."""


def build_psychographic_coaching_prompt(
    event_type: str,
    decision_type: str,
    response_time: float,
    score_delta: float,
    consecutive_mistakes: int,
    recent_dialogue: str,
    trait_context: str,
    profile_label: str,
    self_awareness_score: float,
    consistency_flags: list[str],
) -> str:
    """Build a psychographically personalized coaching prompt using personality trait data."""
    flags_str = "; ".join(consistency_flags) if consistency_flags else "No behavioral inconsistencies detected."
    return PSYCHOGRAPHIC_COACHING_PROMPT.format(
        trait_context=trait_context or "Unknown cognitive profile.",
        profile_label=profile_label,
        self_awareness_score=self_awareness_score,
        consistency_flags=flags_str,
        distraction_label=DISTRACTION_LABELS.get(event_type, event_type),
        decision_label=DECISION_LABELS.get(decision_type, decision_type),
        response_time=round(response_time, 1),
        score_delta=score_delta,
        consecutive_mistakes=consecutive_mistakes,
        recent_dialogue=recent_dialogue or "None yet.",
    )


def build_psychographic_pressure_prompt(
    narrative_context: str,
    trait_context: str,
    emotional_pressure_type: str,
    target_weakness: str,
    urgency_level: int,
) -> str:
    """Build a psychographically-targeted passenger pressure prompt."""
    return PSYCHOGRAPHIC_PRESSURE_PROMPT.format(
        trait_context=trait_context or "Unknown cognitive profile.",
        narrative_context=narrative_context,
        emotional_pressure_type=emotional_pressure_type,
        target_weakness=target_weakness,
        urgency_level=urgency_level,
    )
