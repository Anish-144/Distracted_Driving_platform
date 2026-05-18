"""
Lessons routes — AI-powered personalized lesson generation and management.

Endpoints:
  GET  /api/lessons/recommended         — Static profile-based lessons (existing)
  GET  /api/lessons                     — All static lessons (existing)
  GET  /api/lessons/ai/recommended      — AI-generated personalized lesson plan
  GET  /api/lessons/ai/history          — Full AI lesson history for user
  POST /api/lessons/ai/generate         — Trigger fresh lesson generation
  POST /api/lessons/ai/{lesson_id}/complete — Mark lesson as completed
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel
import json

from app.database import get_db
from app.models.user import User, ProfileType
from app.models.lesson import Lesson, LessonTag
from app.models.user_lesson import UserLesson
from app.models.behavioral_state import BehavioralState
from app.routes.auth import get_current_user
from app.services.lesson_service import lesson_generation_service
from app.services.behavior_analyzer import behavior_analyzer

router = APIRouter(prefix="/api/lessons", tags=["Lessons"])


# ── Pydantic Schemas ──────────────────────────────────────────────────────────

class LessonResponse(BaseModel):
    id: str
    title: str
    description: str
    difficulty: str
    tag: str


class AILessonResponse(BaseModel):
    id: str
    title: str
    behavioral_target: str
    why_it_matters: str
    ai_coaching_advice: str
    exercises: List[str]
    personalized_insight: str
    improvement_goal: str
    simulation_modes: List[str]
    difficulty: str
    driver_type: str
    reaction_time_target: float
    distraction_tolerance_target: float
    ai_provider: str
    completed: bool
    completion_score: Optional[float]
    completed_at: Optional[str]
    created_at: str
    session_id: Optional[str] = None
    generated_reason: Optional[str] = None
    recommended_focus: Optional[str] = None
    simulation_source: Optional[str] = None
    mistake_trigger: Optional[str] = None
    risk_level: Optional[str] = None


class CompleteLessonRequest(BaseModel):
    completion_score: float = 100.0


def _serialize_ai_lesson(lesson: UserLesson) -> AILessonResponse:
    """Convert UserLesson ORM object to API response."""
    try:
        exercises = json.loads(lesson.exercises) if lesson.exercises else []
    except Exception:
        exercises = [lesson.exercises] if lesson.exercises else []

    try:
        simulation_modes = json.loads(lesson.simulation_modes) if lesson.simulation_modes else []
    except Exception:
        simulation_modes = [lesson.simulation_modes] if lesson.simulation_modes else []

    # Calculate simulation source dynamically
    sim_source = "Standard Driving Simulation"
    text_to_search = (lesson.title + " " + (lesson.generated_reason or "") + " " + lesson.behavioral_target).lower()
    if "phone" in text_to_search or "call" in text_to_search or "ring" in text_to_search:
        sim_source = "Phone Call Simulation"
    elif "gps" in text_to_search or "route" in text_to_search or "rerout" in text_to_search:
        sim_source = "GPS Rerouting"
    elif "passenger" in text_to_search or "social" in text_to_search or "pressure" in text_to_search:
        sim_source = "Passenger Pressure Test"
    elif "traffic" in text_to_search or "multi" in text_to_search or "alert" in text_to_search:
        sim_source = "Multi-Distraction Scenario"

    # Calculate mistake trigger dynamically
    mistake_trigger = "Baseline Drift Detected"
    if "impulsive" in lesson.driver_type.lower() or "fast" in text_to_search or "reflex" in text_to_search or "sub-2s" in text_to_search:
        mistake_trigger = "Fast Reaction"
    elif "unsafe" in text_to_search or "interact" in text_to_search:
        mistake_trigger = "Unsafe Interaction"
    elif "hesitant" in lesson.driver_type.lower() or "slow" in text_to_search or "delay" in text_to_search or "hesitat" in text_to_search:
        mistake_trigger = "Hesitation Detected"

    # Calculate risk level dynamically
    risk_level = "Low Risk"
    if lesson.reaction_time_target <= 2.2:
        risk_level = "High Risk"
    elif lesson.reaction_time_target <= 3.0:
        risk_level = "Medium Risk"

    return AILessonResponse(
        id=lesson.id,
        title=lesson.title,
        behavioral_target=lesson.behavioral_target,
        why_it_matters=lesson.why_it_matters,
        ai_coaching_advice=lesson.ai_coaching_advice,
        exercises=exercises,
        personalized_insight=lesson.personalized_insight,
        improvement_goal=lesson.improvement_goal,
        simulation_modes=simulation_modes,
        difficulty=lesson.difficulty,
        driver_type=lesson.driver_type,
        reaction_time_target=lesson.reaction_time_target,
        distraction_tolerance_target=lesson.distraction_tolerance_target,
        ai_provider=lesson.ai_provider,
        completed=lesson.completed,
        completion_score=lesson.completion_score,
        completed_at=lesson.completed_at.isoformat() if lesson.completed_at else None,
        created_at=lesson.created_at.isoformat(),
        session_id=lesson.session_id,
        generated_reason=lesson.generated_reason,
        recommended_focus=lesson.recommended_focus,
        simulation_source=sim_source,
        mistake_trigger=mistake_trigger,
        risk_level=risk_level,
    )


# ── Existing Static Lesson Endpoints (preserved exactly) ─────────────────────

@router.get("/recommended", response_model=List[LessonResponse])
async def get_recommended_lessons(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch recommended lessons based on the user's profile type."""
    tag_filter = LessonTag.GENERAL
    if current_user.profile_type == ProfileType.IMPULSIVE:
        tag_filter = LessonTag.IMPULSIVE
    elif current_user.profile_type == ProfileType.DISTRACTIBLE:
        tag_filter = LessonTag.DISTRACTED
    elif current_user.profile_type == ProfileType.RULE_FOLLOWING:
        tag_filter = LessonTag.SAFE

    stmt = select(Lesson).where(Lesson.tag.in_([tag_filter, LessonTag.GENERAL]))
    result = await db.execute(stmt)
    lessons = result.scalars().all()
    sorted_lessons = sorted(lessons, key=lambda l: 0 if l.tag == tag_filter else 1)

    return [
        LessonResponse(
            id=l.id,
            title=l.title,
            description=l.description,
            difficulty=l.difficulty,
            tag=l.tag.value
        )
        for l in sorted_lessons
    ]


