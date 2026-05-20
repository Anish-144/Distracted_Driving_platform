"""
Scenarios routes — AI-generated adaptive scenario management.

Endpoints:
  POST /api/scenarios/generate          — Generate a unique AI scenario for user
  GET  /api/scenarios/next/{type}       — Get next unused scenario (or generate if empty)
  GET  /api/scenarios/history           — Get all generated scenarios for this user
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel
from typing import Optional, List

from app.database import get_db
from app.models.user import User
from app.routes.auth import get_current_user
from app.services.scenario_generator import scenario_generator
from app.services.personality_profiler import personality_profiler
from app.services.behavior_analyzer import behavior_analyzer
from app.models.generated_scenario import GeneratedScenario
from app.models.event import EventType

router = APIRouter(prefix="/api/scenarios", tags=["AI Scenarios"])


# ── Pydantic Schemas ──────────────────────────────────────────────────────────

class GenerateScenarioRequest(BaseModel):
    distraction_type: str  # incoming_call | whatsapp_notification | gps_rerouting | email_alert | social_media
    session_id: Optional[str] = None
    difficulty_level: str = "medium"


class ScenarioResponse(BaseModel):
    id: str
    distraction_type: str
    driver_profile_at_generation: str
    difficulty_level: str
    narrative_context: str
    passenger_pressure_text: str
    urgency_escalation_level: int
    emotional_pressure_type: str
    target_weakness: str
    escalation_stage_1: str
    escalation_stage_2: str
    escalation_stage_3: str
    ai_provider: str


def _serialize(scenario: GeneratedScenario) -> ScenarioResponse:
    return ScenarioResponse(
        id=scenario.id,
        distraction_type=scenario.distraction_type,
        driver_profile_at_generation=scenario.driver_profile_at_generation,
        difficulty_level=scenario.difficulty_level,
        narrative_context=scenario.narrative_context,
        passenger_pressure_text=scenario.passenger_pressure_text,
        urgency_escalation_level=scenario.urgency_escalation_level,
        emotional_pressure_type=scenario.emotional_pressure_type,
        target_weakness=scenario.target_weakness,
        escalation_stage_1=scenario.escalation_stage_1,
        escalation_stage_2=scenario.escalation_stage_2,
        escalation_stage_3=scenario.escalation_stage_3,
        ai_provider=scenario.ai_provider,
    )


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/generate", response_model=ScenarioResponse, status_code=status.HTTP_201_CREATED)
async def generate_scenario(
    request: GenerateScenarioRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate a unique, psychologically adaptive scenario for this user.
    
    The scenario is personalized using:
    - Psychological personality profile (from onboarding)
    - Current behavioral state (from simulation history)
    - Driver profile type
    - Recent session mistakes
    """
    # Validate distraction type
    valid_types = [e.value for e in EventType]
    if request.distraction_type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid distraction_type. Must be one of: {valid_types}",
        )

    # Fetch personality profile (for psychographic personalization)
    personality = await personality_profiler.get_profile(db, current_user.id)

    # Fetch behavioral summary for recent mistakes context
    behavioral_summary = await behavior_analyzer.get_summary(db, current_user.id)
    recent_mistakes_str = behavioral_summary.behavior_summary or "No prior session data."

    scenario = await scenario_generator.generate_scenario(
        db=db,
        user_id=current_user.id,
        distraction_type=request.distraction_type,
        driver_profile=current_user.profile_type.value,
        session_id=request.session_id,
        recent_mistakes=recent_mistakes_str,
        difficulty_level=request.difficulty_level,
        personality_profile=personality,
    )
    await db.commit()
    return _serialize(scenario)


@router.get("/next/{distraction_type}", response_model=ScenarioResponse)
async def get_next_scenario(
    distraction_type: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get the next unused AI-generated scenario for this distraction type.
    If none available, auto-generates one on the fly.
    """
    # Try to serve a pre-generated scenario
    scenario = await scenario_generator.get_unused_scenario(
        db=db,
        user_id=current_user.id,
        distraction_type=distraction_type,
    )

    if scenario is None:
        # Generate fresh
        personality = await personality_profiler.get_profile(db, current_user.id)
        behavioral_summary = await behavior_analyzer.get_summary(db, current_user.id)
        scenario = await scenario_generator.generate_scenario(
            db=db,
            user_id=current_user.id,
            distraction_type=distraction_type,
            driver_profile=current_user.profile_type.value,
            recent_mistakes=behavioral_summary.behavior_summary or "No prior session data.",
            personality_profile=personality,
        )

    await db.commit()
    return _serialize(scenario)


@router.get("/history", response_model=List[ScenarioResponse])
async def get_scenario_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = 20,
):
    """Return the most recent AI-generated scenarios for this user."""
    result = await db.execute(
        select(GeneratedScenario)
        .where(GeneratedScenario.user_id == current_user.id)
        .order_by(desc(GeneratedScenario.created_at))
        .limit(limit)
    )
    scenarios = result.scalars().all()
    return [_serialize(s) for s in scenarios]
