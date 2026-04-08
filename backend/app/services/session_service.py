"""
Session service — business logic for creating and managing simulation sessions.
"""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.session import Session


async def create_session(db: AsyncSession, user_id: str) -> Session:
    """
    Create a new simulation session for a user.
    Score starts at 100.0 (perfect score, deducted as errors are made).
    """
    session = Session(user_id=user_id, score=100.0)
    db.add(session)
    await db.flush()
    await db.refresh(session)
    return session


async def get_session_by_id(db: AsyncSession, session_id: str) -> Optional[Session]:
    """Fetch a session by its UUID."""
    result = await db.execute(select(Session).where(Session.id == session_id))
    return result.scalar_one_or_none()


async def end_session(db: AsyncSession, session_id: str) -> Optional[Session]:
    """Mark a session as complete by setting end_time."""
    session = await get_session_by_id(db, session_id)
    if session is None:
        return None
    session.end_time = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(session)
    return session


async def update_session_score(
    db: AsyncSession, session_id: str, delta: float
) -> Optional[Session]:
    """
    Adjust session score by delta (+/-).
    Score is clamped to [0, 100].
    """
    session = await get_session_by_id(db, session_id)
    if session is None:
        return None
    session.score = max(0.0, min(100.0, session.score + delta))
    await db.flush()
    await db.refresh(session)
    return session
