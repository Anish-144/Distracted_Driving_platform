"""
Session model — represents one training simulation run by a user.
"""

import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Float, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    score: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    start_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    end_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="sessions")
    events: Mapped[list["Event"]] = relationship("Event", back_populates="session", lazy="select")
    behavioral_logs: Mapped[list["BehavioralLog"]] = relationship(
        "BehavioralLog", back_populates="session", lazy="select"
    )

    def __repr__(self) -> str:
        return f"<Session id={self.id} user_id={self.user_id} score={self.score}>"
