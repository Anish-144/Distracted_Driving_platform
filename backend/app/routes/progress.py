"""
Progress routes — fetch user progression, analytics, and dynamic AI feedback.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from pydantic import BaseModel
from typing import List, Optional

from app.database import get_db
from app.models.user import User, ProfileType
from app.models.session import Session
from app.models.behavioral_log import BehavioralLog, DecisionType
from app.models.event import Event, UserResponseType
from app.routes.auth import get_current_user
from app.services.ai_feedback import generate_feedback

router = APIRouter(prefix="/api/progress", tags=["Progress"])


class SessionTimelineEntry(BaseModel):
    session_id: str
    timestamp: str
    score: float
    avg_reaction_time: float

class ProgressResponse(BaseModel):
    total_sessions: int
    avg_score: float
    improvement_rate: float
    driver_type: str
    ai_feedback: str
    avg_reaction_time: float
    percentile: int
    mistakes: List[dict]
    timeline: List[SessionTimelineEntry]


@router.get("/me", response_model=ProgressResponse)
async def get_my_progress(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Compute dynamic progress stats and generate AI feedback based on latest session logs.
    """
    # Fetch all user sessions ordered by time
    stmt = select(Session).where(
        Session.user_id == current_user.id,
        Session.end_time.isnot(None)
    ).order_by(Session.created_at)
    result = await db.execute(stmt)
    sessions = result.scalars().all()

    total_sessions = len(sessions)
    if total_sessions == 0:
        return ProgressResponse(
            total_sessions=0,
            avg_score=0.0,
            improvement_rate=0.0,
            driver_type=current_user.profile_type.value,
            ai_feedback="Complete your first simulation session to receive AI feedback and analytics.",
            avg_reaction_time=0.0,
            percentile=50,
            mistakes=[],
            timeline=[]
        )

    # Compute averages
    avg_score = sum(s.score for s in sessions) / total_sessions
    
    # Compute improvement rate (latest score - first score)
    first_score = sessions[0].score
    latest_score = sessions[-1].score
    improvement_rate = latest_score - first_score if total_sessions > 1 else 0.0

    # Fetch logs for the latest session to compute AI feedback
    latest_session = sessions[-1]
    log_stmt = select(BehavioralLog).where(BehavioralLog.session_id == latest_session.id)
    log_result = await db.execute(log_stmt)
    logs = log_result.scalars().all()

    # Convert logs to simple dicts for the service
    recent_logs = []
    impulsive_count = 0
    delayed_count = 0

    for log in logs:
        recent_logs.append({"decision_type": log.decision_type.value})
        if log.decision_type == DecisionType.IMPULSIVE_UNSAFE:
            impulsive_count += 1
        elif log.decision_type == DecisionType.DELAYED_HESITANT:
            delayed_count += 1

    # Profile type updating is now handled safely during session completion,
    # NOT in this GET endpoint to avoid mutation antipatterns.

    # Fetch events to compute avg reaction time and grab mistakes
    event_stmt = select(Event).where(Event.session_id == latest_session.id)
    event_result = await db.execute(event_stmt)
    events = event_result.scalars().all()

    avg_reaction_time = 0.0
    valid_times = [e.response_time for e in events if e.response_time is not None]
    if valid_times:
        avg_reaction_time = sum(valid_times) / len(valid_times)

    mistakes = []
    for e in events:
        if e.user_response == UserResponseType.INTERACTED:
            mistakes.append({
                "scenario": e.event_type.value,
                "response": "Interacted safely" if e.response_time is not None and e.response_time < 2 else "Unsafe Interaction"
            })

    ai_feedback = generate_feedback(recent_logs, current_user.profile_type.value)

    # Compute a real authoritative percentile based on average score vs an idealized baseline
    # (In a true production environment, this would query a materialized view of ALL users' average scores)
    # For now, we ground it mathematically to the backend so it's consistent across devices.
    composite_score = (avg_score * 0.4) + (latest_score * 0.6)
    import math
    raw_p = 100 / (1 + math.exp(-0.1 * (composite_score - 65)))
    percentile = max(1, min(99, int(round(raw_p))))

    # Build timeline for frontend rendering
    timeline = []
    for s in sessions:
        timeline.append(
            SessionTimelineEntry(
                session_id=s.id,
                timestamp=s.created_at.isoformat(),
                score=s.score,
                avg_reaction_time=0.0 # Could do a join to get this per session, but keeping lightweight for MVP
            )
        )

    return ProgressResponse(
        total_sessions=total_sessions,
        avg_score=round(avg_score, 1),
        improvement_rate=round(improvement_rate, 1),
        driver_type=current_user.profile_type.value.replace("_", " ").title(),
        ai_feedback=ai_feedback,
        avg_reaction_time=round(avg_reaction_time, 2),
        percentile=percentile,
        mistakes=mistakes,
        timeline=timeline
    )
