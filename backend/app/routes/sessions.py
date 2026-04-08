"""
Session routes — create and retrieve simulation sessions.

Endpoints:
  POST /api/session/create      — Start a new simulation session
  GET  /api/session/{id}         — Get session details by ID
  POST /api/session/{id}/end     — End/close an active session
  GET  /api/session/{id}/score   — Get current score for a session
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
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
