"""
Missions routes — Daily missions (3/day) + Weekly Boss Challenge + Streak Freeze.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime, timezone
import random

from app.database import get_db
from app.models.user import User
from app.models.gamification import (
    UserProgression,
    DailyMission, UserMissionProgress, MissionType,
    WeeklyBossChallenge, UserBossAttempt,
)
from app.routes.auth import get_current_user
from app.services.gamification_service import award_xp, _get_or_create_progression

router = APIRouter(prefix="/api/missions", tags=["Missions"])


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class MissionOut(BaseModel):
    id: str
    slot: int
    title: str
    description: str
    mission_type: str
    target_value: int
    xp_reward: int
    emoji: str
    progress: int
    completed: bool


class DailyMissionsOut(BaseModel):
    missions: List[MissionOut]
    all_completed: bool
    reset_at: str   # ISO timestamp for midnight reset


class WeeklyBossOut(BaseModel):
    id: str
    title: str
    tagline: str
    description: str
    target_score: int
    xp_reward: int
    badge_key: str
    difficulty: str
    week_start: str
    user_beaten: bool
    user_best_score: int
    time_remaining_sec: int


# ─── Seed Helpers ─────────────────────────────────────────────────────────────

DAILY_MISSION_POOL = [
    {"title": "Focus Sprint",      "description": "Complete 1 simulation session.",          "type": MissionType.COMPLETE_SESSIONS,   "target": 1,  "xp": 60,  "emoji": "⚡"},
    {"title": "Iron Will",         "description": "Ignore 3 distractions in a single run.",  "type": MissionType.IGNORE_DISTRACTIONS, "target": 3,  "xp": 75,  "emoji": "🛡️"},
    {"title": "Speed Demon",       "description": "React to 2 distractions in under 3s.",    "type": MissionType.REACT_FAST,          "target": 2,  "xp": 80,  "emoji": "⚡"},
    {"title": "Perfect Pilot",     "description": "Score above 80 in a session.",            "type": MissionType.ACHIEVE_SCORE,       "target": 80, "xp": 100, "emoji": "🎯"},
    {"title": "Voice Commander",   "description": "Use voice input to make a decision.",      "type": MissionType.USE_VOICE,           "target": 1,  "xp": 50,  "emoji": "🎙️"},
    {"title": "Double Down",       "description": "Complete 2 sessions today.",               "type": MissionType.COMPLETE_SESSIONS,   "target": 2,  "xp": 120, "emoji": "🔥"},
    {"title": "No Slip",           "description": "Score 90+ in any session.",               "type": MissionType.ACHIEVE_SCORE,       "target": 90, "xp": 150, "emoji": "💎"},
    {"title": "Reflex Master",     "description": "React to 5 distractions in under 4s.",   "type": MissionType.REACT_FAST,          "target": 5,  "xp": 90,  "emoji": "🧠"},
    {"title": "Distraction Slayer","description": "Ignore 5 distractions across sessions.",  "type": MissionType.IGNORE_DISTRACTIONS, "target": 5,  "xp": 85,  "emoji": "👾"},
    {"title": "Daily Grind",       "description": "Log into the app and finish a session.",   "type": MissionType.COMPLETE_SESSIONS,   "target": 1,  "xp": 40,  "emoji": "📅"},
]

WEEKLY_BOSS_POOL = [
    {"title": "THE SILENT HOUR",      "tagline": "No mistakes allowed. Not even one.", "description": "Score 90+ across 3 sessions this week. The city watches.", "target_score": 90, "xp_reward": 300, "badge_key": "boss_silent_hour",  "difficulty": "Legendary"},
    {"title": "PHANTOM PROTOCOL",     "tagline": "Move fast. Think faster.",           "description": "React to every distraction in under 2 seconds across a full session.", "target_score": 85, "xp_reward": 350, "badge_key": "boss_phantom",        "difficulty": "Extreme"},
    {"title": "NIGHT SHIFT",          "tagline": "The real world doesn't pause.",      "description": "Complete 5 sessions this week without breaking your streak.", "target_score": 75, "xp_reward": 250, "badge_key": "boss_night_shift",    "difficulty": "Hard"},
    {"title": "UNBREAKABLE",          "tagline": "Zero. Distractions. Zero.",          "description": "Finish a full session ignoring every single distraction thrown at you.", "target_score": 100, "xp_reward": 400, "badge_key": "boss_unbreakable", "difficulty": "Mythic"},
    {"title": "THE GAUNTLET",         "tagline": "5 sessions. 5 perfect runs.",        "description": "Complete 5 sessions each scoring above 80 this week.", "target_score": 80, "xp_reward": 275, "badge_key": "boss_gauntlet",       "difficulty": "Hard"},
]


async def _ensure_today_missions(db: AsyncSession, today: date):
    """Create today's 3 missions if they don't exist yet."""
    existing = await db.execute(
        select(DailyMission).where(DailyMission.mission_date == today)
    )
    if existing.scalars().first():
        return

    picked = random.sample(DAILY_MISSION_POOL, 3)
    for i, mission_data in enumerate(picked, start=1):
        db.add(DailyMission(
            mission_date=today,
            slot=i,
            title=mission_data["title"],
            description=mission_data["description"],
            mission_type=mission_data["type"],
            target_value=mission_data["target"],
            xp_reward=mission_data["xp"],
            emoji=mission_data["emoji"],
        ))
    await db.commit()


async def _ensure_this_week_boss(db: AsyncSession, week_start: date):
    """Create this week's boss challenge if it doesn't exist."""
    existing = await db.execute(
        select(WeeklyBossChallenge).where(WeeklyBossChallenge.week_start == week_start)
    )
    if existing.scalar_one_or_none():
        return
    boss = random.choice(WEEKLY_BOSS_POOL)
    db.add(WeeklyBossChallenge(
        week_start=week_start,
        title=boss["title"],
        tagline=boss["tagline"],
        description=boss["description"],
        target_score=boss["target_score"],
        xp_reward=boss["xp_reward"],
        badge_key=boss["badge_key"],
        difficulty=boss["difficulty"],
    ))
    await db.commit()


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("/daily", response_model=DailyMissionsOut)
async def get_daily_missions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return today's 3 daily missions with the current user's progress."""
    today = date.today()
    await _ensure_today_missions(db, today)

    missions_result = await db.execute(
        select(DailyMission).where(DailyMission.mission_date == today).order_by(DailyMission.slot)
    )
    missions = missions_result.scalars().all()

    # Load user progress
    mission_ids = [m.id for m in missions]
    progress_result = await db.execute(
        select(UserMissionProgress).where(
            and_(UserMissionProgress.user_id == current_user.id,
                 UserMissionProgress.mission_id.in_(mission_ids))
        )
    )
    progress_map = {p.mission_id: p for p in progress_result.scalars().all()}

    out = []
    for m in missions:
        prog = progress_map.get(m.id)
        out.append(MissionOut(
            id=m.id,
            slot=m.slot,
            title=m.title,
            description=m.description,
            mission_type=m.mission_type.value,
            target_value=m.target_value,
            xp_reward=m.xp_reward,
            emoji=m.emoji,
            progress=prog.progress if prog else 0,
            completed=prog.completed if prog else False,
        ))

    # Reset time is midnight tonight
    from datetime import timedelta
    tomorrow = datetime.combine(today + timedelta(days=1), datetime.min.time())
    reset_at = tomorrow.isoformat()

    return DailyMissionsOut(
        missions=out,
        all_completed=all(m.completed for m in out),
        reset_at=reset_at,
    )


