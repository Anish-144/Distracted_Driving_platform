"""
BehavioralLog model — aggregated behavioral analysis per session.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import String, DateTime, ForeignKey, Text, Boolean, func, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
import enum

if TYPE_CHECKING:
    from app.models.session import Session



class DecisionType(str, enum.Enum):
    IMPULSIVE_UNSAFE = "impulsive_unsafe"    # response_time < 2s and interacted
    ACCEPTABLE = "acceptable"               # response_time 2-5s
    DELAYED_HESITANT = "delayed_hesitant"   # response_time > 5s
    SAFE_IGNORE = "safe_ignore"             # correctly ignored distraction
    RISKY = "risky"                         # interacted regardless of timing


class BehavioralLog(Base):
    __tablename__ = "behavioral_logs"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    decision_type: Mapped[DecisionType] = mapped_column(SAEnum(DecisionType), nullable=False)
    pattern_flags: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="Comma-separated pattern tags (e.g., quick_reactor, frequent_distraction)"
    )
    is_risky: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    logged_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    session: Mapped["Session"] = relationship("Session", back_populates="behavioral_logs")

    def __repr__(self) -> str:
        return f"<BehavioralLog id={self.id} decision={self.decision_type} risky={self.is_risky}>"
