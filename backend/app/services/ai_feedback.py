"""
AI Feedback Engine — generates structured behavioral feedback
based on recent behavioral logs. Can be replaced with an LLM call later.
"""

from typing import List


def generate_feedback(recent_logs: List[dict], user_profile_type: str) -> str:
    """
    Generate 2-3 line corrective advice based on behavioral logs.
    If no logs exist, return generic safety advice.

    NOTE: DecisionType enum values are lowercase snake_case:
      safe_ignore, impulsive_unsafe, delayed_hesitant, risky, acceptable
    """
    if not recent_logs:
        return (
            "You have no recorded logs yet. Focus on maintaining a safe following distance "
            "and staying alert to changing road conditions."
        )

    # Tally decisions — match against lowercase enum values from DecisionType
    safe_count = sum(
        1 for log in recent_logs
        if log.get("decision_type") in ("safe_ignore", "acceptable")
    )
    impulsive_count = sum(
        1 for log in recent_logs
        if log.get("decision_type") == "impulsive_unsafe"
    )
    delayed_count = sum(
        1 for log in recent_logs
        if log.get("decision_type") == "delayed_hesitant"
    )
    risky_count = sum(
        1 for log in recent_logs
        if log.get("decision_type") == "risky"
    )

    total_logs = len(recent_logs)
    safe_ratio = safe_count / total_logs if total_logs > 0 else 0.0

    if safe_ratio == 1.0:
        return (
            "Excellent driving behavior. You demonstrated strong situational awareness and "
            "perfectly ignored all distractions. Keep up the high standard of safety on the road."
        )

    if impulsive_count > 0:
        return (
            "You are reacting too quickly to distractions. This indicates impulsive driving behavior. "
            "Focus on delaying responses and prioritizing road awareness over notifications."
        )

    if risky_count > 0:
        return (
            "You interacted with distractions at a dangerous time. Any interaction takes your eyes "
            "off the road. Remember that no message or call is more important than your safety."
        )

    if delayed_count > 0:
        return (
            "You showed hesitation when facing distractions, taking longer than ideal to recover "
            "attention. Act decisively — ignore the distraction immediately and refocus on the road."
        )

    # Partial safe behavior
    return (
        f"You made safe choices {safe_count} out of {total_logs} times. "
        "Try to implement a zero-tolerance policy for device usage while driving to improve your score."
    )
