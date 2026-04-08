"""
Event routes — record user responses to distraction events.

Endpoints:
  POST /api/event             — Log a user's response to a distraction event
  GET  /api/event/{id}        — Get event details by ID
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.models.event import Event, EventType, UserResponseType
from app.models.behavioral_log import BehavioralLog, DecisionType
from app.routes.auth import get_current_user
from app.services import session_service

router = APIRouter(prefix="/api/event", tags=["Events"])


# ─── Pydantic Schemas ──────────────────────────────────────────────────────────

class PostEventRequest(BaseModel):
    session_id: str
    event_type: EventType
    user_response: UserResponseType
    response_time: float  # seconds since event triggered
    notes: str | None = None


class EventResponse(BaseModel):
    id: str
    session_id: str
    event_type: str
    user_response: str
    response_time: float | None
    decision_type: str
    score_delta: float
    new_score: float
    triggered_at: str


# ─── Helper: Evaluate Decision ───────────────────────────────────────────────

def evaluate_decision(user_response: UserResponseType, response_time: float) -> tuple[DecisionType, float]:
    """
    Determine decision type and score delta based on response and timing.
    
    Scoring:
      - Safe (ignored / voice_command): +10
      - Impulsive unsafe (interacted < 2s): -20
      - Risky (interacted 2-5s): -15
      - Delayed hesitant (interacted > 5s): -10
      - No response (timed out): -5
    
    Returns:
        (DecisionType, score_delta)
    """
    is_safe = user_response in (UserResponseType.IGNORED, UserResponseType.VOICE_COMMAND)

    if is_safe:
        return DecisionType.SAFE_IGNORE, +10.0
    elif user_response == UserResponseType.NO_RESPONSE:
        return DecisionType.DELAYED_HESITANT, -5.0
    elif response_time < 2.0:
        return DecisionType.IMPULSIVE_UNSAFE, -20.0
    elif response_time <= 5.0:
        return DecisionType.RISKY, -15.0
    else:
        return DecisionType.DELAYED_HESITANT, -10.0


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def post_event(
    request: PostEventRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Record a user's response to a distraction event.
    Evaluates decision, updates session score, and logs behavioral data.
    """
    # Validate session ownership
    session = await session_service.get_session_by_id(db, request.session_id)
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    if session.end_time is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session already ended")

    # Evaluate decision
    decision_type, score_delta = evaluate_decision(request.user_response, request.response_time)
    is_risky = score_delta < 0

    # Create event record
    event = Event(
        session_id=request.session_id,
        event_type=request.event_type,
        user_response=request.user_response,
        response_time=request.response_time,
        notes=request.notes,
        responded_at=datetime.now(timezone.utc),
    )
    db.add(event)

    # Create behavioral log
    pattern_flags: list[str] = []
    if request.response_time < 2.0 and is_risky:
        pattern_flags.append("quick_reactor")
    if request.response_time > 5.0:
        pattern_flags.append("slow_responder")
    if decision_type == DecisionType.SAFE_IGNORE:
        pattern_flags.append("safe_decision")

    log = BehavioralLog(
        session_id=request.session_id,
        decision_type=decision_type,
        pattern_flags=",".join(pattern_flags) if pattern_flags else None,
        is_risky=is_risky,
    )
    db.add(log)

    # Update session score
    updated_session = await session_service.update_session_score(db, request.session_id, score_delta)
    await db.flush()
    await db.refresh(event)

    return EventResponse(
        id=event.id,
        session_id=event.session_id,
        event_type=event.event_type.value,
        user_response=event.user_response.value,
        response_time=event.response_time,
        decision_type=decision_type.value,
        score_delta=score_delta,
        new_score=updated_session.score,
        triggered_at=event.triggered_at.isoformat(),
    )


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(
    event_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch a specific event record by ID."""
    from sqlalchemy import select
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()

    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    # Verify ownership via session
    session = await session_service.get_session_by_id(db, event.session_id)
    if session is None or session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    decision_type, score_delta = evaluate_decision(event.user_response, event.response_time or 0)

    return EventResponse(
        id=event.id,
        session_id=event.session_id,
        event_type=event.event_type.value,
        user_response=event.user_response.value,
        response_time=event.response_time,
        decision_type=decision_type.value,
        score_delta=score_delta,
        new_score=session.score,
        triggered_at=event.triggered_at.isoformat(),
    )
