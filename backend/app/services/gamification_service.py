"""
Gamification service — XP awards, level-ups, streak tracking, and achievement checking.
"""

import logging
from datetime import date, datetime, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

logger = logging.getLogger(__name__)

# ─── Seed Data for Achievements ───────────────────────────────────────────────

SEED_ACHIEVEMENTS = [
    # Onboarding
    {"key": "first_steps",        "title": "First Steps",         "description": "Complete your very first simulation session.",         "icon_key": "rocket",       "xp_reward": 50,  "category": "milestone"},
    {"key": "committed",          "title": "Committed",           "description": "Complete 5 simulation sessions.",                      "icon_key": "flag",         "xp_reward": 100, "category": "milestone"},
    {"key": "dedicated",          "title": "Dedicated",           "description": "Complete 25 simulation sessions.",                     "icon_key": "shield",       "xp_reward": 200, "category": "milestone"},
    {"key": "focus_guardian",     "title": "Focus Guardian",      "description": "Complete 50 simulation sessions.",                     "icon_key": "eye",          "xp_reward": 350, "category": "milestone"},
    # Streaks
    {"key": "streak_3",           "title": "On Fire",             "description": "Maintain a 3-day activity streak.",                    "icon_key": "flame",        "xp_reward": 50,  "category": "streak"},
    {"key": "streak_7",           "title": "Week Warrior",        "description": "Maintain a 7-day activity streak.",                    "icon_key": "flame",        "xp_reward": 100, "category": "streak"},
    {"key": "streak_14",          "title": "Two-Week Titan",      "description": "Maintain a 14-day activity streak.",                   "icon_key": "flame",        "xp_reward": 200, "category": "streak"},
    {"key": "streak_30",          "title": "Elite Focus",         "description": "Maintain a 30-day activity streak.",                   "icon_key": "crown",        "xp_reward": 400, "category": "streak"},
    {"key": "streak_60",          "title": "Unstoppable",         "description": "Maintain a 60-day activity streak.",                   "icon_key": "zap",          "xp_reward": 700, "category": "streak"},
    {"key": "streak_100",         "title": "Road Legend",         "description": "Maintain a 100-day activity streak.",                  "icon_key": "trophy",       "xp_reward": 1500,"category": "streak"},
    # Performance
    {"key": "perfect_run",        "title": "Perfect Run",         "description": "Score 100% in a simulation session.",                  "icon_key": "star",         "xp_reward": 150, "category": "performance"},
    {"key": "notification_ninja", "title": "Notification Ninja",  "description": "Ignore 50 distractions across all sessions.",          "icon_key": "bell_off",     "xp_reward": 200, "category": "performance"},
    {"key": "fast_thinker",       "title": "Fast Thinker",        "description": "Achieve an average reaction score above 90% in 5 sessions.", "icon_key": "zap",   "xp_reward": 175, "category": "performance"},
    {"key": "no_mistakes",        "title": "Clean Sheet",         "description": "Finish a session with zero unsafe interactions.",      "icon_key": "check_circle", "xp_reward": 100, "category": "performance"},
    # Social
    {"key": "social_butterfly",   "title": "Social Butterfly",    "description": "Add your first friend.",                               "icon_key": "users",        "xp_reward": 75,  "category": "social"},
    {"key": "challenger",         "title": "Challenger",          "description": "Challenge a friend to a focus duel.",                  "icon_key": "swords",       "xp_reward": 100, "category": "social"},
    # Level milestones
    {"key": "level_10",           "title": "Street Smart",        "description": "Reach Level 10.",                                      "icon_key": "map",          "xp_reward": 100, "category": "level"},
    {"key": "level_25",           "title": "Sharp Instinct",      "description": "Reach Level 25.",                                      "icon_key": "crosshair",    "xp_reward": 250, "category": "level"},
    {"key": "level_50",           "title": "Elite Driver",        "description": "Reach Level 50.",                                      "icon_key": "medal",        "xp_reward": 500, "category": "level"},
    {"key": "level_100",          "title": "Road Legend",         "description": "Reach Level 100.",                                     "icon_key": "trophy",       "xp_reward": 2000,"category": "level"},
]


# ─── XP Award Reasons ─────────────────────────────────────────────────────────

XP_REWARDS = {
    "session_complete":   50,
    "perfect_session":    25,   # bonus — stacks with session_complete
    "no_mistakes":        25,   # bonus
    "daily_login":        10,
    "lesson_complete":    20,
    "streak_3":           50,
    "streak_7":           100,
    "streak_14":          200,
    "streak_30":          400,
    "streak_60":          700,
    "streak_100":         1500,
    "challenge_complete": 75,
}


# ─── Core helpers ─────────────────────────────────────────────────────────────

def xp_for_level(level: int) -> int:
    """Total XP required to reach `level`."""
    return int(100 * (level ** 1.6))


