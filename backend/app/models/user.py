"""
User model — stores registered users and their behavioral profile type.
"""

import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, func, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
import enum


class ProfileType(str, enum.Enum):
    UNKNOWN = "unknown"
    IMPULSIVE = "impulsive"
    OVERCONFIDENT = "overconfident"
    ANXIOUS = "anxious"
    DISTRACTIBLE = "distractible"
    RULE_FOLLOWING = "rule_following"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    profile_type: Mapped[ProfileType] = mapped_column(
        SAEnum(ProfileType), default=ProfileType.UNKNOWN, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    sessions: Mapped[list["Session"]] = relationship("Session", back_populates="user", lazy="select")

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email} profile={self.profile_type}>"
