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
    (5,   "Focus Driver",        400),
    (10,  "Street Smart",        1200),
    (15,  "Road Aware",          2500),
    (20,  "Road Guardian",       4500),
    (25,  "Sharp Instinct",      7500),
    (30,  "Calm Navigator",      11000),
    (35,  "Focus Master",        16000),
    (40,  "Precision Thinker",   22000),
    (45,  "Adaptive Driver",     30000),
    (50,  "Elite Driver",        40000),
    (60,  "Strategic Operator",  55000),
    (75,  "Hazard Hunter",       75000),
    (90,  "Reflex Sovereign",    100000),
    (100, "Road Legend",         130000),
]

DRIVER_IDENTITY_MAP = {
    "unknown":        "Unknown Driver",
    "impulsive":      "Impulse Chaser",
    "overconfident":  "Risk Taker",
    "anxious":        "Cautious Navigator",
    "distractible":   "Attention Seeker",
    "rule_following": "Focus Guardian",
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
