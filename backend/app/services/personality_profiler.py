"""
Personality Profiler Service — Behavioral Calibration Engine.

Architecture: 3-layer psychometric calibration system.

LAYER 1 — Self-Report Priors (4 indirect questions)
  - Establishes weak priors only; avoids obvious trait framing
  - No dimension labels shown to users
  - Questions use scenario framing, not direct introspection
  - All options designed to appear equally reasonable
  - Prior weight starts at 0.4 (low trust, behaviors dominate)

LAYER 2 — Micro Behavioral Simulations (6 scenarios)
  - CalibrationScorer extracts trait evidence from interaction telemetry
  - Measures: hesitation, impulsiveness, notification fixation, urgency
    susceptibility, authority compliance, cognitive overload handling
  - Users do not know what's being measured
  - Each scenario produces a per-trait evidence vector

LAYER 3 — Self-Awareness Mismatch Analysis
  - Compares Layer 1 priors to Layer 2 behavioral evidence
  - Detects: overconfidence, attention blindspots, authority denial,
    impulsiveness denial, stress underestimation
  - Produces: overconfidence_index, mismatch_flags, calibration_confidence
  - Blends priors + behavioral evidence into final trait scores

Design principles:
  - Behavior > self-report
  - Implicit signals > explicit claims
  - Deterministic inference > heuristic guessing
  - Explainable scores > black-box outputs
  - Additive only: does NOT modify BehaviorAnalyzer or User.profile_type
"""

import json
import logging
import math
from dataclasses import dataclass, field
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.personality_profile import PersonalityProfile
from app.models.behavioral_state import BehavioralState
from app.models.calibration_event import CalibrationEvent

logger = logging.getLogger(__name__)


# ── Layer 1: Self-Report Question Bank (Indirect Priors) ─────────────────────
# CRITICAL DESIGN: No dimension labels visible to user.
# Questions use scenario-framing to avoid transparent introspection.
# All answer options are designed to appear equally reasonable.
# The `dimension` field is server-side ONLY — never sent to frontend.

ASSESSMENT_QUESTIONS = []


# ── Trait Dimensions ──────────────────────────────────────────────────────────

TRAIT_DIMENSIONS = [
    "impulsiveness_score",
    "attention_control_score",
    "emotional_reactivity_score",
    "authority_compliance_score",
    "cognitive_patience_score",
    "risk_tolerance_score",
    "stress_resilience_score",
    "multitasking_tendency_score",
]

# Prior-only dimensions (used to seed behavioral fields before calibration)
PRIOR_BEHAVIORAL_DIMENSIONS = [
    "behavioral_notification_fixation_prior",
    "behavioral_urgency_susceptibility_prior",
    "behavioral_cognitive_overload_prior",
]


# ── Layer 2: Calibration Scenario Definitions ─────────────────────────────────

CALIBRATION_SCENARIOS = [
    {
        "id": "S1",
        "name": "notification_storm",
        "title": "Group Chat",
        "duration_ms": 5000,
        "primary_traits": ["attention_control", "notification_fixation"],
        "description": "A fake group chat interface appears on screen with rapid, escalating messages.",
        "ui_type": "notification_storm",
        "instruction": "Read Chat or Swipe Away.",
    },
    {
        "id": "S2",
        "name": "conflicting_directions",
        "title": "Split Screen",
        "duration_ms": 3000,
        "primary_traits": ["authority_compliance", "cognitive_overload"],
        "description": "Navigation arrow points Left. Friend's voice audio says 'No, turn Right here!'",
        "ui_type": "conflicting_directions",
        "instruction": "Choose direction immediately.",
    },
    {
        "id": "S3",
        "name": "fomo_choice",
        "title": "Party Time",
        "duration_ms": 3000,
        "primary_traits": ["risk_tolerance", "urgency_susceptibility"],
        "description": "Party starts in 10 mins. Friend needs a ride. Pick them up (Late) vs Go straight (On time).",
        "ui_type": "fomo_choice",
        "instruction": "Make a choice.",
    },
    {
        "id": "S4",
        "name": "phantom_buzz",
        "title": "Screen Calibration",
        "duration_ms": 15000,
        "primary_traits": ["impulsiveness", "notification_fixation"],
        "description": "User is asked to rapidly tap a target circle. Phone vibrates and fake Instagram DM drops down.",
        "ui_type": "phantom_buzz",
        "instruction": "Tap the circle repeatedly to calibrate.",
    },
]


# ── Profile Label Classification ──────────────────────────────────────────────