def level_from_xp(xp: int) -> int:
    level = 1
    while level < 100 and xp_for_level(level + 1) <= xp:
        level += 1
    return level


_RANK_THRESHOLDS = [
    (1,  "Rookie"),
    (5,  "Focus Driver"),
    (10, "Street Smart"),
    (15, "Road Aware"),
    (20, "Road Guardian"),
    (25, "Sharp Instinct"),
    (30, "Calm Navigator"),
    (35, "Focus Master"),
    (40, "Precision Thinker"),
    (45, "Adaptive Driver"),
    (50, "Elite Driver"),
    (60, "Strategic Operator"),
    (75, "Hazard Hunter"),
    (90, "Reflex Sovereign"),
    (100,"Road Legend"),
]


def rank_from_level(level: int) -> str:
    rank = "Rookie"
    for threshold, title in _RANK_THRESHOLDS:
        if level >= threshold:
            rank = title
        else:
            break
    return rank


# ─── Get or Create Progression ────────────────────────────────────────────────

async def _get_or_create_progression(db: AsyncSession, user_id: str):
    from app.models.gamification import UserProgression
    result = await db.execute(
        select(UserProgression).where(UserProgression.user_id == user_id)
    )
    prog = result.scalar_one_or_none()
    if prog is None:
        prog = UserProgression(user_id=user_id)
        db.add(prog)
        await db.flush()
    return prog


# ─── Award XP ─────────────────────────────────────────────────────────────────

async def award_xp(
    db: AsyncSession,
    user_id: str,
    amount: int,
    reason: str = "activity",
) -> dict:
    """
    Award XP to a user. Returns a dict with new XP, level, rank, and whether
    a level-up occurred so the frontend can trigger the animation.
    """
    prog = await _get_or_create_progression(db, user_id)
    old_level = prog.level

    prog.xp += amount
    prog.total_xp_earned += amount
    new_level = level_from_xp(prog.xp)
    prog.level = new_level
    prog.driver_rank = rank_from_level(new_level)

    leveled_up = new_level > old_level
    if leveled_up:
        logger.info("🎉 User %s leveled up %d → %d (%s)", user_id, old_level, new_level, prog.driver_rank)

    db.add(prog)
    # Caller is responsible for commit

    return {
        "xp_awarded": amount,
        "reason": reason,
        "total_xp": prog.xp,
        "level": new_level,
        "rank": prog.driver_rank,
        "leveled_up": leveled_up,
        "old_level": old_level,
        "next_level_xp": xp_for_level(new_level + 1) if new_level < 100 else prog.xp,
    }


# ─── Update Streak ────────────────────────────────────────────────────────────

async def update_streak(db: AsyncSession, user_id: str) -> dict:
    """
    Call on any daily user activity. Returns streak info including whether
    a streak milestone was just hit (for achievement checking).
    """
    prog = await _get_or_create_progression(db, user_id)
    today = date.today()

    if prog.last_activity_date == today:
        # Already counted today
        return {"current_streak": prog.current_streak, "milestone_hit": None}

    if prog.last_activity_date is not None:
        delta = (today - prog.last_activity_date).days
        if delta == 1:
            prog.current_streak += 1
        elif delta > 1:
            prog.current_streak = 1  # streak broken
    else:
        prog.current_streak = 1

    prog.last_activity_date = today
    if prog.current_streak > prog.longest_streak:
        prog.longest_streak = prog.current_streak

    db.add(prog)

    # Check for streak milestone
    milestones = {3, 7, 14, 30, 60, 100}
    milestone_hit = prog.current_streak if prog.current_streak in milestones else None

    return {
        "current_streak": prog.current_streak,
        "longest_streak": prog.longest_streak,
        "milestone_hit": milestone_hit,
    }


# ─── Achievement Checking ─────────────────────────────────────────────────────

