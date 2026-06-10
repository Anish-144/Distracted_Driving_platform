"""
Gamification models — XP, levels, streaks, achievements, daily challenges, and social friendships.
"""

import uuid
from datetime import datetime, date
from sqlalchemy import (
    String, Integer, DateTime, Date, Float, Boolean, Text,
    ForeignKey, func, UniqueConstraint, Enum as SAEnum
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
import enum


# ─── Enums ────────────────────────────────────────────────────────────────────

class FriendshipStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    BLOCKED = "blocked"


class ChallengeType(str, enum.Enum):
    COMPLETE_SESSIONS = "complete_sessions"
    ACHIEVE_SCORE = "achieve_score"
    MAINTAIN_STREAK = "maintain_streak"
    BEAT_FRIEND = "beat_friend"


# ─── Level / Rank Table ───────────────────────────────────────────────────────

LEVEL_TABLE = [
    (1,   "Rookie",              0),
    (10,  "Iron",                1200),
    (25,  "Silver",              7500),
    (40,  "Gold",                22000),
    (55,  "Platinum",            40000),
    (75,  "Diamond",             75000),
    (100, "Phantom",             130000),
]

DRIVER_IDENTITY_MAP = {
    "unknown":        "Unknown Driver",
    "bolt":           "Bolt",
    "viper":          "Viper",
    "nova":           "Nova",
    "phantom":        "Phantom",
    "guardian":       "Guardian",
}


def xp_for_level(level: int) -> int:
    """Return total XP required to reach this level."""
    base = 100
    return int(base * (level ** 1.6))


def level_from_xp(xp: int) -> int:
    """Compute current level from total XP."""
    level = 1
    while xp_for_level(level + 1) <= xp and level < 100:
        level += 1
    return level


def rank_from_level(level: int) -> str:
    """Return the named rank for a given level."""
    rank = "Rookie"
    for threshold_level, title, _ in LEVEL_TABLE:
        if level >= threshold_level:
            rank = title
        else:
            break
    return rank


# ─── Models ───────────────────────────────────────────────────────────────────

class UserProgression(Base):
    """Tracks XP, level, streak, and rank for each user."""
    __tablename__ = "user_progressions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, unique=True, index=True
    )
    xp: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    level: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    driver_rank: Mapped[str] = mapped_column(String(60), default="Rookie", nullable=False)
    current_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    longest_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    streak_freeze_tokens: Mapped[int] = mapped_column(Integer, default=2, nullable=False)

    # Phase 3 Evolution Fields
    class_tier: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    class_xp_progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    class_evolution_at: Mapped[int] = mapped_column(Integer, default=2500, nullable=False)

    last_activity_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    total_sessions_completed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_xp_earned: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user = relationship("User", backref="progression", uselist=False)

    def __repr__(self) -> str:
        return f"<UserProgression user={self.user_id} xp={self.xp} level={self.level}>"


class Achievement(Base):
    """Static catalog of all possible achievements."""
    __tablename__ = "achievements"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    key: Mapped[str] = mapped_column(String(60), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    icon_key: Mapped[str] = mapped_column(String(60), default="star", nullable=False)
    xp_reward: Mapped[int] = mapped_column(Integer, default=50, nullable=False)
    category: Mapped[str] = mapped_column(String(40), default="general", nullable=False)

    user_achievements: Mapped[list["UserAchievement"]] = relationship(
        "UserAchievement", back_populates="achievement", lazy="select"
    )

    def __repr__(self) -> str:
        return f"<Achievement key={self.key} xp={self.xp_reward}>"


class UserAchievement(Base):
    """Join table — records when a user unlocked a specific achievement."""
    __tablename__ = "user_achievements"
    __table_args__ = (UniqueConstraint("user_id", "achievement_id", name="uq_user_achievement"),)

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    achievement_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("achievements.id", ondelete="CASCADE"), nullable=False
    )
    unlocked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    achievement: Mapped["Achievement"] = relationship("Achievement", back_populates="user_achievements")

    def __repr__(self) -> str:
        return f"<UserAchievement user={self.user_id} achievement={self.achievement_id}>"