def _derive_profile_label(scores: dict) -> str:
    """
    Map trait scores to a psychological profile label.
    Priority-ordered: most clinically distinct classification wins.
    Operates on BLENDED scores (prior + behavioral), not raw self-report only.
    """
    imp = scores.get("impulsiveness_score", 0.5)
    att = scores.get("attention_control_score", 0.5)
    emo = scores.get("emotional_reactivity_score", 0.5)
    auth = scores.get("authority_compliance_score", 0.5)
    pat = scores.get("cognitive_patience_score", 0.5)
    risk = scores.get("risk_tolerance_score", 0.5)
    stress = scores.get("stress_resilience_score", 0.5)
    multi = scores.get("multitasking_tendency_score", 0.5)

    # New behavioral dimensions (if available from calibration)
    notif = scores.get("behavioral_notification_fixation", 0.5)
    urgency = scores.get("behavioral_urgency_susceptibility", 0.5)

    # Emotionally Reactive: high reactivity + low resilience
    if emo >= 0.75 and stress <= 0.35:
        return "emotionally_reactive"
    # Impulsive: high impulsiveness + high urgency susceptibility
    if imp >= 0.70 and pat <= 0.38:
        return "impulsive"
    # Notification-Distracted: high notification fixation + low attention (new behavioral type)
    if notif >= 0.72 and att <= 0.4:
        return "notification_distracted"
    # Risk-Seeking: high risk tolerance + high impulsiveness
    if risk >= 0.75 and imp >= 0.55:
        return "risk_seeking"
    # Distracted: low attention + high multitasking
    if att <= 0.35 and multi >= 0.6:
        return "distracted"
    # Hesitant: low patience + low resilience + high authority compliance
    if pat <= 0.35 and stress <= 0.4 and auth >= 0.65:
        return "hesitant"
    # Cautious: high patience + low risk + high attention
    if pat >= 0.72 and risk <= 0.3 and att >= 0.65:
        return "cautious"
    # Authority-compliant: high authority + high urgency susceptibility
    if auth >= 0.75 or (auth >= 0.65 and urgency >= 0.7):
        return "authority_driven"
    return "balanced"


# ── Dataclasses ───────────────────────────────────────────────────────────────

@dataclass
class AssessmentResult:
    onboarding_profile_label: str
    impulsiveness_score: float
    attention_control_score: float
    emotional_reactivity_score: float
    authority_compliance_score: float
    cognitive_patience_score: float
    risk_tolerance_score: float
    stress_resilience_score: float
    multitasking_tendency_score: float
    consistency_score: float
    self_awareness_score: float


@dataclass
class CalibrationResult:
    """Output of Layer 2 behavioral signal extraction."""
    behavioral_impulsiveness: float
    behavioral_attention: float
    behavioral_notification_fixation: float
    behavioral_urgency_susceptibility: float
    behavioral_authority_compliance: float
    behavioral_cognitive_overload: float
    calibration_confidence: float
    scenario_signals: dict = field(default_factory=dict)


@dataclass
class MismatchAnalysis:
    """Output of Layer 3 mismatch analysis."""
    overconfidence_index: float       # positive = overestimates control, negative = underestimates
    mismatch_flags: list              # human-readable descriptions
    calibration_confidence: float
    # Legacy consistency fields (maintained for API compatibility)
    consistency_score: float
    self_awareness_score: float
    impulsiveness_mismatch: float
    attention_mismatch: float
    emotional_stability_mismatch: float


@dataclass
class ConsistencyAnalysis:
    consistency_score: float
    self_awareness_score: float
    impulsiveness_mismatch: float
    attention_mismatch: float
    emotional_stability_mismatch: float
    flags: list


# ── CalibrationScorer: Layer 2 Signal Extraction ─────────────────────────────

