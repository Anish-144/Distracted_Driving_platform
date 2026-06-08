"""
Gamification routes — XP, levels, streaks, achievements, daily challenges, and friend system.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import date, datetime, timezone

from app.database import get_db
from app.models.user import User
from app.models.gamification import (
    UserProgression, Achievement, UserAchievement,
    DailyChallenge, UserDailyChallengeProgress, Friendship, FriendshipStatus,
    ChallengeType, DRIVER_IDENTITY_MAP,
)
from app.routes.auth import get_current_user
from app.services.gamification_service import (
    award_xp, update_streak, check_and_unlock_achievements,
    xp_for_level, level_from_xp, rank_from_level,
    XP_REWARDS, _get_or_create_progression,
)

router = APIRouter(prefix="/api/gamification", tags=["Gamification"])


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class AchievementOut(BaseModel):
    id: str
    key: str
    title: str
    description: str
    icon_key: str
    xp_reward: int
    category: str
    unlocked: bool
    unlocked_at: Optional[str] = None


class ProgressionOut(BaseModel):
    xp: int
    level: int
    level_progress_pct: float      # 0-100: how far through the current level
    next_level_xp: int             # XP needed to reach next level
    current_level_xp: int          # XP required for current level start
    driver_rank: str
    driver_identity: str           # Branded personality name
    current_streak: int
    longest_streak: int
    total_sessions_completed: int
    total_xp_earned: int
    achievements: List[AchievementOut]
    daily_challenge: Optional[dict] = None
    xp_to_next: int


class DailyCheckinOut(BaseModel):
    xp_awarded: int
    current_streak: int
    message: str


class FriendOut(BaseModel):
    friendship_id: str
    friend_user_id: str
    friend_name: str
    friend_rank: str
    friend_level: int
    friend_xp: int
    status: str
    challenge_active: bool
    is_requester: bool


class FriendRequestIn(BaseModel):
    email: str


class FriendActionIn(BaseModel):
    friendship_id: str


# ─── GET /api/gamification/me ─────────────────────────────────────────────────

@router.get("/me", response_model=ProgressionOut)
async def get_my_gamification(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return full gamification state for the authenticated user."""
    prog = await _get_or_create_progression(db, current_user.id)
    await db.commit()

    # XP bar math
    cur_level_xp = xp_for_level(prog.level)
    nxt_level_xp = xp_for_level(prog.level + 1) if prog.level < 100 else prog.xp + 1
    xp_in_level = prog.xp - cur_level_xp
    xp_span = nxt_level_xp - cur_level_xp
    level_progress_pct = round(min(max((xp_in_level / xp_span) * 100, 0), 100), 1) if xp_span > 0 else 100.0
    xp_to_next = max(0, nxt_level_xp - prog.xp)

    # Driver identity label
    raw_profile = current_user.profile_type.value if hasattr(current_user.profile_type, 'value') else str(current_user.profile_type)
    driver_identity = DRIVER_IDENTITY_MAP.get(raw_profile, "Unknown Driver")

    # Achievements
    all_ach_result = await db.execute(select(Achievement))
    all_achievements = all_ach_result.scalars().all()

    unlocked_stmt = (
        select(UserAchievement)
        .where(UserAchievement.user_id == current_user.id)
    )
    unlocked_result = await db.execute(unlocked_stmt)
    unlocked_map = {ua.achievement_id: ua for ua in unlocked_result.scalars().all()}

    achievements_out = []
    for ach in sorted(all_achievements, key=lambda a: a.category):
        ua = unlocked_map.get(ach.id)
        achievements_out.append(AchievementOut(
            id=ach.id,
            key=ach.key,
            title=ach.title,
            description=ach.description,
            icon_key=ach.icon_key,
            xp_reward=ach.xp_reward,
            category=ach.category,
            unlocked=ua is not None,
            unlocked_at=ua.unlocked_at.isoformat() if ua else None,
        ))

    # Daily challenge
    today = date.today()
    challenge_result = await db.execute(
        select(DailyChallenge).where(DailyChallenge.challenge_date == today)
    )
    daily = challenge_result.scalar_one_or_none()
    daily_out = None
    if daily:
        prog_result = await db.execute(
            select(UserDailyChallengeProgress).where(
                UserDailyChallengeProgress.user_id == current_user.id,
                UserDailyChallengeProgress.challenge_id == daily.id,
            )
        )
        udcp = prog_result.scalar_one_or_none()
        daily_out = {
            "id": daily.id,
            "title": daily.title,
            "description": daily.description,
            "challenge_type": daily.challenge_type.value,
            "target_value": daily.target_value,
            "xp_reward": daily.xp_reward,
            "progress": udcp.progress if udcp else 0,
            "completed": udcp.completed if udcp else False,
        }

    return ProgressionOut(
        xp=prog.xp,
        level=prog.level,
        level_progress_pct=level_progress_pct,
        next_level_xp=nxt_level_xp,
        current_level_xp=cur_level_xp,
        driver_rank=prog.driver_rank,
        driver_identity=driver_identity,
        current_streak=prog.current_streak,
        longest_streak=prog.longest_streak,
        total_sessions_completed=prog.total_sessions_completed,
        total_xp_earned=prog.total_xp_earned,
        achievements=achievements_out,
        daily_challenge=daily_out,
        xp_to_next=xp_to_next,
    )


