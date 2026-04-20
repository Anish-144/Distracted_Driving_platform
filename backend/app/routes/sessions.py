"""
Session routes — create and retrieve simulation sessions.

Endpoints:
  POST /api/session/create      — Start a new simulation session
  GET  /api/session/latest      — Get most recent session stats (MUST be before /{id})
  GET  /api/session/{id}         — Get session details by ID
  POST /api/session/{id}/end     — End/close an active session
  POST /api/session/{id}/complete — Alias for end
  GET  /api/session/{id}/score   — Get current score for a session
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.session import Session as DBSession
from app.models.event import Event, UserResponseType
from app.routes.auth import get_current_user
from app.services import session_service

router = APIRouter(prefix="/api/session", tags=["Sessions"])


# ─── Pydantic Schemas ──────────────────────────────────────────────────────────

class SessionResponse(BaseModel):
    id: str
    user_id: str
    score: float
    start_time: str
    end_time: str | None


class ScoreResponse(BaseModel):
    session_id: str
    score: float
    message: str

class LatestSessionResponse(BaseModel):
    id: str | None
    score: float
    avg_reaction_time: float
    driver_type: str
    mistakes: List[dict]


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.post("/create", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new simulation session for the authenticated user."""
    session = await session_service.create_session(db, user_id=current_user.id)
    return SessionResponse(
        id=session.id,
        user_id=session.user_id,
        score=session.score,
        start_time=session.start_time.isoformat(),
        end_time=session.end_time.isoformat() if session.end_time else None,
    )


# ─── IMPORTANT: /latest MUST be declared before /{session_id} ─────────────────
# FastAPI routes are matched top-to-bottom. If /{session_id} comes first,
# the string "latest" would be captured as a path parameter, making this route
# permanently unreachable.

@router.get("/latest", response_model=LatestSessionResponse)
async def get_latest_session(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch the most recent session's stats for the dashboard."""
    stmt = (
        select(DBSession)
        .where(DBSession.user_id == current_user.id)
        .order_by(desc(DBSession.start_time))
        .limit(1)
    )
    result = await db.execute(stmt)
    latest = result.scalar_one_or_none()

    if not latest:
        return LatestSessionResponse(
            id=None,
            score=0.0,
            avg_reaction_time=0.0,
            driver_type=current_user.profile_type.value.replace("_", " ").title(),
            mistakes=[]
        )

    event_stmt = select(Event).where(Event.session_id == latest.id)
    event_result = await db.execute(event_stmt)
    events = event_result.scalars().all()

    avg_reaction_time = 0.0
    valid_times = [e.response_time for e in events if e.response_time is not None]
    if valid_times:
        avg_reaction_time = round(sum(valid_times) / len(valid_times), 2)

    mistakes = []
    for e in events:
        if e.user_response == UserResponseType.INTERACTED:
            mistakes.append({
                "scenario": e.event_type.value,
                "response": "Unsafe Interaction"
            })

    return LatestSessionResponse(
        id=latest.id,
        score=latest.score,
        avg_reaction_time=avg_reaction_time,
        driver_type=current_user.profile_type.value.replace("_", " ").title(),
        mistakes=mistakes
    )


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a session by ID — only accessible by the session owner."""
    session = await session_service.get_session_by_id(db, session_id)
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return SessionResponse(
        id=session.id,
        user_id=session.user_id,
        score=session.score,
        start_time=session.start_time.isoformat(),
        end_time=session.end_time.isoformat() if session.end_time else None,
    )


@router.post("/{session_id}/end", response_model=SessionResponse)
async def end_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a session as complete."""
    session = await session_service.get_session_by_id(db, session_id)
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    updated = await session_service.end_session(db, session_id)
    return SessionResponse(
        id=updated.id,
        user_id=updated.user_id,
        score=updated.score,
        start_time=updated.start_time.isoformat(),
        end_time=updated.end_time.isoformat() if updated.end_time else None,
    )


@router.post("/{session_id}/complete", response_model=SessionResponse)
async def complete_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Alias to mark a session as complete.
    Calls session_service directly (not the route handler) to avoid FastAPI injection issues.
    """
    session = await session_service.get_session_by_id(db, session_id)
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    updated = await session_service.end_session(db, session_id)
    return SessionResponse(
        id=updated.id,
        user_id=updated.user_id,
        score=updated.score,
        start_time=updated.start_time.isoformat(),
        end_time=updated.end_time.isoformat() if updated.end_time else None,
    )


@router.get("/{session_id}/score", response_model=ScoreResponse)
async def get_score(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the current score for a session."""
    session = await session_service.get_session_by_id(db, session_id)
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    score = session.score
    if score >= 90:
        message = "Excellent! You're driving safely. 🟢"
    elif score >= 70:
        message = "Good, but watch out for distractions. 🟡"
    elif score >= 50:
        message = "Needs improvement — stay focused! 🟠"
    else:
        message = "Dangerous driving behavior detected. 🔴"

    return ScoreResponse(session_id=session_id, score=score, message=message)
