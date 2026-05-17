"""
Behavioral State Model — persistent per-user behavioral intelligence.
Tracks lifetime patterns and current session state.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Integer, Float, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class BehavioralState(Base):
    __tablename__ = "behavioral_states"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    # One record per user (UNIQUE constraint enforced)
    user_id: Mapped[str] = mapped_column(String(36), unique=True, nullable=False, index=True)

    # ── Lifetime Decision Counters ────────────────────────────────────────────
    total_events: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    safe_decisions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    unsafe_decisions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    impulsive_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)   # unsafe + < 2s
    hesitant_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)    # any response > 5s

    # ── Session State (soft-reset per session) ────────────────────────────────
    consecutive_mistakes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    pressure_level: Mapped[int] = mapped_column(Integer, default=0, nullable=False)   # 0–3

    # ── Timing Analytics ──────────────────────────────────────────────────────
    avg_reaction_time: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    fastest_reaction: Mapped[float] = mapped_column(Float, default=99.0, nullable=False)
    slowest_reaction: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # ── Pattern Tracking ──────────────────────────────────────────────────────
    # Serialized as "incoming_call:3,whatsapp_notification:1"
    fail_scenario_counts: Mapped[str] = mapped_column(String(512), default="", nullable=False)
    dominant_fail_scenario: Mapped[str] = mapped_column(String(64), default="", nullable=False)

    # ── Pressure Response ─────────────────────────────────────────────────────
    pressure_yield_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    pressure_resist_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    def __repr__(self) -> str:
        return (
            f"<BehavioralState user={self.user_id} "
            f"safe={self.safe_decisions} unsafe={self.unsafe_decisions} "
            f"pressure={self.pressure_level}>"
        )