class CalibrationScorer:
    """
    Extracts behavioral trait evidence from micro-simulation telemetry.

    Each scenario produces specific trait signals based on interaction patterns:
    - S1 NavigationInterrupt → attention_control, notification_fixation
    - S2 CountdownClock     → impulsiveness, urgency_susceptibility
    - S3 ConflictingAuth    → authority_compliance, cognitive_overload
    - S4 NotifTemptation    → notification_fixation, attention_control
    - S5 PassengerUrgency   → authority_compliance, emotional_reactivity, urgency_susceptibility
    - S6 AmbiguousTradeoff  → impulsiveness, risk_tolerance, cognitive_patience

    All extraction is deterministic and explainable — no LLM involved.
    """

    # Scenario time limits (ms) — used to normalize response timing
    SCENARIO_DURATIONS = {
        "S1": 5000, "S2": 3000, "S3": 3000, "S4": 15000
    }

    def extract_from_event(self, scenario_id: str, telemetry: dict) -> dict:
        """
        Route scenario telemetry to the correct extractor.
        Returns: dict of {evidence_dimension: 0.0–1.0}
        """
        extractors = {
            "S1": self._score_notification_storm,
            "S2": self._score_conflicting_directions,
            "S3": self._score_fomo_choice,
            "S4": self._score_phantom_buzz,
        }
        extractor = extractors.get(scenario_id)
        if extractor is None:
            logger.warning("CalibrationScorer: unknown scenario_id=%s", scenario_id)
            return {}
        return extractor(telemetry)

    def aggregate_scenario_results(
        self, events: list[dict]
    ) -> CalibrationResult:
        """
        Aggregate evidence vectors from all 6 scenarios into final behavioral scores.
        Uses confidence-weighted averaging: more consistent signals = higher confidence.
        """
        # Collect evidence per dimension across all scenarios
        evidence: dict[str, list[float]] = {
            "behavioral_impulsiveness": [],
            "behavioral_attention": [],
            "behavioral_notification_fixation": [],
            "behavioral_urgency_susceptibility": [],
            "behavioral_authority_compliance": [],
            "behavioral_cognitive_overload": [],
        }

        for event in events:
            sid = event.get("scenario_id", "")
            tel = event.get("telemetry", {})
            signals = self.extract_from_event(sid, tel)

            # Map evidence fields to behavioral dimensions
            if "evidence_impulsiveness" in signals:
                evidence["behavioral_impulsiveness"].append(signals["evidence_impulsiveness"])
            if "evidence_attention_control" in signals:
                evidence["behavioral_attention"].append(signals["evidence_attention_control"])
            if "evidence_notification_fixation" in signals:
                evidence["behavioral_notification_fixation"].append(signals["evidence_notification_fixation"])
            if "evidence_urgency_susceptibility" in signals:
                evidence["behavioral_urgency_susceptibility"].append(signals["evidence_urgency_susceptibility"])
            if "evidence_authority_compliance" in signals:
                evidence["behavioral_authority_compliance"].append(signals["evidence_authority_compliance"])
            if "evidence_cognitive_overload" in signals:
                evidence["behavioral_cognitive_overload"].append(signals["evidence_cognitive_overload"])

        # Average evidence per dimension
        scores = {}
        variances = []
        for dim, vals in evidence.items():
            if vals:
                avg = sum(vals) / len(vals)
                variance = sum((v - avg) ** 2 for v in vals) / len(vals)
                scores[dim] = round(avg, 3)
                variances.append(variance)
            else:
                scores[dim] = 0.5  # default prior — no signal

        # Confidence: higher when signals are consistent (low variance) and many scenarios ran
        scenario_coverage = min(len(events) / 6.0, 1.0)
        avg_variance = sum(variances) / max(len(variances), 1)
        consistency_factor = max(0.0, 1.0 - (avg_variance * 4))
        calibration_confidence = round(scenario_coverage * consistency_factor * 0.85, 3)

        return CalibrationResult(
            behavioral_impulsiveness=scores.get("behavioral_impulsiveness", 0.5),
            behavioral_attention=scores.get("behavioral_attention", 0.5),
            behavioral_notification_fixation=scores.get("behavioral_notification_fixation", 0.5),
            behavioral_urgency_susceptibility=scores.get("behavioral_urgency_susceptibility", 0.5),
            behavioral_authority_compliance=scores.get("behavioral_authority_compliance", 0.5),
            behavioral_cognitive_overload=scores.get("behavioral_cognitive_overload", 0.5),
            calibration_confidence=calibration_confidence,
            scenario_signals={e.get("scenario_id", "?"): e.get("telemetry", {}) for e in events},
        )

    # ── Per-Scenario Extractors ────────────────────────────────────────────────

    def _score_notification_storm(self, t: dict) -> dict:
        duration = self.SCENARIO_DURATIONS["S1"]
        first_ms = t.get("first_response_ms", duration)
        choice = t.get("choice_made", "timeout")

        notif_fixation = 0.8 if choice == "read_chat" else 0.2 if choice == "swipe_away" else 0.5
        att_control = 0.2 if choice == "read_chat" else 0.8 if choice == "swipe_away" else 0.3

        return {
            "evidence_attention_control": att_control,
            "evidence_notification_fixation": notif_fixation,
        }

    def _score_conflicting_directions(self, t: dict) -> dict:
        duration = self.SCENARIO_DURATIONS["S2"]
        first_ms = t.get("first_response_ms", duration)
        choice = t.get("choice_made", "timeout")
        
        # Audio = peer, Visual = rule
        auth_compliance = 0.8 if choice == "audio" else 0.3 if choice == "visual" else 0.5
        time_ratio = first_ms / duration
        cognitive_overload = 0.9 if time_ratio > 0.8 or choice == "timeout" else time_ratio

        return {
            "evidence_authority_compliance": auth_compliance,
            "evidence_cognitive_overload": cognitive_overload,
        }

    def _score_fomo_choice(self, t: dict) -> dict:
        duration = self.SCENARIO_DURATIONS["S3"]
        first_ms = t.get("first_response_ms", duration)
        choice = t.get("choice_made", "timeout")

        # risk: picking them up (late) vs straight (on time)
        risk_tolerance = 0.8 if choice == "pickup" else 0.2 if choice == "straight" else 0.5
        time_ratio = first_ms / duration
        urgency = 0.9 if time_ratio < 0.3 else 0.5

        return {
            "evidence_risk_tolerance": risk_tolerance,
            "evidence_urgency_susceptibility": urgency,
        }

    def _score_phantom_buzz(self, t: dict) -> dict:
        distraction = t.get("distraction_clicks", 0)
        
        notif_fixation = min(1.0, distraction * 0.5 + 0.2) if distraction > 0 else 0.1
        impulsiveness = 0.8 if distraction > 0 else 0.2
        
        return {
            "evidence_impulsiveness": impulsiveness,
            "evidence_notification_fixation": notif_fixation,
        }


