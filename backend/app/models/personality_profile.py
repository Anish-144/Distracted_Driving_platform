"""
PersonalityProfile model — stores the psychological onboarding assessment results.

Separate from simulation-derived profile_type on User.
This captures self-reported trait scores used for:
  - Behavioral consistency analysis (self vs simulation divergence)
  - Initial lesson seeding before simulation data exists
  - Research-grade psychological metrics
"""

import uuid
from datetime import datetime
from sqlalchemy import String, Float, Text, DateTime, func, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class PersonalityProfile(Base):
    __tablename__ = "personality_profiles"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    # One record per user (can be updated on re-assessment)
    user_id: Mapped[str] = mapped_column(
        String(36), unique=True, nullable=False, index=True
    )

    # ── Raw trait scores (0.0 – 1.0, higher = stronger trait) ────────────────
    # Computed from question responses via weighted scoring map
    impulsiveness_score: Mapped[float] = mapped_column(Float, default=0.5, nullable=False,
        comment="0=deliberate, 1=highly impulsive")
    attention_control_score: Mapped[float] = mapped_column(Float, default=0.5, nullable=False,
        comment="0=easily distracted, 1=focused")
    emotional_reactivity_score: Mapped[float] = mapped_column(Float, default=0.5, nullable=False,
        comment="0=calm, 1=emotionally reactive")
    authority_compliance_score: Mapped[float] = mapped_column(Float, default=0.5, nullable=False,
        comment="0=resists authority, 1=strongly complies")
    cognitive_patience_score: Mapped[float] = mapped_column(Float, default=0.5, nullable=False,
        comment="0=impatient, 1=very patient")
    risk_tolerance_score: Mapped[float] = mapped_column(Float, default=0.5, nullable=False,
        comment="0=risk averse, 1=risk seeking")
    stress_resilience_score: Mapped[float] = mapped_column(Float, default=0.5, nullable=False,
        comment="0=stress-prone, 1=highly resilient")
    multitasking_tendency_score: Mapped[float] = mapped_column(Float, default=0.5, nullable=False,
        comment="0=single-tasker, 1=habitual multitasker")

    # ── Derived psychological label ───────────────────────────────────────────
    # Computed during assessment: impulsive | distracted | hesitant | anxious
    # | risk_seeking | cautious | emotionally_reactive
    onboarding_profile_label: Mapped[str] = mapped_column(
        String(50), default="unknown", nullable=False
    )

    # ── Behavioral Consistency Metrics (populated after each simulation) ──────
    # Divergence between self-reported traits and simulation behavior
    consistency_score: Mapped[float] = mapped_column(Float, default=1.0, nullable=False,
        comment="1.0=perfect self-awareness, 0.0=strong mismatch")
    self_awareness_score: Mapped[float] = mapped_column(Float, default=0.5, nullable=False,
        comment="How accurately user predicts their own behavior")

    # Specific flags for research observability
    impulsiveness_mismatch: Mapped[float] = mapped_column(Float, default=0.0, nullable=False,
        comment="Delta: self-reported vs simulated impulsiveness")
    attention_mismatch: Mapped[float] = mapped_column(Float, default=0.0, nullable=False,
        comment="Delta: self-reported vs simulated attention fragmentation")
    emotional_stability_mismatch: Mapped[float] = mapped_column(Float, default=0.0, nullable=False,
        comment="Delta: self-reported calm vs simulated reactivity")

    # ── Raw answers (JSON for auditability) ───────────────────────────────────
    raw_answers: Mapped[str | None] = mapped_column(
        Text, nullable=True,
        comment="JSON array of {question_id, answer_value} submitted during onboarding"
    )

    # ── Session context ───────────────────────────────────────────────────────
    total_simulations_since_assessment: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    def __repr__(self) -> str:
        return (
            f"<PersonalityProfile user={self.user_id} "
            f"label={self.onboarding_profile_label} "
            f"consistency={self.consistency_score:.2f}>"
        )
