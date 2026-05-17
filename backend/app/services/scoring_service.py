"""
Scoring Service — extracted from routes/events.py into a proper service.
Single source of truth for decision evaluation logic.
"""

from app.models.behavioral_log import DecisionType
from app.models.event import UserResponseType


def evaluate_decision(
    user_response: UserResponseType,
    response_time: float,
) -> tuple[DecisionType, float]:
    """
    Evaluate a driver's response to a distraction event.

    Scoring matrix:
      safe_ignore / voice_command  → +10  (SAFE_IGNORE)
      no_response                  → -5   (DELAYED_HESITANT)
      interacted < 2s              → -20  (IMPULSIVE_UNSAFE)
      interacted 2–5s              → -15  (RISKY)
      interacted > 5s              → -10  (DELAYED_HESITANT)

    Returns:
        (DecisionType, score_delta)
    """
    is_safe = user_response in (
        UserResponseType.IGNORED,
        UserResponseType.VOICE_COMMAND,
    )

    if is_safe:
        return DecisionType.SAFE_IGNORE, +10.0
    if user_response == UserResponseType.NO_RESPONSE:
        return DecisionType.DELAYED_HESITANT, -5.0
    if response_time < 2.0:
        return DecisionType.IMPULSIVE_UNSAFE, -20.0
    if response_time <= 5.0:
        return DecisionType.RISKY, -15.0
    return DecisionType.DELAYED_HESITANT, -10.0


def score_to_grade(score: float) -> dict:
    """Convert numeric score to grade metadata."""
    if score >= 90:
        return {"label": "Excellent", "color": "green", "message": "Outstanding safety awareness."}
    if score >= 70:
        return {"label": "Good", "color": "yellow", "message": "Good instincts, room to improve."}
    if score >= 50:
        return {"label": "Fair", "color": "orange", "message": "Needs focused practice."}
    return {"label": "Needs Work", "color": "red", "message": "Dangerous patterns detected."}


def clamp_score(score: float, delta: float) -> float:
    """Apply delta and clamp result to [0, 100]."""
    return max(0.0, min(100.0, score + delta))