# ── PersonalityProfiler: Main Service ────────────────────────────────────────

class PersonalityProfiler:

    def __init__(self):
        self._calibration_scorer = CalibrationScorer()

    # ── Layer 1: Self-Report Processing ───────────────────────────────────────

    async def process_assessment(
        self,
        db: AsyncSession,
        user_id: str,
        answers: list[dict],
    ) -> PersonalityProfile:
        """
        Process Layer 1 self-report priors and persist initial profile.
        Prior weight is set to 0.4 — behavioral calibration will dominate once complete.
        """
        scores = self._score_answers(answers)
        label = _derive_profile_label(scores)

        result = await db.execute(
            select(PersonalityProfile).where(PersonalityProfile.user_id == user_id)
        )
        profile = result.scalar_one_or_none()

        if profile is None:
            profile = PersonalityProfile(user_id=user_id)
            db.add(profile)

        # Store self-reported trait priors
        profile.onboarding_profile_label = label
        profile.impulsiveness_score = scores["impulsiveness_score"]
        profile.attention_control_score = scores["attention_control_score"]
        profile.emotional_reactivity_score = scores["emotional_reactivity_score"]
        profile.authority_compliance_score = scores["authority_compliance_score"]
        profile.cognitive_patience_score = scores["cognitive_patience_score"]
        profile.risk_tolerance_score = scores["risk_tolerance_score"]
        profile.stress_resilience_score = scores["stress_resilience_score"]
        profile.multitasking_tendency_score = scores["multitasking_tendency_score"]
        profile.raw_answers = json.dumps(answers)

        # Seed behavioral fields from prior (will be overridden after calibration)
        profile.behavioral_impulsiveness = scores["impulsiveness_score"]
        profile.behavioral_attention = scores["attention_control_score"]
        profile.behavioral_notification_fixation = scores.get("behavioral_notification_fixation_prior", 0.5)
        profile.behavioral_urgency_susceptibility = scores.get("behavioral_urgency_susceptibility_prior", 0.5)
        profile.behavioral_authority_compliance = scores["authority_compliance_score"]
        profile.behavioral_cognitive_overload = scores.get("behavioral_cognitive_overload_prior", 0.5)

        # Prior weight: 0.4 — signals are weak until behavioral calibration runs
        profile.prior_weight = 0.4
        profile.calibration_completed = False
        profile.calibration_confidence = 0.0

        # Baseline consistency
        profile.consistency_score = 1.0
        profile.self_awareness_score = 0.5

        await db.flush()
        await db.refresh(profile)
        logger.info(
            "Layer 1 priors processed: user=%s label=%s imp=%.2f att=%.2f prior_weight=%.1f",
            user_id, label, scores["impulsiveness_score"], scores["attention_control_score"],
            profile.prior_weight,
        )
        return profile

    # ── Layer 2: Behavioral Calibration Processing ────────────────────────────

    async def process_calibration(
        self,
        db: AsyncSession,
        user_id: str,
        scenario_events: list[dict],
    ) -> PersonalityProfile:
        """
        Process Layer 2 behavioral calibration telemetry from micro-simulations.

        scenario_events: list of {
            scenario_id: str,
            telemetry: {
                first_response_ms, time_to_choice_ms, interaction_count,
                distraction_clicks, re_read_count, choice_made, abandoned,
                ...scenario-specific fields
            }
        }

        Updates: behavioral trait scores, blended profile label, calibration_confidence.
        """
        # Extract behavioral signals
        calibration_result = self._calibration_scorer.aggregate_scenario_results(scenario_events)

        # Persist individual calibration events
        for event in scenario_events:
            sid = event.get("scenario_id", "")
            tel = event.get("telemetry", {})
            signals = self._calibration_scorer.extract_from_event(sid, tel)

            scenario_def = next((s for s in CALIBRATION_SCENARIOS if s["id"] == sid), None)
            cal_event = CalibrationEvent(
                user_id=user_id,
                scenario_id=sid,
                scenario_name=scenario_def["name"] if scenario_def else sid,
                first_response_ms=tel.get("first_response_ms", 0),
                time_to_choice_ms=tel.get("time_to_choice_ms", 0),
                interaction_count=tel.get("interaction_count", 0),
                distraction_clicks=tel.get("distraction_clicks", 0),
                re_read_count=tel.get("re_read_count", 0),
                choice_made=str(tel.get("choice_made", "")),
                abandoned=bool(tel.get("abandoned", False)),
                evidence_impulsiveness=signals.get("evidence_impulsiveness", 0.5),
                evidence_attention_control=signals.get("evidence_attention_control", 0.5),
                evidence_notification_fixation=signals.get("evidence_notification_fixation", 0.5),
                evidence_urgency_susceptibility=signals.get("evidence_urgency_susceptibility", 0.5),
                evidence_authority_compliance=signals.get("evidence_authority_compliance", 0.5),
                evidence_cognitive_overload=signals.get("evidence_cognitive_overload", 0.5),
                raw_telemetry=json.dumps(tel),
            )
            db.add(cal_event)

        # Update personality profile with blended scores
        result = await db.execute(
            select(PersonalityProfile).where(PersonalityProfile.user_id == user_id)
        )
        profile = result.scalar_one_or_none()

        if profile is None:
            # Edge case: calibration submitted without prior assessment
            logger.warning("Calibration without prior assessment: user=%s — creating profile", user_id)
            profile = PersonalityProfile(
                user_id=user_id, 
                prior_weight=0.0,
                impulsiveness_score=0.5,
                attention_control_score=0.5,
                emotional_reactivity_score=0.5,
                authority_compliance_score=0.5,
                cognitive_patience_score=0.5,
                risk_tolerance_score=0.5,
                stress_resilience_score=0.5,
                multitasking_tendency_score=0.5,
                onboarding_profile_label="balanced"
            )
            db.add(profile)
        
        # Ensure no NoneType scores if profile was created without layer 1
        profile.impulsiveness_score = profile.impulsiveness_score or 0.5
        profile.attention_control_score = profile.attention_control_score or 0.5
        profile.emotional_reactivity_score = profile.emotional_reactivity_score or 0.5
        profile.authority_compliance_score = profile.authority_compliance_score or 0.5
        profile.cognitive_patience_score = profile.cognitive_patience_score or 0.5
        profile.risk_tolerance_score = profile.risk_tolerance_score or 0.5
        profile.stress_resilience_score = profile.stress_resilience_score or 0.5
        profile.multitasking_tendency_score = profile.multitasking_tendency_score or 0.5

        # Store behavioral scores
        profile.behavioral_impulsiveness = calibration_result.behavioral_impulsiveness
        profile.behavioral_attention = calibration_result.behavioral_attention
        profile.behavioral_notification_fixation = calibration_result.behavioral_notification_fixation
        profile.behavioral_urgency_susceptibility = calibration_result.behavioral_urgency_susceptibility
        profile.behavioral_authority_compliance = calibration_result.behavioral_authority_compliance
        profile.behavioral_cognitive_overload = calibration_result.behavioral_cognitive_overload
        profile.calibration_confidence = calibration_result.calibration_confidence
        profile.calibration_completed = True
        profile.prior_weight = 0.3  # After calibration: behavioral data dominates

        # Blend self-report priors with behavioral evidence into final trait scores
        pw = profile.prior_weight
        bw = 1.0 - pw

        profile.impulsiveness_score = round(
            pw * profile.impulsiveness_score + bw * calibration_result.behavioral_impulsiveness, 3
        )
        profile.attention_control_score = round(
            pw * profile.attention_control_score + bw * calibration_result.behavioral_attention, 3
        )
        profile.authority_compliance_score = round(
            pw * profile.authority_compliance_score + bw * calibration_result.behavioral_authority_compliance, 3
        )

        # Run Layer 3 mismatch analysis
        mismatch = self._compute_mismatch_v2(profile, calibration_result)
        profile.overconfidence_index = mismatch.overconfidence_index
        profile.mismatch_flags = json.dumps(mismatch.mismatch_flags)
        profile.consistency_score = mismatch.consistency_score
        profile.self_awareness_score = mismatch.self_awareness_score
        profile.impulsiveness_mismatch = mismatch.impulsiveness_mismatch
        profile.attention_mismatch = mismatch.attention_mismatch
        profile.emotional_stability_mismatch = mismatch.emotional_stability_mismatch

        # Re-derive profile label from blended scores
        blended_scores = {
            "impulsiveness_score": profile.impulsiveness_score,
            "attention_control_score": profile.attention_control_score,
            "emotional_reactivity_score": profile.emotional_reactivity_score,
            "authority_compliance_score": profile.authority_compliance_score,
            "cognitive_patience_score": profile.cognitive_patience_score,
            "risk_tolerance_score": profile.risk_tolerance_score,
            "stress_resilience_score": profile.stress_resilience_score,
            "multitasking_tendency_score": profile.multitasking_tendency_score,
            "behavioral_notification_fixation": calibration_result.behavioral_notification_fixation,
            "behavioral_urgency_susceptibility": calibration_result.behavioral_urgency_susceptibility,
        }
        profile.onboarding_profile_label = _derive_profile_label(blended_scores)
        profile.onboarding_telemetry = json.dumps(calibration_result.scenario_signals)

        await db.flush()
        await db.refresh(profile)
        logger.info(
            "Layer 2 calibration complete: user=%s label=%s confidence=%.2f overconfidence=%.2f flags=%d",
            user_id, profile.onboarding_profile_label,
            calibration_result.calibration_confidence,
            mismatch.overconfidence_index,
            len(mismatch.mismatch_flags),
        )
        return profile

    # ── Layer 3: Mismatch Analysis ────────────────────────────────────────────

    def _compute_mismatch_v2(
        self,
        profile: PersonalityProfile,
        calibration: CalibrationResult,
    ) -> MismatchAnalysis:
        """
        Compare self-reported priors to behavioral evidence.
        Detects overconfidence, attention blindspots, and denial patterns.

        Overconfidence index:
          Positive = user overestimates own control (reports high control, behaves poorly)
          Negative = user underestimates own control (reports poor control, actually performs well)
          Range: -1.0 to 1.0
        """
        flags = []

        # Retrieve raw pre-calibration self-reports from current state
        # (prior_weight was 0.4 during Layer 1, so we need to invert blend)
        # Use stored raw values via the behavioral priors seeded from Layer 1
        reported_imp = profile.impulsiveness_score
        reported_att = profile.attention_control_score
        reported_auth = profile.authority_compliance_score

        behavioral_imp = calibration.behavioral_impulsiveness
        behavioral_att = calibration.behavioral_attention
        behavioral_auth = calibration.behavioral_authority_compliance
        behavioral_notif = calibration.behavioral_notification_fixation
        behavioral_urgency = calibration.behavioral_urgency_susceptibility

        # ── Impulsiveness Mismatch ─────────────────────────────────────────────
        imp_delta = reported_imp - behavioral_imp
        if abs(imp_delta) > 0.30:
            if imp_delta < 0:
                flags.append(
                    f"Impulsiveness underestimated: self-reported {reported_imp:.0%}, "
                    f"behavior shows {behavioral_imp:.0%} — you act more impulsively than you believe."
                )
            else:
                flags.append(
                    f"Impulsiveness overestimated: self-reported {reported_imp:.0%}, "
                    f"behavior shows {behavioral_imp:.0%} — you are more deliberate than you think."
                )

        # ── Attention Control Mismatch ─────────────────────────────────────────
        att_delta = reported_att - behavioral_att
        if abs(att_delta) > 0.28:
            if att_delta > 0:
                flags.append(
                    f"Attention overconfidence: you reported strong focus control ({reported_att:.0%}), "
                    f"but behavioral signals show significant distraction pull ({behavioral_att:.0%})."
                )
            else:
                flags.append(
                    f"Attention underestimated: you reported weaker focus ({reported_att:.0%}) "
                    f"than behavior shows ({behavioral_att:.0%})."
                )

        # ── Notification Fixation Blindspot ───────────────────────────────────
        # New: detects users who don't self-report distraction but show high notification pull
        if behavioral_notif > 0.65 and reported_att > 0.6:
            flags.append(
                f"Notification blindspot: you report strong attention control, "
                f"but behavioral signals show high notification fixation ({behavioral_notif:.0%}). "
                f"This discrepancy is common and important for distraction training."
            )

        # ── Authority Compliance Mismatch ──────────────────────────────────────
        auth_delta = reported_auth - behavioral_auth
        if abs(auth_delta) > 0.32:
            if auth_delta < 0:
                flags.append(
                    f"Authority susceptibility underestimated: self-reported {reported_auth:.0%}, "
                    f"behavior shows {behavioral_auth:.0%} compliance — social pressure affects you more than you report."
                )
            else:
                flags.append(
                    f"Authority resistance overreported: self-reported {reported_auth:.0%}, "
                    f"behavioral signals show {behavioral_auth:.0%} — you resist pressure more than you think."
                )

        # ── Urgency Susceptibility Blindspot ───────────────────────────────────
        if behavioral_urgency > 0.70 and reported_att > 0.55:
            flags.append(
                f"Urgency blindspot: behavioral signals show high susceptibility to time pressure "
                f"({behavioral_urgency:.0%}) despite reported attention control — "
                f"countdown cues significantly alter your decision speed."
            )

        # ── Overconfidence Index ───────────────────────────────────────────────
        # Positive = overestimates self-control (thinks they're more controlled than they are)
        control_reported = (reported_att + (1 - reported_imp)) / 2
        control_behavioral = (behavioral_att + (1 - behavioral_imp)) / 2
        overconfidence_index = round(control_reported - control_behavioral, 3)

        # ── Consistency & Self-Awareness ───────────────────────────────────────
        avg_mismatch = (abs(imp_delta) + abs(att_delta) + abs(auth_delta)) / 3
        consistency_score = round(max(0.0, 1.0 - avg_mismatch), 3)
        self_awareness_score = consistency_score

        return MismatchAnalysis(
            overconfidence_index=overconfidence_index,
            mismatch_flags=flags,
            calibration_confidence=calibration.calibration_confidence,
            consistency_score=consistency_score,
            self_awareness_score=self_awareness_score,
            impulsiveness_mismatch=round(imp_delta, 3),
            attention_mismatch=round(att_delta, 3),
            emotional_stability_mismatch=0.0,  # computed post-simulation via BehavioralState
        )

    # ── Legacy Consistency Analysis (post-simulation) ─────────────────────────

    async def update_consistency_after_session(
        self,
        db: AsyncSession,
        user_id: str,
        behavioral_state: BehavioralState,
    ) -> Optional[ConsistencyAnalysis]:
        """
        Called after each simulation session completion.
        Updates consistency metrics using live simulation behavior vs profile.
        """
        profile = await self.get_profile(db, user_id)
        if profile is None or behavioral_state.total_events < 5:
            return None

        analysis = self._compute_consistency(profile, behavioral_state)

        profile.consistency_score = analysis.consistency_score
        profile.self_awareness_score = analysis.self_awareness_score
        profile.impulsiveness_mismatch = analysis.impulsiveness_mismatch
        profile.attention_mismatch = analysis.attention_mismatch
        profile.emotional_stability_mismatch = analysis.emotional_stability_mismatch
        profile.total_simulations_since_assessment += 1

        db.add(profile)
        await db.flush()

        logger.info(
            "Post-session consistency updated: user=%s score=%.2f self_awareness=%.2f flags=%s",
            user_id, analysis.consistency_score, analysis.self_awareness_score, analysis.flags
        )
        return analysis

    async def get_profile(
        self, db: AsyncSession, user_id: str
    ) -> Optional[PersonalityProfile]:
        """Fetch the personality profile for a user, or None if not assessed."""
        result = await db.execute(
            select(PersonalityProfile).where(PersonalityProfile.user_id == user_id)
        )
        return result.scalar_one_or_none()

    def build_trait_context_for_prompt(self, profile: PersonalityProfile) -> str:
        """Returns compact human-readable trait summary for LLM prompt injection."""
        traits = []

        # Use behavioral scores when calibration complete; fall back to self-report
        imp = profile.behavioral_impulsiveness if profile.calibration_completed else profile.impulsiveness_score
        att = profile.behavioral_attention if profile.calibration_completed else profile.attention_control_score
        notif = profile.behavioral_notification_fixation if profile.calibration_completed else 0.5

        if imp >= 0.7:
            traits.append("highly impulsive decision-making under pressure")
        elif imp <= 0.3:
            traits.append("deliberate, slow decision-making")

        if att <= 0.35:
            traits.append("low attentional control — easily distracted")
        elif att >= 0.75:
            traits.append("strong focused attention")

        if notif >= 0.7:
            traits.append("high notification fixation — pulled to digital stimuli")

        if profile.emotional_reactivity_score >= 0.7:
            traits.append("high emotional reactivity to urgency cues")

        if profile.authority_compliance_score >= 0.75:
            traits.append("strong compliance with authority figure pressure")

        if profile.behavioral_urgency_susceptibility >= 0.7:
            traits.append("high urgency susceptibility — time pressure degrades decisions")

        if profile.stress_resilience_score <= 0.3:
            traits.append("deteriorates rapidly under time pressure")

        if profile.calibration_completed and profile.overconfidence_index > 0.25:
            traits.append(f"overconfident self-assessment (index: {profile.overconfidence_index:.2f})")

        if not traits:
            return "balanced cognitive profile"
        return "; ".join(traits)

    # ── Internals ─────────────────────────────────────────────────────────────

    def _score_answers(self, answers: list[dict]) -> dict:
        """
        Score Layer 1 self-report answers across trait dimensions.
        Returns averaged per-dimension scores including new behavioral priors.
        """
        all_dims = TRAIT_DIMENSIONS + PRIOR_BEHAVIORAL_DIMENSIONS
        dimension_sums: dict[str, list[float]] = {d: [] for d in all_dims}

        q_lookup = {q["id"]: q for q in ASSESSMENT_QUESTIONS}

        for answer in answers:
            qid = answer.get("question_id")
            val = answer.get("answer_value")
            if qid not in q_lookup:
                continue
            question = q_lookup[qid]
            chosen = next((o for o in question["options"] if o["value"] == val), None)
            if chosen is None:
                continue
            for dim, score in chosen.get("scores", {}).items():
                if dim in dimension_sums:
                    dimension_sums[dim].append(score)

        result = {}
        for dim in all_dims:
            vals = dimension_sums[dim]
            result[dim] = round(sum(vals) / len(vals), 3) if vals else 0.5
        return result

    def _compute_consistency(
        self,
        profile: PersonalityProfile,
        state: BehavioralState,
    ) -> ConsistencyAnalysis:
        """
        Compare profile trait scores to simulation-derived behavior proxies.
        Uses behavioral scores when calibration complete; self-report when not.
        """
        flags = []
        total = max(state.total_events, 1)
        safe_ratio = state.safe_decisions / total

        sim_impulsiveness = min(1.0, state.impulsive_count / max(total * 0.3, 1))
        sim_attention = safe_ratio
        total_pressure = max(state.pressure_yield_count + state.pressure_resist_count, 1)
        sim_emotional_reactivity = state.pressure_yield_count / total_pressure

        # Use behavioral scores as reference when available
        ref_imp = profile.behavioral_impulsiveness if profile.calibration_completed else profile.impulsiveness_score
        ref_att = profile.behavioral_attention if profile.calibration_completed else profile.attention_control_score
        ref_emo = 1 - profile.emotional_reactivity_score

        imp_delta = ref_imp - sim_impulsiveness
        att_delta = ref_att - sim_attention
        emo_delta = ref_emo - (1 - sim_emotional_reactivity)

        if abs(imp_delta) > 0.35:
            direction = "underestimated" if imp_delta < 0 else "overestimated"
            flags.append(f"Impulsiveness {direction}: profile {ref_imp:.1f}, simulation {sim_impulsiveness:.1f}")

        if abs(att_delta) > 0.3:
            direction = "overestimates" if att_delta > 0 else "underestimates"
            flags.append(f"Attention {direction} own focus: profile {ref_att:.1f}, simulation {sim_attention:.1f}")

        if abs(emo_delta) > 0.3:
            direction = "calmer than expected" if emo_delta < 0 else "more reactive than expected"
            flags.append(f"Emotional response is {direction} under pressure")

        avg_mismatch = (abs(imp_delta) + abs(att_delta) + abs(emo_delta)) / 3
        consistency_score = round(max(0.0, 1.0 - avg_mismatch), 3)

        return ConsistencyAnalysis(
            consistency_score=consistency_score,
            self_awareness_score=consistency_score,
            impulsiveness_mismatch=round(imp_delta, 3),
            attention_mismatch=round(att_delta, 3),
            emotional_stability_mismatch=round(emo_delta, 3),
            flags=flags,
        )


# ── Singleton ─────────────────────────────────────────────────────────────────
personality_profiler = PersonalityProfiler()
