"""
AI Feedback Engine — mock service to generate structured behavioral feedback 
based on recent behavioral logs. Later can be replaced with an LLM call.
"""

from typing import List

def generate_feedback(recent_logs: List[dict], user_profile_type: str) -> str:
    """
    Generate 2-3 line corrective advice based on behavioral logs.
    If no logs exist, return generic safety advice.
    """
    if not recent_logs:
        return "You have no recorded logs yet. Focus on maintaining a safe following distance and staying alert to changing road conditions."

    # Tally up mistakes
    safe_count = sum(1 for log in recent_logs if log.get("decision_type") in ("SAFE_IGNORE", "ACCEPTABLE"))
    impulsive_count = sum(1 for log in recent_logs if log.get("decision_type") == "IMPULSIVE_UNSAFE")
    delayed_count = sum(1 for log in recent_logs if log.get("decision_type") == "DELAYED_HESITANT")
    risky_count = sum(1 for log in recent_logs if log.get("decision_type") == "RISKY")

    total_logs = len(recent_logs)
    safe_ratio = safe_count / total_logs

    if safe_ratio == 1.0:
        return "Excellent driving behavior. You demonstrated strong situational awareness and perfectly ignored distractions. Keep up the high standard of safety on the road."

    if impulsive_count > 0:
        return "You are reacting too quickly to distractions. This indicates impulsive driving behavior. Focus on delaying responses and prioritizing road awareness."

    if delayed_count > 0:
        return "You showed hesitation when facing distractions, taking longer than ideal to recover attention. Act decisively to maintain your focus on the road."

    if risky_count > 0:
        return "You interacted with distractions at a dangerous time. Any interaction takes your eyes off the road. Remember that no message or call is more important than your safety."

    # Fallback
    return "Your responses suggest slight distractibility. Try to implement a zero-tolerance policy for device usage while driving."