async def check_and_unlock_achievements(
    db: AsyncSession,
    user_id: str,
    context: Optional[dict] = None,
) -> list[str]:
    """
    Check all unlockable achievements for this user given the current context.
    Returns list of newly unlocked achievement keys.
    Context keys: sessions_completed, perfect_session, clean_sheet,
                  streak, ignored_distractions, level, has_friend, challenged_friend.
    """
    from app.models.gamification import Achievement, UserAchievement, UserProgression
    from app.models.session import Session as DBSession

    if context is None:
        context = {}

    # Fetch already unlocked achievement keys for this user
    existing_stmt = (
        select(Achievement.key)
        .join(UserAchievement, UserAchievement.achievement_id == Achievement.id)
        .where(UserAchievement.user_id == user_id)
    )
    existing_result = await db.execute(existing_stmt)
    unlocked_keys = set(row[0] for row in existing_result.fetchall())

    # Fetch all achievements
    all_ach_result = await db.execute(select(Achievement))
    all_achievements = {a.key: a for a in all_ach_result.scalars().all()}

    # Fetch prog for level / streak checks
    prog_result = await db.execute(
        select(UserProgression).where(UserProgression.user_id == user_id)
    )
    prog = prog_result.scalar_one_or_none()

    # Fetch sessions count
    sessions_count = context.get("sessions_completed")
    if sessions_count is None:
        count_result = await db.execute(
            select(DBSession).where(
                DBSession.user_id == user_id,
                DBSession.end_time.isnot(None)
            )
        )
        sessions_count = len(count_result.scalars().all())

    level = prog.level if prog else 1
    streak = prog.current_streak if prog else 0

    newly_unlocked = []

    def maybe_unlock(key: str):
        if key in unlocked_keys or key not in all_achievements:
            return
        ach = all_achievements[key]
        ua = UserAchievement(user_id=user_id, achievement_id=ach.id)
        db.add(ua)
        unlocked_keys.add(key)
        newly_unlocked.append(key)
        logger.info("🏆 Achievement unlocked for user %s: %s (+%d XP)", user_id, key, ach.xp_reward)

    # Milestone achievements
    if sessions_count >= 1:  maybe_unlock("first_steps")
    if sessions_count >= 5:  maybe_unlock("committed")
    if sessions_count >= 25: maybe_unlock("dedicated")
    if sessions_count >= 50: maybe_unlock("focus_guardian")

    # Streak achievements
    if streak >= 3:   maybe_unlock("streak_3")
    if streak >= 7:   maybe_unlock("streak_7")
    if streak >= 14:  maybe_unlock("streak_14")
    if streak >= 30:  maybe_unlock("streak_30")
    if streak >= 60:  maybe_unlock("streak_60")
    if streak >= 100: maybe_unlock("streak_100")

    # Level achievements
    if level >= 10:  maybe_unlock("level_10")
    if level >= 25:  maybe_unlock("level_25")
    if level >= 50:  maybe_unlock("level_50")
    if level >= 100: maybe_unlock("level_100")

    # Context-based
    if context.get("perfect_session"):     maybe_unlock("perfect_run")
    if context.get("clean_sheet"):         maybe_unlock("no_mistakes")
    if context.get("has_friend"):          maybe_unlock("social_butterfly")
    if context.get("challenged_friend"):   maybe_unlock("challenger")

    # Award XP for newly unlocked achievements
    for key in newly_unlocked:
        ach = all_achievements[key]
        if ach.xp_reward > 0:
            await award_xp(db, user_id, ach.xp_reward, reason=f"achievement:{key}")

    return newly_unlocked


# ─── Session Completion Hook ──────────────────────────────────────────────────

async def on_session_complete(
    db: AsyncSession,
    user_id: str,
    score: float,
    safe_interactions: int = 0,
    unsafe_interactions: int = 0,
) -> dict:
    """
    Master hook — call at session end. Awards XP, updates streak, checks achievements.
    Returns summary for the API response.
    """
    xp_total = 0

    # Base session XP
    result = await award_xp(db, user_id, XP_REWARDS["session_complete"], "session_complete")
    xp_total += XP_REWARDS["session_complete"]

    # Perfect bonus
    perfect = score >= 98.0
    if perfect:
        await award_xp(db, user_id, XP_REWARDS["perfect_session"], "perfect_session")
        xp_total += XP_REWARDS["perfect_session"]

    # Clean sheet bonus
    clean = unsafe_interactions == 0
    if clean:
        await award_xp(db, user_id, XP_REWARDS["no_mistakes"], "no_mistakes")
        xp_total += XP_REWARDS["no_mistakes"]

    # Streak update
    streak_info = await update_streak(db, user_id)

    # Streak milestone XP
    if streak_info["milestone_hit"]:
        key = f"streak_{streak_info['milestone_hit']}"
        milestone_xp = XP_REWARDS.get(key, 0)
        if milestone_xp > 0:
            await award_xp(db, user_id, milestone_xp, key)
            xp_total += milestone_xp

    # Update sessions completed count
    from app.models.gamification import UserProgression
    prog = await _get_or_create_progression(db, user_id)
    prog.total_sessions_completed += 1
    db.add(prog)

    # Check achievements
    newly_unlocked = await check_and_unlock_achievements(
        db, user_id,
        context={
            "sessions_completed": prog.total_sessions_completed,
            "perfect_session": perfect,
            "clean_sheet": clean,
            "streak": streak_info["current_streak"],
        }
    )

    return {
        "xp_earned_this_session": xp_total,
        "streak": streak_info["current_streak"],
        "newly_unlocked_achievements": newly_unlocked,
        "level": prog.level,
        "rank": prog.driver_rank,
    }
