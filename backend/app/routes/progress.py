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
from app.models.user_lesson import UserLesson
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
    lessons_completed: int
    lesson_streak: int
    lesson_completion_rate: float


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

    # True authoritative population percentile based on unique users
    user_scores_subq = (
        select(
            Session.user_id,
            func.avg(Session.score).label("avg_user_score")
        )
        .where(Session.end_time.isnot(None))
        .group_by(Session.user_id)
        .subquery()
    )

    ranked_users = (
        select(
            user_scores_subq.c.user_id,
            func.percent_rank().over(
                order_by=user_scores_subq.c.avg_user_score.asc()
            ).label("percentile_rank")
        )
        .subquery()
    )

    stmt_rank = select(ranked_users.c.percentile_rank).where(ranked_users.c.user_id == current_user.id)
    rank_result = await db.execute(stmt_rank)
    percentile_rank_fraction = rank_result.scalar()

    if percentile_rank_fraction is None:
        percentile = 50
    else:
        percentile = max(1, min(99, int(round(percentile_rank_fraction * 100))))

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

    # ── Lesson Metrics ────────────────────────────────────────────────────────
    lesson_stmt = select(UserLesson).where(UserLesson.user_id == current_user.id).order_by(desc(UserLesson.completed_at))
    lesson_result = await db.execute(lesson_stmt)
    user_lessons = lesson_result.scalars().all()

    total_lessons = len(user_lessons)
    completed_lessons = [l for l in user_lessons if l.completed and l.completed_at]
    lessons_completed_count = len(completed_lessons)
    lesson_completion_rate = (lessons_completed_count / total_lessons * 100) if total_lessons > 0 else 0.0

    # Streak calculation
    # A streak is consecutive days (up to today or yesterday) where at least one lesson was completed.
    from datetime import datetime, timezone, timedelta
    lesson_streak = 0
    if completed_lessons:
        today = datetime.now(timezone.utc).date()
        # Get unique dates of completion, sorted descending
        completion_dates = sorted(list(set([l.completed_at.date() for l in completed_lessons])), reverse=True)
        
        # Check if the streak is active (completed today or yesterday)
        if completion_dates and (today - completion_dates[0]).days <= 1:
            lesson_streak = 1
            current_date = completion_dates[0]
            for d in completion_dates[1:]:
                if (current_date - d).days == 1:
                    lesson_streak += 1
                    current_date = d
                else:
                    break

    return ProgressResponse(
        total_sessions=total_sessions,
        avg_score=round(avg_score, 1),
        improvement_rate=round(improvement_rate, 1),
        driver_type=current_user.profile_type.value.replace("_", " ").title(),
        ai_feedback=ai_feedback,
        avg_reaction_time=round(avg_reaction_time, 2),
        percentile=percentile,
        mistakes=mistakes,
        timeline=timeline,
        lessons_completed=lessons_completed_count,
        lesson_streak=lesson_streak,
        lesson_completion_rate=round(lesson_completion_rate, 1)
    )



# ── Leaderboard Endpoint ──────────────────────────────────────────────────────

class LeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    display_name: str
    driver_type: str
    avg_score: float
    improvement_pct: float
    sessions_completed: int
    composite_score: float
    is_current_user: bool


class LeaderboardResponse(BaseModel):
    entries: List[LeaderboardEntry]
    total_participants: int
    is_limited_pool: bool
    pool_note: str
    current_user_rank: Optional[int]


@router.get("/leaderboard", response_model=LeaderboardResponse)
async def get_leaderboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Global leaderboard ranked by composite behavioral safety score.

    Composite = avg_safety_score * 0.50 + improvement_trend * 0.30 + sessions_weight * 0.20

    Uses real user data only. Shows pool note when participants are few.
    User isolation: only aggregate stats are exposed (no behavioral details of other users).
    """
    # Fetch all users with at least one completed session, grouped stats
    sessions_result = await db.execute(
        select(
            Session.user_id,
            func.count(Session.id).label("session_count"),
            func.avg(Session.score).label("avg_score"),
        )
        .where(Session.end_time.isnot(None))
        .group_by(Session.user_id)
    )
    session_stats = sessions_result.fetchall()

    if not session_stats:
        return LeaderboardResponse(
            entries=[],
            total_participants=0,
            is_limited_pool=True,
            pool_note="No participants yet. Be the first to complete a simulation!",
            current_user_rank=None,
        )

    entries_raw = []
    for stat in session_stats:
        uid, session_count, avg_score = stat

        # Get first session score for improvement calculation
        first_result = await db.execute(
            select(Session.score)
            .where(Session.user_id == uid, Session.end_time.isnot(None))
            .order_by(Session.created_at)
            .limit(1)
        )
        first_score = first_result.scalar() or avg_score

        # Get latest session score
        latest_result = await db.execute(
            select(Session.score)
            .where(Session.user_id == uid, Session.end_time.isnot(None))
            .order_by(desc(Session.created_at))
            .limit(1)
        )
        latest_score = latest_result.scalar() or avg_score

        # Get user display info
        user_result = await db.execute(
            select(User.id, User.name, User.profile_type).where(User.id == uid)
        )
        user_row = user_result.fetchone()
        if not user_row:
            continue

        user_id, user_name, profile_type = user_row

        # Compute improvement %
        improvement_pct = 0.0
        if first_score and first_score > 0:
            improvement_pct = ((latest_score - first_score) / first_score) * 100

        # Composite score: avg_safety 50% + improvement 30% + sessions_weight 20%
        sessions_weight = min(session_count / 10.0, 1.0) * 100
        improvement_normalized = min(max(improvement_pct, -50), 100)
        composite = (
            (avg_score or 0) * 0.50 +
            ((improvement_normalized + 50) / 150) * 100 * 0.30 +
            sessions_weight * 0.20
        )

        display_name = (user_name or "Driver").split()[0]
        entries_raw.append({
            "user_id": user_id,
            "display_name": display_name,
            "driver_type": (profile_type.value if hasattr(profile_type, "value") else str(profile_type)).replace("_", " ").title(),
            "avg_score": round(avg_score or 0, 1),
            "improvement_pct": round(improvement_pct, 1),
            "sessions_completed": session_count,
            "composite_score": round(composite, 2),
        })

    entries_raw.sort(key=lambda x: x["composite_score"], reverse=True)
    total_participants = len(entries_raw)
    is_limited_pool = total_participants < 5
    pool_note = (
        "Based on current active participants."
        if is_limited_pool
        else f"Ranked across {total_participants} active SafeDrive AI participants."
    )

    current_user_rank = None
    entries = []
    for rank_idx, raw in enumerate(entries_raw, start=1):
        is_cu = raw["user_id"] == current_user.id
        if is_cu:
            current_user_rank = rank_idx
        entries.append(LeaderboardEntry(
            rank=rank_idx,
            user_id=raw["user_id"],
            display_name=raw["display_name"],
            driver_type=raw["driver_type"],
            avg_score=raw["avg_score"],
            improvement_pct=raw["improvement_pct"],
            sessions_completed=raw["sessions_completed"],
            composite_score=raw["composite_score"],
            is_current_user=is_cu,
        ))

    return LeaderboardResponse(
        entries=entries,
        total_participants=total_participants,
        is_limited_pool=is_limited_pool,
        pool_note=pool_note,
        current_user_rank=current_user_rank,
    )

