"""
Insights routes — Driver Persona, Weekly Brain Report, Distraction vulnerability map.
Uses existing personality_profile and session/event data — no new DB tables needed.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta

from app.database import get_db
from app.models.user import User
from app.models.personality_profile import PersonalityProfile
from app.models.event import Event
from app.models.session import Session
from app.routes.auth import get_current_user

router = APIRouter(prefix="/api/insights", tags=["Insights"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class PersonaOut(BaseModel):
    persona_label: str
    persona_tagline: str
    persona_description: str
    top_trait: str
    top_trait_score: float
    danger_zone: str
    icon_key: str


class DistractionBreakdownItem(BaseModel):
    distraction_type: str
    total: int
    unsafe: int
    safe_rate: float


class WeeklyBrainReportOut(BaseModel):
    sessions_this_week: int
    avg_score: float
    best_score: int
    worst_distraction: str
    best_distraction: str
    distraction_breakdown: List[DistractionBreakdownItem]
    improvement_vs_last_week: float
    streak_status: str


# ─── Persona Logic ────────────────────────────────────────────────────────────

def _compute_persona(profile: PersonalityProfile) -> PersonaOut:
    """Generate a teen-friendly driver persona from personality profile data."""
    traits = {
        "impulsiveness":     profile.behavioral_impulsiveness if profile.calibration_completed else profile.impulsiveness_score,
        "attention":         profile.behavioral_attention     if profile.calibration_completed else profile.attention_control_score,
        "risk":              profile.risk_tolerance_score,
        "emotional":         profile.emotional_reactivity_score,
        "notification_pull": profile.behavioral_notification_fixation if profile.calibration_completed else 0.5,
    }

    # Determine dominant trait
    dominant = max(traits, key=lambda k: traits[k])

    PERSONAS = {
        "impulsiveness": PersonaOut(
            persona_label="THE THRILL SEEKER",
            persona_tagline="You live for the buzz — even behind the wheel.",
            persona_description="High impulsivity means you act on instinct. You often reach for your phone before your brain catches up. The good news? Fast reflexes can be trained into the right habits.",
            top_trait="Impulsiveness",
            top_trait_score=traits["impulsiveness"],
            danger_zone="Incoming calls and urgent-looking notifications",
            icon_key="zap",
        ),
        "notification_pull": PersonaOut(
            persona_label="THE PHANTOM SCROLLER",
            persona_tagline="Notifications pull you like gravity.",
            persona_description="Your brain is wired to respond to every buzz and ping. Phones feel like a second language — and your hands follow your eyes automatically. Training your attention is your superpower.",
            top_trait="Notification Fixation",
            top_trait_score=traits["notification_pull"],
            danger_zone="WhatsApp, social media pings, email alerts",
            icon_key="bell",
        ),
        "risk": PersonaOut(
            persona_label="THE DAREDEVIL",
            persona_tagline="Rules were made for other people, right?",
            persona_description="You have a high tolerance for risk, which makes you underestimate danger. You are not reckless — you just genuinely don't feel the risk others feel. Building that awareness is the whole game.",
            top_trait="Risk Tolerance",
            top_trait_score=traits["risk"],
            danger_zone="High-speed distractions and peer pressure moments",
            icon_key="flame",
        ),
        "emotional": PersonaOut(
            persona_label="THE REACTOR",
            persona_tagline="Your emotions drive almost as fast as you do.",
            persona_description="Strong emotional reactivity means stressful moments — arguments, bad news, even exciting calls — spike your distraction risk dramatically. Emotional self-regulation is your edge.",
            top_trait="Emotional Reactivity",
            top_trait_score=traits["emotional"],
            danger_zone="Emotional or conflict-triggering notifications",
            icon_key="activity",
        ),
        "attention": PersonaOut(
            persona_label="THE GUARDIAN",
            persona_tagline="Focus is your weapon. Use it.",
            persona_description="Strong attention control means you can hold your lane under pressure — but watch out for complacency. Even guardians slip when they think they're safe.",
            top_trait="Attention Control",
            top_trait_score=1.0 - traits["attention"],  # High score = good, so invert for display
            danger_zone="Routine drives where you let your guard down",
            icon_key="shield",
        ),
    }

    return PERSONAS.get(dominant, PERSONAS["notification_pull"])


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("/driver-persona", response_model=PersonaOut)
async def get_driver_persona(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the user's AI-derived driver persona based on their personality profile."""
    result = await db.execute(
        select(PersonalityProfile).where(PersonalityProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        # Return a default persona for new users
        return PersonaOut(
            persona_label="THE UNKNOWN DRIVER",
            persona_tagline="Complete your onboarding to reveal your true driver identity.",
            persona_description="Your driving persona is still being calibrated. Complete more sessions and the platform will generate your unique psychological driver profile.",
            top_trait="Undetermined",
            top_trait_score=0.0,
            danger_zone="Unknown — complete sessions to find out",
            icon_key="help_circle",
        )

    return _compute_persona(profile)


@router.get("/weekly-report", response_model=WeeklyBrainReportOut)
async def get_weekly_brain_report(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return a weekly brain report computed from recent session and event data."""
    now = datetime.now(timezone.utc)
    week_start = now - timedelta(days=7)
    prev_week_start = now - timedelta(days=14)

    # This-week sessions
    sessions_result = await db.execute(
        select(Session).where(
            and_(
                Session.user_id == current_user.id,
                Session.started_at >= week_start,
                Session.score.isnot(None),
            )
        )
    )
    sessions = sessions_result.scalars().all()

    # Last-week sessions for comparison
    prev_sessions_result = await db.execute(
        select(Session).where(
            and_(
                Session.user_id == current_user.id,
                Session.started_at >= prev_week_start,
                Session.started_at < week_start,
                Session.score.isnot(None),
            )
        )
    )
    prev_sessions = prev_sessions_result.scalars().all()

    avg_score = sum(s.score for s in sessions) / len(sessions) if sessions else 0.0
    prev_avg  = sum(s.score for s in prev_sessions) / len(prev_sessions) if prev_sessions else avg_score
    improvement = round(avg_score - prev_avg, 1)

    # Events this week
    session_ids = [s.id for s in sessions]
    distraction_map: dict[str, dict] = {}
    if session_ids:
        events_result = await db.execute(
            select(Event).where(Event.session_id.in_(session_ids))
        )
        events = events_result.scalars().all()
        for e in events:
            t = e.event_type
            if t not in distraction_map:
                distraction_map[t] = {"total": 0, "unsafe": 0}
            distraction_map[t]["total"] += 1
            if e.decision_type == "interacted":
                distraction_map[t]["unsafe"] += 1

    breakdown = []
    for dtype, counts in distraction_map.items():
        safe_rate = round(1 - (counts["unsafe"] / counts["total"]), 2) if counts["total"] > 0 else 1.0
        breakdown.append(DistractionBreakdownItem(
            distraction_type=dtype,
            total=counts["total"],
            unsafe=counts["unsafe"],
            safe_rate=safe_rate,
        ))

    worst = min(breakdown, key=lambda x: x.safe_rate).distraction_type if breakdown else "N/A"
    best  = max(breakdown, key=lambda x: x.safe_rate).distraction_type if breakdown else "N/A"

    scores = [s.score for s in sessions]
    streak_status = "on fire 🔥" if len(sessions) >= 5 else "building 📈" if len(sessions) >= 2 else "just starting ✨"

    return WeeklyBrainReportOut(
        sessions_this_week=len(sessions),
        avg_score=round(avg_score, 1),
        best_score=max(scores) if scores else 0,
        worst_distraction=worst,
        best_distraction=best,
        distraction_breakdown=breakdown,
        improvement_vs_last_week=improvement,
        streak_status=streak_status,
    )


@router.get("/distraction-map")
async def get_distraction_map(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all-time distraction performance breakdown for radar chart."""
    events_result = await db.execute(
        select(Event).where(Event.user_id == current_user.id)
    )
    events = events_result.scalars().all()

    distraction_map: dict[str, dict] = {}
    for e in events:
        t = e.event_type
        if t not in distraction_map:
            distraction_map[t] = {"total": 0, "unsafe": 0}
        distraction_map[t]["total"] += 1
        if e.decision_type == "interacted":
            distraction_map[t]["unsafe"] += 1

    return [
        {
            "type": dtype,
            "total": data["total"],
            "fail_rate": round(data["unsafe"] / data["total"], 2) if data["total"] > 0 else 0,
            "safe_rate": round(1 - data["unsafe"] / data["total"], 2) if data["total"] > 0 else 1,
        }
        for dtype, data in distraction_map.items()
    ]
