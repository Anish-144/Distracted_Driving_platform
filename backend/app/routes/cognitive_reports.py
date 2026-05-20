"""
Cognitive Reports Routes — fetch behavioral cognitive reports for users.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
import json

from app.database import get_db
from app.models.user import User
from app.models.cognitive_report import CognitiveReport
from app.routes.auth import get_current_user
from app.services.cognitive_report_service import cognitive_report_service
from sqlalchemy import select

router = APIRouter(prefix="/api/cognitive-reports", tags=["Cognitive Reports"])

@router.get("/latest", response_model=Dict[str, Any])
async def get_latest_report(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch the most recent cognitive report for the authenticated user."""
    report = await cognitive_report_service.get_latest_report(db, current_user.id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No cognitive report found. Complete a simulation session first."
        )

    # Return a structured dict, parsing the JSON fields back into objects
    return {
        "id": report.id,
        "session_id": report.session_id,
        "executive_summary": report.executive_summary,
        "cognitive_analysis": report.cognitive_analysis,
        "emotional_trigger_breakdown": json.loads(report.emotional_trigger_breakdown),
        "behavioral_timeline": json.loads(report.behavioral_timeline),
        "attention_stability_analysis": report.attention_stability_analysis,
        "risk_projection": report.risk_projection,
        "consistency_analysis": report.consistency_analysis,
        "intervention_strategy": json.loads(report.intervention_strategy),
        "coaching_narrative": report.coaching_narrative,
        "recommended_simulations": json.loads(report.recommended_simulations),
        "metrics": {
            "urgency_susceptibility_index": report.urgency_susceptibility_index,
            "authority_pressure_sensitivity": report.authority_pressure_sensitivity,
            "cognitive_overload_score": report.cognitive_overload_score,
            "emotional_reactivity_index": report.emotional_reactivity_index,
            "defensive_attention_stability": report.defensive_attention_stability,
            "reassurance_seeking_probability": report.reassurance_seeking_probability,
        },
        "session_context": {
            "score": report.session_score,
            "safe_decision_rate": report.safe_decision_rate,
            "total_events": report.total_events_in_session,
            "driver_profile": report.driver_profile_at_time,
            "personality_label": report.personality_label_at_time,
        },
        "ai_provider": report.ai_provider,
        "created_at": report.created_at.isoformat(),
    }