@router.post("/daily/{mission_id}/progress")
async def update_mission_progress(
    mission_id: str,
    increment: int = 1,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Increment a user's progress on a daily mission. Awards XP when complete."""
    mission_result = await db.execute(
        select(DailyMission).where(DailyMission.id == mission_id)
    )
    mission = mission_result.scalar_one_or_none()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    progress_result = await db.execute(
        select(UserMissionProgress).where(
            and_(UserMissionProgress.user_id == current_user.id,
                 UserMissionProgress.mission_id == mission_id)
        )
    )
    prog = progress_result.scalar_one_or_none()

    if not prog:
        prog = UserMissionProgress(user_id=current_user.id, mission_id=mission_id)
        db.add(prog)

    if prog.completed:
        return {"message": "Already completed", "xp_awarded": 0}

    prog.progress = min(prog.progress + increment, mission.target_value)
    xp_awarded = 0
    if prog.progress >= mission.target_value and not prog.completed:
        prog.completed = True
        prog.completed_at = datetime.now(timezone.utc)
        if not prog.xp_awarded:
            await award_xp(db, current_user.id, mission.xp_reward, "mission_complete")
            prog.xp_awarded = True
            xp_awarded = mission.xp_reward

    await db.commit()
    return {"progress": prog.progress, "completed": prog.completed, "xp_awarded": xp_awarded}


@router.get("/boss", response_model=WeeklyBossOut)
async def get_weekly_boss(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return this week's boss challenge and the user's attempt status."""
    from datetime import timedelta
    today = date.today()
    # Compute last Monday
    week_start = today - timedelta(days=today.weekday())
    await _ensure_this_week_boss(db, week_start)

    boss_result = await db.execute(
        select(WeeklyBossChallenge).where(WeeklyBossChallenge.week_start == week_start)
    )
    boss = boss_result.scalar_one_or_none()
    if not boss:
        raise HTTPException(status_code=404, detail="No boss challenge this week")

    attempt_result = await db.execute(
        select(UserBossAttempt).where(
            and_(UserBossAttempt.user_id == current_user.id,
                 UserBossAttempt.boss_id == boss.id)
        )
    )
    attempt = attempt_result.scalar_one_or_none()

    # Time remaining until next Monday midnight
    from datetime import timedelta
    next_monday = week_start + timedelta(days=7)
    time_remaining = int((datetime.combine(next_monday, datetime.min.time()) - datetime.now()).total_seconds())

    return WeeklyBossOut(
        id=boss.id,
        title=boss.title,
        tagline=boss.tagline,
        description=boss.description,
        target_score=boss.target_score,
        xp_reward=boss.xp_reward,
        badge_key=boss.badge_key,
        difficulty=boss.difficulty,
        week_start=boss.week_start.isoformat(),
        user_beaten=attempt.beaten if attempt else False,
        user_best_score=attempt.best_score if attempt else 0,
        time_remaining_sec=max(0, time_remaining),
    )


@router.post("/boss/{boss_id}/attempt")
async def submit_boss_attempt(
    boss_id: str,
    score: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit a score attempt for the weekly boss. Awards XP on first beat."""
    boss_result = await db.execute(
        select(WeeklyBossChallenge).where(WeeklyBossChallenge.id == boss_id)
    )
    boss = boss_result.scalar_one_or_none()
    if not boss:
        raise HTTPException(status_code=404, detail="Boss not found")

    attempt_result = await db.execute(
        select(UserBossAttempt).where(
            and_(UserBossAttempt.user_id == current_user.id,
                 UserBossAttempt.boss_id == boss_id)
        )
    )
    attempt = attempt_result.scalar_one_or_none()

    if not attempt:
        attempt = UserBossAttempt(user_id=current_user.id, boss_id=boss_id)
        db.add(attempt)

    attempt.best_score = max(attempt.best_score, score)
    xp_awarded = 0
    newly_beaten = False

    if score >= boss.target_score and not attempt.beaten:
        attempt.beaten = True
        newly_beaten = True
        if not attempt.xp_awarded:
            await award_xp(db, current_user.id, boss.xp_reward, "boss_beaten")
            attempt.xp_awarded = True
            xp_awarded = boss.xp_reward

    await db.commit()
    return {
        "best_score": attempt.best_score,
        "beaten": attempt.beaten,
        "newly_beaten": newly_beaten,
        "xp_awarded": xp_awarded,
    }


@router.post("/streak/freeze")
async def use_streak_freeze(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Consume one streak freeze token to protect the user's streak."""
    prog = await _get_or_create_progression(db, current_user.id)
    if prog.streak_freeze_tokens <= 0:
        raise HTTPException(status_code=400, detail="No streak freeze tokens available")

    prog.streak_freeze_tokens -= 1
    # Reset last activity to today so streak isn't broken
    prog.last_activity_date = date.today()
    await db.commit()
    return {
        "message": "Streak freeze used! Your streak is safe for today.",
        "tokens_remaining": prog.streak_freeze_tokens,
    }
