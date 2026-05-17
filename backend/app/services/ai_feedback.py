"""
AI Feedback Engine (upgraded).

Replaces the old if/elif decision tree with a real LLM call.
Falls back to rule-based text if LLM is unavailable.
Used by the /api/progress/me endpoint for end-of-session feedback.
"""

import asyncio
import logging
from typing import List

logger = logging.getLogger(__name__)


async def generate_feedback_async(
    recent_logs: List[dict],
    user_profile_type: str,
    behavior_summary: str = "",
) -> str:
    """
    Async version — calls real LLM for personalized behavioral coaching feedback.
    Falls back to rule-based if no LLM is configured.
    """
    from app.services.llm_provider import llm_provider

    if not recent_logs:
        return (
            "Complete your first simulation session to receive personalized "
            "AI-powered behavioral feedback."
        )

    safe_count = sum(
        1 for log in recent_logs
        if log.get("decision_type") in ("safe_ignore", "acceptable")
    )
    impulsive_count = sum(
        1 for log in recent_logs if log.get("decision_type") == "impulsive_unsafe"
    )
    risky_count = sum(
        1 for log in recent_logs if log.get("decision_type") == "risky"
    )
    total = len(recent_logs)
    safe_ratio = safe_count / total if total > 0 else 0.0

    prompt = f"""You are an AI driving safety coach giving a driver their end-of-session behavioral report.

SESSION STATS:
- Total decisions: {total}
- Safe decisions: {safe_count} ({int(safe_ratio * 100)}%)
- Impulsive unsafe decisions: {impulsive_count}
- Risky decisions: {risky_count}
- Driver profile: {user_profile_type}
- Behavioral pattern: {behavior_summary or 'not available'}

Write a 2-3 sentence personalized coaching summary.
Be direct, empathetic, and specific to their pattern.
Do NOT be generic. Reference their specific behavior type.
Maximum 60 words."""

    try:
        resp = await asyncio.wait_for(
            llm_provider.complete(prompt, agent_type="instructor", max_tokens=100, temperature=0.7),
            timeout=8.0,
        )
        if resp.provider != "fallback":
            return resp.text
    except Exception as e:
        logger.warning("LLM feedback generation failed: %s", e)

    # Rule-based fallback
    return _rule_based_feedback(safe_ratio, safe_count, impulsive_count, risky_count, total)


def generate_feedback(recent_logs: List[dict], user_profile_type: str) -> str:
    """
    Synchronous wrapper kept for backward compatibility with /api/progress/me.
    Runs the async version in a new event loop if needed.
    """
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # Inside async context — return rule-based to avoid blocking
            return _rule_based_feedback_from_logs(recent_logs)
        return loop.run_until_complete(
            generate_feedback_async(recent_logs, user_profile_type)
        )
    except Exception:
        return _rule_based_feedback_from_logs(recent_logs)


def _rule_based_feedback_from_logs(recent_logs: List[dict]) -> str:
    if not recent_logs:
        return "Complete your first session to receive feedback."
    total = len(recent_logs)
    safe_count = sum(
        1 for log in recent_logs
        if log.get("decision_type") in ("safe_ignore", "acceptable")
    )
    impulsive = sum(1 for log in recent_logs if log.get("decision_type") == "impulsive_unsafe")
    risky = sum(1 for log in recent_logs if log.get("decision_type") == "risky")
    return _rule_based_feedback(safe_count / total if total else 0, safe_count, impulsive, risky, total)


def _rule_based_feedback(
    safe_ratio: float,
    safe_count: int,
    impulsive_count: int,
    risky_count: int,
    total: int,
) -> str:
    if safe_ratio == 1.0:
        return (
            "Outstanding performance. You demonstrated perfect situational awareness "
            "and ignored every distraction without hesitation. This is the gold standard of safe driving."
        )
    if impulsive_count > 0:
        return (
            f"You reacted impulsively to {impulsive_count} distraction(s). "
            "This pattern indicates you prioritize incoming information over road safety. "
            "Practice the 'commit to ignore' technique before your next session."
        )
    if risky_count > 0:
        return (
            f"You interacted with {risky_count} distraction(s) at a dangerous moment. "
            "Remember: any screen interaction while moving multiplies accident risk by 23x. "
            "Build a habit of pulling over before responding."
        )
    return (
        f"You made safe choices {safe_count} out of {total} times. "
        "Consistency is the goal — aim for zero unsafe interactions in your next session."
    )
