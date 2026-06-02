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
    lesson_category: str
    behavioral_diagnosis: str
    psychological_interpretation: str
    real_world_risk_impact: str
    cognitive_coaching_narrative: str
    scenario_replay_analysis: str
    behavioral_exercises: List[str]
    mental_conditioning_techniques: List[str]
    attention_reinforcement_tasks: List[str]
    future_risk_projection: str
    personalized_improvement_strategy: str
    difficulty: str
    driver_type: str
    reaction_time_target: float
    distraction_tolerance_target: float
    ai_provider: str
    completed: bool
    review_count: int
    completed_at: Optional[str]
    created_at: str
    session_id: Optional[str] = None
    generated_reason: Optional[str] = None
    recommended_focus: Optional[str] = None
    simulation_source: Optional[str] = None
    mistake_trigger: Optional[str] = None
    risk_level: Optional[str] = None


class CompleteLessonRequest(BaseModel):
    pass


class AILessonListResponse(BaseModel):
    items: List[AILessonResponse]
    total_count: int
    limit: int
    offset: int



def _serialize_ai_lesson(lesson: UserLesson) -> AILessonResponse:
    """Convert UserLesson ORM object to API response."""
    try:
        behavioral_exercises = json.loads(lesson.behavioral_exercises) if lesson.behavioral_exercises else []
    except Exception:
        behavioral_exercises = []

    try:
        mental_conditioning_techniques = json.loads(lesson.mental_conditioning_techniques) if lesson.mental_conditioning_techniques else []
    except Exception:
        mental_conditioning_techniques = []

    try:
        attention_reinforcement_tasks = json.loads(lesson.attention_reinforcement_tasks) if lesson.attention_reinforcement_tasks else []
    except Exception:
        attention_reinforcement_tasks = []

    # Calculate simulation source dynamically
    sim_source = "Standard Driving Simulation"
    text_to_search = (lesson.title + " " + (lesson.generated_reason or "") + " " + lesson.behavioral_diagnosis).lower()
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
        lesson_category=lesson.lesson_category,
        behavioral_diagnosis=lesson.behavioral_diagnosis,
        psychological_interpretation=lesson.psychological_interpretation,
        real_world_risk_impact=lesson.real_world_risk_impact,
        cognitive_coaching_narrative=lesson.cognitive_coaching_narrative,
        scenario_replay_analysis=lesson.scenario_replay_analysis,
        behavioral_exercises=behavioral_exercises,
        mental_conditioning_techniques=mental_conditioning_techniques,
        attention_reinforcement_tasks=attention_reinforcement_tasks,
        future_risk_projection=lesson.future_risk_projection,
        personalized_improvement_strategy=lesson.personalized_improvement_strategy,
        difficulty=lesson.difficulty,
        driver_type=lesson.driver_type,
        reaction_time_target=lesson.reaction_time_target,
        distraction_tolerance_target=lesson.distraction_tolerance_target,
        ai_provider=lesson.ai_provider,
        completed=lesson.completed,
        review_count=lesson.review_count,
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


@router.get("/ai/history", response_model=AILessonListResponse)
async def get_ai_lesson_history(
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the paginated AI lesson history for the authenticated user."""
    from sqlalchemy import func, desc
    
    # Count total
    count_query = select(func.count(UserLesson.id)).where(UserLesson.user_id == current_user.id)
    total = await db.scalar(count_query)
    
    # Fetch paginated
    query = select(UserLesson).where(UserLesson.user_id == current_user.id).order_by(desc(UserLesson.created_at)).offset(offset).limit(limit)
    result = await db.execute(query)
    lessons = result.scalars().all()
    
    return AILessonListResponse(
        items=[_serialize_ai_lesson(l) for l in lessons],
        total_count=total or 0,
        limit=limit,
        offset=offset
    )


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
    )
    if lesson is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found or does not belong to this user",
        )
    await db.commit()
    return _serialize_ai_lesson(lesson)


@router.post("/ai/{lesson_id}/retake", response_model=AILessonResponse)
async def retake_ai_lesson(
    lesson_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a completed lesson as reviewed/retaken."""
    lesson = await lesson_generation_service.mark_retaken(
        db=db,
        lesson_id=lesson_id,
        user_id=current_user.id,
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
