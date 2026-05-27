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

@router.post("/generate/{session_id}", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def generate_cognitive_report(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Synchronously generate a Cognitive Report for the given session."""
    from app.services.behavior_analyzer import behavior_analyzer
    from app.models.session import Session
    from app.models.event import Event
    from app.models.behavioral_state import BehavioralState
    import logging

    _log = logging.getLogger(__name__)

    # Validate session ownership
    session_result = await db.execute(
        select(Session).where(Session.id == session_id, Session.user_id == current_user.id)
    )
    session_obj = session_result.scalar_one_or_none()
    if not session_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or does not belong to this user"
        )

    # Check if a report already exists for this session
    existing_report_result = await db.execute(
        select(CognitiveReport).where(CognitiveReport.session_id == session_id)
    )
    existing_report = existing_report_result.scalar_one_or_none()
    if existing_report:
        # If already generated, just return it
        report = existing_report
    else:
        # Generate the report
        try:
            summary = await behavior_analyzer.get_summary(db, current_user.id)
            state_result = await db.execute(
                select(BehavioralState).where(BehavioralState.user_id == current_user.id)
            )
            behavioral_state = state_result.scalar_one_or_none()

            if not behavioral_state or not summary:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Incomplete behavioral state. Cannot generate report."
                )

            events_result = await db.execute(
                select(Event).where(Event.session_id == session_id).order_by(Event.triggered_at)
            )
            events = events_result.scalars().all()
            session_events = [
                {
                    "event_type": e.event_type.value if hasattr(e.event_type, 'value') else str(e.event_type),
                    "decision_type": e.user_response.value if e.user_response and hasattr(e.user_response, 'value') else "unknown",
                    "reaction_time": e.response_time or 0.0,
                    "urgency": "medium",
                }
                for e in events
            ]

            report = await cognitive_report_service.generate_report(
                db=db,
                user_id=current_user.id,
                session_id=session_id,
                behavioral_summary=summary,
                behavioral_state=behavioral_state,
                session_events=session_events,
                session_score=session_obj.score
            )
            await db.commit()
            _log.info(f"Cognitive report generated synchronously for session {session_id}")

        except Exception as exc:
            _log.error("Cognitive report generation failed: %s", exc, exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate cognitive report."
            )

    return _serialize_cognitive_report(report)


@router.get("/session/{session_id}", response_model=Dict[str, Any])
async def get_report_by_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch the cognitive report for a specific session."""
    result = await db.execute(
        select(CognitiveReport).where(
            CognitiveReport.session_id == session_id,
            CognitiveReport.user_id == current_user.id
        )
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cognitive report not found for this session."
        )

    return _serialize_cognitive_report(report)


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

    return _serialize_cognitive_report(report)


def _serialize_cognitive_report(report: CognitiveReport) -> Dict[str, Any]:
    """Helper to serialize CognitiveReport to dict."""
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