# ─── POST /api/gamification/daily-checkin ────────────────────────────────────

@router.post("/daily-checkin", response_model=DailyCheckinOut)
async def daily_checkin(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Award daily login XP and update streak. Idempotent for the same calendar day."""
    prog = await _get_or_create_progression(db, current_user.id)
    today = date.today()

    if prog.last_activity_date == today:
        return DailyCheckinOut(
            xp_awarded=0,
            current_streak=prog.current_streak,
            message="Already checked in today! Come back tomorrow to keep your streak. 🔥",
        )

    xp_result = await award_xp(db, current_user.id, XP_REWARDS["daily_login"], "daily_login")
    streak_info = await update_streak(db, current_user.id)
    await check_and_unlock_achievements(db, current_user.id, context={"streak": streak_info["current_streak"]})
    await db.commit()

    streak = streak_info["current_streak"]
    if streak >= 7:
        msg = f"🔥 {streak}-day streak! You're on fire!"
    elif streak >= 3:
        msg = f"⚡ {streak}-day streak! Keep it going!"
    else:
        msg = f"Welcome back! Day {streak} started. +{XP_REWARDS['daily_login']} XP"

    return DailyCheckinOut(
        xp_awarded=XP_REWARDS["daily_login"],
        current_streak=streak,
        message=msg,
    )


# ─── Friend System ────────────────────────────────────────────────────────────

@router.post("/friends/request", status_code=status.HTTP_201_CREATED)
async def send_friend_request(
    body: FriendRequestIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send a friend request by email."""
    target_result = await db.execute(select(User).where(User.email == body.email))
    target = target_result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")
    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot friend yourself.")

    existing = await db.execute(
        select(Friendship).where(
            or_(
                and_(Friendship.requester_id == current_user.id, Friendship.addressee_id == target.id),
                and_(Friendship.requester_id == target.id, Friendship.addressee_id == current_user.id),
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Friend request already exists or you are already friends.")

    friendship = Friendship(requester_id=current_user.id, addressee_id=target.id)
    db.add(friendship)
    await db.commit()

    # Check social achievement
    await check_and_unlock_achievements(db, current_user.id, context={"has_friend": True})
    await db.commit()

    return {"message": f"Friend request sent to {target.name}.", "friendship_id": friendship.id}


@router.get("/friends", response_model=List[FriendOut])
async def get_friends(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all accepted friends with their gamification stats."""
    result = await db.execute(
        select(Friendship).where(
            or_(
                Friendship.requester_id == current_user.id,
                Friendship.addressee_id == current_user.id,
            )
        )
    )
    friendships = result.scalars().all()

    friends_out = []
    for f in friendships:
        is_requester = f.requester_id == current_user.id
        friend_id = f.addressee_id if is_requester else f.requester_id

        friend_result = await db.execute(select(User).where(User.id == friend_id))
        friend_user = friend_result.scalar_one_or_none()
        if not friend_user:
            continue

        friend_prog_result = await db.execute(
            select(UserProgression).where(UserProgression.user_id == friend_id)
        )
        friend_prog = friend_prog_result.scalar_one_or_none()

        friends_out.append(FriendOut(
            friendship_id=f.id,
            friend_user_id=friend_id,
            friend_name=friend_user.name,
            friend_rank=friend_prog.driver_rank if friend_prog else "Rookie",
            friend_level=friend_prog.level if friend_prog else 1,
            friend_xp=friend_prog.xp if friend_prog else 0,
            status=f.status.value,
            challenge_active=f.challenge_active,
            is_requester=is_requester,
        ))

    return friends_out


@router.post("/friends/accept")
async def accept_friend_request(
    body: FriendActionIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Accept an incoming friend request."""
    result = await db.execute(
        select(Friendship).where(
            Friendship.id == body.friendship_id,
            Friendship.addressee_id == current_user.id,
            Friendship.status == FriendshipStatus.PENDING,
        )
    )
    f = result.scalar_one_or_none()
    if not f:
        raise HTTPException(status_code=404, detail="Pending friend request not found.")
    f.status = FriendshipStatus.ACCEPTED
    db.add(f)
    await db.commit()
    await check_and_unlock_achievements(db, current_user.id, context={"has_friend": True})
    await db.commit()
    return {"message": "Friend request accepted!"}


@router.post("/friends/challenge")
async def challenge_friend(
    body: FriendActionIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Start a focus duel challenge with a friend."""
    result = await db.execute(
        select(Friendship).where(
            Friendship.id == body.friendship_id,
            Friendship.status == FriendshipStatus.ACCEPTED,
            or_(
                Friendship.requester_id == current_user.id,
                Friendship.addressee_id == current_user.id,
            )
        )
    )
    f = result.scalar_one_or_none()
    if not f:
        raise HTTPException(status_code=404, detail="Accepted friendship not found.")
    f.challenge_active = True
    db.add(f)
    await db.commit()
    await check_and_unlock_achievements(db, current_user.id, context={"challenged_friend": True})
    await db.commit()
    return {"message": "Challenge issued! May the best driver win. 🏆"}


@router.delete("/friends/{friendship_id}")
async def remove_friend(
    friendship_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove or decline a friendship."""
    result = await db.execute(
        select(Friendship).where(
            Friendship.id == friendship_id,
            or_(
                Friendship.requester_id == current_user.id,
                Friendship.addressee_id == current_user.id,
            )
        )
    )
    f = result.scalar_one_or_none()
    if not f:
        raise HTTPException(status_code=404, detail="Friendship not found.")
    await db.delete(f)
    await db.commit()
    return {"message": "Friendship removed."}


# ─── XP Leaderboard ──────────────────────────────────────────────────────────

@router.get("/leaderboard")
async def get_xp_leaderboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Global XP leaderboard — top 50 players ranked by total XP."""
    result = await db.execute(
        select(UserProgression, User)
        .join(User, User.id == UserProgression.user_id)
        .order_by(UserProgression.xp.desc())
        .limit(50)
    )
    rows = result.fetchall()

    entries = []
    current_rank = None
    for idx, (prog, user) in enumerate(rows, start=1):
        is_current = user.id == current_user.id
        if is_current:
            current_rank = idx
        entries.append({
            "rank": idx,
            "display_name": (user.name or "Driver").split()[0],
            "driver_rank": prog.driver_rank,
            "level": prog.level,
            "xp": prog.xp,
            "current_streak": prog.current_streak,
            "is_current_user": is_current,
        })

    return {
        "entries": entries,
        "current_user_rank": current_rank,
        "total_participants": len(entries),
    }
