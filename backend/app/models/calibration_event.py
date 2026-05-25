"""
CalibrationEvent model — raw behavioral telemetry from onboarding micro-simulations.

Each record captures one behavioral calibration scenario run:
  - Raw interaction timing signals (hesitation, response time, distraction clicks)
  - Extracted trait evidence vectors from each scenario
  - Raw telemetry JSON for auditability and future re-scoring

Design principle: additive to PersonalityProfile; does NOT replace simulation BehavioralState.
"""

import uuid
from datetime import datetime
from sqlalchemy import String, Float, Integer, Text, DateTime, func, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class CalibrationEvent(Base):
    __tablename__ = "calibration_events"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), nullable=False, index=True,
        comment="Foreign key to users.id — not enforced at DB level for resilience"
    )

    # ── Scenario Identity ─────────────────────────────────────────────────────
    scenario_id: Mapped[str] = mapped_column(
        String(16), nullable=False,
        comment="e.g. S1, S2, S3, S4, S5, S6"
    )
    scenario_name: Mapped[str] = mapped_column(
        String(64), nullable=False,
        comment="Human label: navigation_interrupt, countdown_clock, etc."
    )

    # ── Primary Behavioral Signals ────────────────────────────────────────────
    first_response_ms: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False,
        comment="Time in ms from scenario start to first user interaction"
    )
    time_to_choice_ms: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False,
        comment="Time in ms from scenario start to final choice commitment"
    )
    interaction_count: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False,
        comment="Total number of interaction events (clicks/taps) during scenario"
    )
    distraction_clicks: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False,
        comment="Clicks on non-primary/distraction elements"
    )
    re_read_count: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False,
        comment="Number of times user hovered/focused on option text before choosing"
    )
    choice_made: Mapped[str] = mapped_column(
        String(32), default="", nullable=False,
        comment="Identifier of the final option selected"
    )
    abandoned: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False,
        comment="True if scenario timed out without a choice"
    )

    # ── Extracted Trait Evidence (0.0–1.0 per dimension) ─────────────────────
    # These are scenario-level trait evidence signals, NOT final scores.
    # Final scores are computed by CalibrationScorer as a weighted blend.
    evidence_impulsiveness: Mapped[float] = mapped_column(
        Float, default=0.5, nullable=False,
        comment="0=deliberate, 1=impulsive — inferred from this scenario"
    )
    evidence_attention_control: Mapped[float] = mapped_column(
        Float, default=0.5, nullable=False,
        comment="0=distracted, 1=focused — inferred from this scenario"
    )
    evidence_notification_fixation: Mapped[float] = mapped_column(
        Float, default=0.5, nullable=False,
        comment="0=ignores notifications, 1=fixated — inferred from distraction clicks"
    )
    evidence_urgency_susceptibility: Mapped[float] = mapped_column(
        Float, default=0.5, nullable=False,
        comment="0=ignores urgency, 1=highly susceptible — inferred from countdown/pressure behavior"
    )
    evidence_authority_compliance: Mapped[float] = mapped_column(
        Float, default=0.5, nullable=False,
        comment="0=resists authority, 1=complies — inferred from conflicting-authority scenario"
    )
    evidence_cognitive_overload: Mapped[float] = mapped_column(
        Float, default=0.5, nullable=False,
        comment="0=handles complexity, 1=overloaded — inferred from performance under complexity"
    )

    # ── Raw Telemetry ─────────────────────────────────────────────────────────
    raw_telemetry: Mapped[str | None] = mapped_column(
        Text, nullable=True,
        comment="JSON blob of full interaction event stream for auditability and re-scoring"
    )

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    def __repr__(self) -> str:
        return (
            f"<CalibrationEvent user={self.user_id} "
            f"scenario={self.scenario_id} "
            f"choice={self.choice_made} "
            f"response_ms={self.time_to_choice_ms}>"
        )
