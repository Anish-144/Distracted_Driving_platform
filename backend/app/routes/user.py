from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime, timezone
import json
import logging

from app.database import get_db
from app.models.user import User, ProfileType
from app.services import user_service
from app.routes.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/users", tags=["Users"])


class UpdateProfileRequest(BaseModel):
    profile_type: ProfileType

@router.patch("/me/profile")
async def update_my_profile(
    request: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update the current user's behavioral profile type.
    """
    updated_user = await user_service.update_user_profile(
        db, current_user.id, request.profile_type
    )
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    # Commit is handled by get_db if it finishes successfully, 
    # but we should explicitly commit if we want it saved now.
    # Actually get_db does: yield session; await session.commit()
    
    return {
        "status": "success",
        "profile_type": updated_user.profile_type.value
    }

class UpdateCoreProfileRequest(BaseModel):
    name: str
    email: EmailStr

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name cannot be empty")
        return v.strip()

class UpdatePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


@router.patch("/profile")
async def update_core_profile(
    request: UpdateCoreProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the current user's name and email."""
    try:
        updated_user = await user_service.update_core_profile(
            db, current_user.id, request.name, request.email
        )
        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        return {
            "status": "success",
            "name": updated_user.name,
            "email": updated_user.email
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )

@router.patch("/password")
async def update_password(
    request: UpdatePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the current user's password."""
    try:
        success = await user_service.update_password(
            db, current_user.id, request.current_password, request.new_password
        )
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        return {"status": "success", "message": "Password updated successfully"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


# ── Progress Reset ────────────────────────────────────────────────────────────

@router.post("/reset-progress", status_code=status.HTTP_200_OK)
async def reset_my_progress(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Reset all training-derived progress data for the authenticated user.

    Cleared tables (FK-safe order):
      behavioral_logs, behavioral_states, intervention_logs,
      calibration_events, events, cognitive_reports,
      generated_scenarios, sessions, user_lessons, personality_profiles

    Also resets:
      users.profile_type → 'unknown'

    Preserved:
      users row, user_settings, feedbacks

    Returns 200 with a summary of what was cleared.
    """
    reset_ok = await user_service.reset_progress(db, current_user.id)
    if not reset_ok:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    await db.commit()
    return {
        "success": True,
        "cleared": [
            "sessions",
            "events",
            "behavioral_logs",
            "behavioral_states",
            "intervention_logs",
            "calibration_events",
            "cognitive_reports",
            "generated_scenarios",
            "user_lessons",
            "personality_profiles",
        ],
        "preserved": ["account", "settings", "feedback"],
        "profile_type_reset": "unknown",
    }


@router.delete("/me", status_code=status.HTTP_200_OK)
async def delete_my_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):

    """
    Permanently delete the authenticated user's account and all associated data.

    Cascade order:
      behavioral_logs → behavioral_states → intervention_logs →
      calibration_events → events → cognitive_reports →
      generated_scenarios → sessions → user_lessons →
      personality_profiles → feedbacks → user_settings → users

    Returns 200 { "success": true } on success.
    Returns 404 if the user no longer exists (should be unreachable in practice).
    """
    deleted = await user_service.delete_account(db, current_user.id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    await db.commit()
    return {"success": True}


# ── Data Export ───────────────────────────────────────────────────────────────

@router.get("/export")
async def export_my_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Export the authenticated user's complete data as a downloadable JSON file.

    Includes:
      - profile
      - settings
      - sessions (with child events)
      - AI lessons (user_lessons)
      - feedback

    Returns application/json with Content-Disposition: attachment so the
    browser triggers an automatic download. Uses StreamingResponse so memory
    usage stays O(payload_size) and does not require a temp file on disk.

    Audit log entry is written for every successful export.
    """
    from app.models.session import Session
    from app.models.event import Event
    from app.models.user_lesson import UserLesson
    from app.models.feedback import Feedback
    from app.models.user_settings import UserSettings

    uid = current_user.id

    # ── 1. Profile ────────────────────────────────────────────────────────────
    profile_payload = {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "profile_type": current_user.profile_type.value,
        "is_admin": current_user.is_admin,
        "created_at": current_user.created_at.isoformat(),
        "updated_at": current_user.updated_at.isoformat(),
    }

    # ── 2. Settings ───────────────────────────────────────────────────────────
    settings_result = await db.execute(
        select(UserSettings).where(UserSettings.user_id == uid)
    )
    settings_row = settings_result.scalar_one_or_none()
    settings_payload = None
    if settings_row:
        settings_payload = {
            "lesson_reminders": settings_row.lesson_reminders,
            "weekly_progress": settings_row.weekly_progress,
            "coaching_recommendations": settings_row.coaching_recommendations,
            "assessment_reminders": settings_row.assessment_reminders,
            "email_notifications": settings_row.email_notifications,
            "difficulty": settings_row.difficulty,
            "intensity": settings_row.intensity,
            "audio_guidance": settings_row.audio_guidance,
            "phone": settings_row.phone,
            "emergency_contact": settings_row.emergency_contact,
            "updated_at": settings_row.updated_at.isoformat(),
        }

    # ── 3. Sessions + Events ──────────────────────────────────────────────────
    sessions_result = await db.execute(
        select(Session).where(Session.user_id == uid)
    )
    sessions = sessions_result.scalars().all()

    sessions_payload = []
    for s in sessions:
        events_result = await db.execute(
            select(Event).where(Event.session_id == s.id)
        )
        events = events_result.scalars().all()
        sessions_payload.append({
            "id": s.id,
            "score": s.score,
            "start_time": s.start_time.isoformat() if s.start_time else None,
            "end_time": s.end_time.isoformat() if s.end_time else None,
            "created_at": s.created_at.isoformat(),
            "events": [
                {
                    "id": e.id,
                    "event_type": e.event_type.value if hasattr(e.event_type, 'value') else str(e.event_type),
                    "user_response": e.user_response.value if hasattr(e.user_response, 'value') else (str(e.user_response) if e.user_response else None),
                    "response_time": e.response_time,
                    "notes": e.notes,
                    "triggered_at": e.triggered_at.isoformat(),
                    "responded_at": e.responded_at.isoformat() if e.responded_at else None,
                }
                for e in events
            ],
        })

    # ── 4. AI Lessons ─────────────────────────────────────────────────────────
    lessons_result = await db.execute(
        select(UserLesson).where(UserLesson.user_id == uid)
    )
    lessons = lessons_result.scalars().all()
    lessons_payload = [
        {
            "id": l.id,
            "title": l.title,
            "lesson_category": l.lesson_category,
            "behavioral_diagnosis": l.behavioral_diagnosis,
            "psychological_interpretation": l.psychological_interpretation,
            "real_world_risk_impact": l.real_world_risk_impact,
            "cognitive_coaching_narrative": l.cognitive_coaching_narrative,
            "scenario_replay_analysis": l.scenario_replay_analysis,
            "future_risk_projection": l.future_risk_projection,
            "personalized_improvement_strategy": l.personalized_improvement_strategy,
            "difficulty": l.difficulty,
            "driver_type": l.driver_type,
            "reaction_time_target": l.reaction_time_target,
            "distraction_tolerance_target": l.distraction_tolerance_target,
            "ai_provider": l.ai_provider,
            "completed": l.completed,
            "review_count": l.review_count,
            "completed_at": l.completed_at.isoformat() if l.completed_at else None,
            "created_at": l.created_at.isoformat(),
            "session_id": l.session_id,
            "generated_reason": l.generated_reason,
            "recommended_focus": l.recommended_focus,
        }
        for l in lessons
    ]

    # ── 5. Feedback ───────────────────────────────────────────────────────────
    feedback_result = await db.execute(
        select(Feedback).where(Feedback.user_id == uid)
    )
    feedbacks = feedback_result.scalars().all()
    feedback_payload = [
        {
            "id": f.id,
            "type": f.type.value,
            "rating": f.rating,
            "comment": f.comment,
            "status": f.status.value,
            "page_url": f.page_url,
            "browser": f.browser,
            "device_type": f.device_type,
            "created_at": f.created_at.isoformat(),
            "updated_at": f.updated_at.isoformat(),
        }
        for f in feedbacks
    ]

    # ── 6. Assemble export envelope ───────────────────────────────────────────
    exported_at = datetime.now(timezone.utc).isoformat()
    export_doc = {
        "export_metadata": {
            "platform": "SafeDrive AI",
            "exported_at": exported_at,
            "user_id": uid,
            "data_version": "1.0",
        },
        "profile": profile_payload,
        "settings": settings_payload,
        "sessions": sessions_payload,
        "lessons": lessons_payload,
        "feedback": feedback_payload,
    }

    # ── 7. Audit log ──────────────────────────────────────────────────────────
    logger.info(
        "DATA_EXPORT user_id=%s exported_at=%s sessions=%d lessons=%d feedback=%d",
        uid,
        exported_at,
        len(sessions_payload),
        len(lessons_payload),
        len(feedback_payload),
    )

    # ── 8. Stream JSON response ───────────────────────────────────────────────
    json_bytes = json.dumps(export_doc, ensure_ascii=False, indent=2).encode("utf-8")
    filename = f"safedrive_export_{uid[:8]}_{datetime.now(timezone.utc).strftime('%Y%m%d')}.json"

    return StreamingResponse(
        iter([json_bytes]),
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(json_bytes)),
            "X-Export-Records": (
                f"sessions={len(sessions_payload)},"
                f"lessons={len(lessons_payload)},"
                f"feedback={len(feedback_payload)}"
            ),
        },
    )