@router.get("", response_model=List[LessonResponse])
async def get_all_lessons(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch all static lessons."""
    result = await db.execute(select(Lesson))
    lessons = result.scalars().all()
    return [
        LessonResponse(
            id=l.id,
            title=l.title,
            description=l.description,
            difficulty=l.difficulty,
            tag=l.tag.value
        )
        for l in lessons
    ]


# ── AI Lesson Endpoints ───────────────────────────────────────────────────────

@router.get("/ai/recommended", response_model=List[AILessonResponse])
async def get_ai_recommended_lessons(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get the user's current AI-generated personalized lesson plan.
    Returns up to 5 active (incomplete) AI lessons.
    If none exist, auto-generates one immediately.
    """
    lessons = await lesson_generation_service.get_active_lessons(db, current_user.id)

    if not lessons:
        # No lessons yet — auto-generate from behavioral state
        lessons = await _auto_generate_lesson(db, current_user)

    return [_serialize_ai_lesson(l) for l in lessons]


@router.get("/ai/history", response_model=List[AILessonResponse])
async def get_ai_lesson_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the full AI lesson history for the authenticated user."""
    lessons = await lesson_generation_service.get_all_lessons(db, current_user.id)
    return [_serialize_ai_lesson(l) for l in lessons]


@router.post("/ai/generate", response_model=AILessonResponse, status_code=status.HTTP_201_CREATED)
async def generate_ai_lesson(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Trigger a fresh AI lesson generation based on the user's current
    behavioral state. Returns the newly created lesson.
    """
    new_lessons = await _auto_generate_lesson(db, current_user)
    await db.commit()
    return _serialize_ai_lesson(new_lessons[0])


@router.post("/generate", response_model=AILessonResponse, status_code=status.HTTP_201_CREATED)
async def generate_lesson_alias(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Trigger a fresh AI lesson generation based on the user's current
    behavioral state. Returns the newly created lesson.
    """
    new_lessons = await _auto_generate_lesson(db, current_user)
    await db.commit()
    return _serialize_ai_lesson(new_lessons[0])


@router.post("/generate-from-session/{session_id}", response_model=AILessonResponse, status_code=status.HTTP_201_CREATED)
async def generate_lesson_from_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate an AI lesson specifically tailored to the mistakes of a given session.
    """
    # 1. Validate session ownership
    from app.models.session import Session
    session_result = await db.execute(
        select(Session).where(Session.id == session_id, Session.user_id == current_user.id)
    )
    session_obj = session_result.scalar_one_or_none()
    if not session_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or does not belong to this user",
        )

    # 2. Fetch behavioral data for this session
    from app.models.event import Event, UserResponseType
    from app.models.behavioral_log import BehavioralLog, DecisionType
    
    event_result = await db.execute(
        select(Event).where(Event.session_id == session_id)
    )
    events = event_result.scalars().all()
    mistakes = []
    for event in events:
        is_unsafe = event.user_response == UserResponseType.INTERACTED
        is_slow = event.response_time and event.response_time > 2.0
        if is_unsafe or is_slow:
            tag = "UNSAFE INTERACTION" if is_unsafe else "SLOW REACTION"
            mistakes.append(
                f"{tag}: {event.event_type.value} response was {event.user_response.value if event.user_response else 'none'} in {event.response_time or 0.0:.2f}s"
            )
            
    log_result = await db.execute(
        select(BehavioralLog).where(BehavioralLog.session_id == session_id)
    )
    logs = log_result.scalars().all()
    for log in logs:
        if log.is_risky or log.decision_type in [DecisionType.IMPULSIVE_UNSAFE, DecisionType.DELAYED_HESITANT, DecisionType.RISKY]:
            mistakes.append(f"Behavior Pattern: {log.decision_type.value}")
            
    latest_mistakes_str = "; ".join(mistakes) if mistakes else "No major mistakes noted in this session."

    # 3. Get behavioral state
    state_result = await db.execute(
        select(BehavioralState).where(BehavioralState.user_id == current_user.id)
    )
    state = state_result.scalar_one_or_none()

    # 4. Get behavioral summary
    behavioral_summary = await behavior_analyzer.get_summary(db, current_user.id)
    
    if state is None:
        state_result = await db.execute(
            select(BehavioralState).where(BehavioralState.user_id == current_user.id)
        )
        state = state_result.scalar_one_or_none()

    # 5. Execute generation
    lesson = await lesson_generation_service.generate_lesson(
        db=db,
        user_id=current_user.id,
        behavioral_summary=behavioral_summary,
        behavioral_state=state,
        latest_mistakes_str=latest_mistakes_str,
        session_id=session_id
    )
    
    await db.commit()
    return _serialize_ai_lesson(lesson)


@router.post("/ai/{lesson_id}/complete", response_model=AILessonResponse)
async def complete_ai_lesson(
    lesson_id: str,
    body: CompleteLessonRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark an AI-generated lesson as completed."""
    lesson = await lesson_generation_service.mark_completed(
        db=db,
        lesson_id=lesson_id,
        user_id=current_user.id,
        completion_score=body.completion_score,
    )
    if lesson is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found or does not belong to this user",
        )
    await db.commit()
    return _serialize_ai_lesson(lesson)


# ── Internal Helper ───────────────────────────────────────────────────────────

async def _auto_generate_lesson(
    db: AsyncSession, current_user: User
) -> list[UserLesson]:
    """Fetch behavioral state and generate a lesson. Returns [lesson]."""
    from app.models.session import Session
    from app.models.behavioral_log import BehavioralLog, DecisionType
    from app.models.event import Event, UserResponseType
    from sqlalchemy import desc

    # Get latest session
    session_result = await db.execute(
        select(Session)
        .where(Session.user_id == current_user.id, Session.end_time.isnot(None))
        .order_by(desc(Session.created_at))
        .limit(1)
    )
    latest_session = session_result.scalar_one_or_none()
    
    latest_mistakes_str = "No recent mistakes."
    session_id = None
    if latest_session:
        session_id = latest_session.id
        
        # 1. Fetch event-level details (unsafe/slow reactions)
        event_result = await db.execute(
            select(Event).where(Event.session_id == latest_session.id)
        )
        events = event_result.scalars().all()
        mistakes = []
        for event in events:
            is_unsafe = event.user_response == UserResponseType.INTERACTED
            is_slow = event.response_time and event.response_time > 2.0
            if is_unsafe or is_slow:
                tag = "UNSAFE INTERACTION" if is_unsafe else "SLOW REACTION"
                mistakes.append(
                    f"{tag}: {event.event_type.value} response was {event.user_response.value if event.user_response else 'none'} in {event.response_time or 0.0:.2f}s"
                )

        # 2. Fetch behavioral analysis tags
        log_result = await db.execute(
            select(BehavioralLog).where(BehavioralLog.session_id == latest_session.id)
        )
        logs = log_result.scalars().all()
        for log in logs:
            if log.is_risky or log.decision_type in [DecisionType.IMPULSIVE_UNSAFE, DecisionType.DELAYED_HESITANT, DecisionType.RISKY]:
                mistakes.append(f"Behavior Pattern: {log.decision_type.value}")
                
        if mistakes:
            latest_mistakes_str = "; ".join(mistakes)

    # Get behavioral state
    state_result = await db.execute(
        select(BehavioralState).where(BehavioralState.user_id == current_user.id)
    )
    state = state_result.scalar_one_or_none()

    # Get behavioral summary (creates state if none exists)
    behavioral_summary = await behavior_analyzer.get_summary(db, current_user.id)

    if state is None:
        state_result = await db.execute(
            select(BehavioralState).where(BehavioralState.user_id == current_user.id)
        )
        state = state_result.scalar_one_or_none()

    lesson = await lesson_generation_service.generate_lesson(
        db=db,
        user_id=current_user.id,
        behavioral_summary=behavioral_summary,
        behavioral_state=state,
        latest_mistakes_str=latest_mistakes_str,
        session_id=session_id
    )
    return [lesson]