class DailyChallenge(Base):
    """Daily missions assigned to the platform. One active challenge per day."""
    __tablename__ = "daily_challenges"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    challenge_date: Mapped[date] = mapped_column(Date, nullable=False, unique=True, index=True)
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    challenge_type: Mapped[ChallengeType] = mapped_column(
        SAEnum(ChallengeType, values_callable=lambda x: [e.value for e in x]),
        nullable=False
    )
    target_value: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    xp_reward: Mapped[int] = mapped_column(Integer, default=75, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    def __repr__(self) -> str:
        return f"<DailyChallenge date={self.challenge_date} title={self.title}>"


class UserDailyChallengeProgress(Base):
    """Tracks each user's progress on the daily challenge."""
    __tablename__ = "user_daily_challenge_progress"
    __table_args__ = (UniqueConstraint("user_id", "challenge_id", name="uq_user_challenge"),)

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    challenge_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("daily_challenges.id", ondelete="CASCADE"), nullable=False
    )
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    xp_awarded: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    challenge: Mapped["DailyChallenge"] = relationship("DailyChallenge")

    def __repr__(self) -> str:
        return f"<UserDailyChallengeProgress user={self.user_id} progress={self.progress}>"


class Friendship(Base):
    """Social friendship / challenge relationship between two users."""
    __tablename__ = "friendships"
    __table_args__ = (UniqueConstraint("requester_id", "addressee_id", name="uq_friendship_pair"),)

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    requester_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    addressee_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[FriendshipStatus] = mapped_column(
        SAEnum(FriendshipStatus, values_callable=lambda x: [e.value for e in x]),
        default=FriendshipStatus.PENDING, nullable=False
    )
    challenge_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    requester = relationship("User", foreign_keys=[requester_id], backref="sent_friend_requests")
    addressee = relationship("User", foreign_keys=[addressee_id], backref="received_friend_requests")

    def __repr__(self) -> str:
        return f"<Friendship {self.requester_id} -> {self.addressee_id} [{self.status}]>"


# ─── Daily Missions ───────────────────────────────────────────────────────────

class MissionType(str, enum.Enum):
    COMPLETE_SESSIONS   = "complete_sessions"
    ACHIEVE_SCORE       = "achieve_score"
    IGNORE_DISTRACTIONS = "ignore_distractions"
    REACT_FAST          = "react_fast"
    USE_VOICE           = "use_voice"


class DailyMission(Base):
    """3 rotating micro-goals assigned fresh every day."""
    __tablename__ = "daily_missions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    mission_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    slot: Mapped[int] = mapped_column(Integer, nullable=False)  # 1, 2, or 3
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    mission_type: Mapped[MissionType] = mapped_column(
        SAEnum(MissionType, values_callable=lambda x: [e.value for e in x]),
        nullable=False
    )
    target_value: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    xp_reward: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    emoji: Mapped[str] = mapped_column(String(10), default="🎯", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (UniqueConstraint("mission_date", "slot", name="uq_mission_date_slot"),)

    def __repr__(self) -> str:
        return f"<DailyMission {self.mission_date} slot={self.slot} title={self.title}>"


class UserMissionProgress(Base):
    """Tracks each user's progress on each daily mission."""
    __tablename__ = "user_mission_progress"
    __table_args__ = (UniqueConstraint("user_id", "mission_id", name="uq_user_mission"),)

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    mission_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("daily_missions.id", ondelete="CASCADE"), nullable=False
    )
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    xp_awarded: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    mission: Mapped["DailyMission"] = relationship("DailyMission")


# ─── Weekly Boss Challenge ─────────────────────────────────────────────────────

class WeeklyBossChallenge(Base):
    """One hard challenge that resets every Monday. Beating it earns an exclusive badge."""
    __tablename__ = "weekly_boss_challenges"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    week_start: Mapped[date] = mapped_column(Date, nullable=False, unique=True, index=True)
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    tagline: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    target_score: Mapped[int] = mapped_column(Integer, default=85, nullable=False)
    xp_reward: Mapped[int] = mapped_column(Integer, default=300, nullable=False)
    badge_key: Mapped[str] = mapped_column(String(60), nullable=False)
    difficulty: Mapped[str] = mapped_column(String(20), default="Hard", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    def __repr__(self) -> str:
        return f"<WeeklyBossChallenge week={self.week_start} title={self.title}>"


class UserBossAttempt(Base):
    """Tracks if a user has beaten this week's boss."""
    __tablename__ = "user_boss_attempts"
    __table_args__ = (UniqueConstraint("user_id", "boss_id", name="uq_user_boss"),)

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    boss_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("weekly_boss_challenges.id", ondelete="CASCADE"), nullable=False
    )
    best_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    beaten: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    xp_awarded: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    attempted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    boss: Mapped["WeeklyBossChallenge"] = relationship("WeeklyBossChallenge")

    def __repr__(self) -> str:
        return f"<UserBossAttempt user={self.user_id} beaten={self.beaten}>"
