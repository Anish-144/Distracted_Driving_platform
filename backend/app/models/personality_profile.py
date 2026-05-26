"""
PersonalityProfile model — stores the psychological onboarding assessment results.

Separate from simulation-derived profile_type on User.
This captures BOTH self-reported prior scores AND behaviorally-inferred scores:
  - Self-reported priors: 4 indirect questions (Layer 1)
  - Behavioral calibration: 6 micro-simulation signals (Layer 2)
  - Mismatch analysis: overconfidence detection (Layer 3)
  - Blended probabilistic profile with confidence score
"""

import uuid
from datetime import datetime
from sqlalchemy import String, Float, Text, DateTime, func, Integer, Boolean
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

    # ── Behavioral Calibration Layer 2 Fields ─────────────────────────────────
    # Populated after micro-simulation scenarios complete.
    calibration_completed: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False,
        comment="True once all behavioral calibration micro-simulations have been run"
    )
    calibration_confidence: Mapped[float] = mapped_column(
        Float, default=0.0, nullable=False,
        comment="0.0–1.0 confidence in behaviorally-inferred profile; increases with more scenario data"
    )
    prior_weight: Mapped[float] = mapped_column(
        Float, default=1.0, nullable=False,
        comment="Weight of self-report in blended profile (1.0=prior only, 0.3=behavioral dominant)"
    )

    # ── Behaviorally-Inferred Trait Scores ───────────────────────────────────
    # These override the self-reported scores once calibration is complete.
    # Blended: final_score = prior_weight * reported + (1-prior_weight) * behavioral
    behavioral_impulsiveness: Mapped[float] = mapped_column(
        Float, default=0.5, nullable=False,
        comment="Impulsiveness inferred from calibration scenario interaction timing"
    )
    behavioral_attention: Mapped[float] = mapped_column(
        Float, default=0.5, nullable=False,
        comment="Attention control inferred from distraction click patterns"
    )
    behavioral_notification_fixation: Mapped[float] = mapped_column(
        Float, default=0.5, nullable=False,
        comment="New dimension: how strongly user is drawn to notification stimuli"
    )
    behavioral_urgency_susceptibility: Mapped[float] = mapped_column(
        Float, default=0.5, nullable=False,
        comment="New dimension: susceptibility to urgency/countdown pressure"
    )
    behavioral_authority_compliance: Mapped[float] = mapped_column(
        Float, default=0.5, nullable=False,
        comment="Authority compliance inferred from conflicting-authority scenario"
    )
    behavioral_cognitive_overload: Mapped[float] = mapped_column(
        Float, default=0.5, nullable=False,
        comment="New dimension: how quickly cognitive load collapses under complexity"
    )

    # ── Mismatch / Overconfidence Analysis ────────────────────────────────────
    overconfidence_index: Mapped[float] = mapped_column(
        Float, default=0.0, nullable=False,
        comment="Positive=user overestimates own control; Negative=underestimates. Range: -1.0 to 1.0"
    )
    mismatch_flags: Mapped[str | None] = mapped_column(
        Text, nullable=True,
        comment="JSON array of human-readable mismatch descriptions from Layer 3 analysis"
    )

    # ── Calibration Telemetry (full raw blob) ─────────────────────────────────
    onboarding_telemetry: Mapped[str | None] = mapped_column(
        Text, nullable=True,
        comment="JSON blob of aggregated calibration scenario telemetry for re-scoring"
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
