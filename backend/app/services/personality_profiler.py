"""
Personality Profiler Service — Psychological Onboarding Assessment Engine.

Responsibilities:
  1. Score 10-question psychometric assessment → trait scores
  2. Derive initial onboarding_profile_label from scores
  3. Compute behavioral consistency: self-reported vs simulation divergence
  4. Update consistency/self-awareness metrics after each simulation session
  5. Provide trait scores to LLM prompt builders for personalized output

Design principles:
  - Completely additive: does NOT modify existing BehaviorAnalyzer or User.profile_type
  - Uses indirect psychological questions (not driving-specific) to prevent gaming
  - Scoring is deterministic, explainable, and weighted by question dimension
"""

import json
import logging
import math
from dataclasses import dataclass
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.personality_profile import PersonalityProfile
from app.models.behavioral_state import BehavioralState

logger = logging.getLogger(__name__)


# ── Question Bank ─────────────────────────────────────────────────────────────

ASSESSMENT_QUESTIONS = [
    {
        "id": "q1",
        "text": "When you need to make a quick decision and you don't have all the information, what do you typically do?",
        "dimension": "impulsiveness",
        "options": [
            {"value": "a", "text": "Decide immediately based on instinct — waiting feels wrong", "scores": {"impulsiveness_score": 0.9, "cognitive_patience_score": 0.2}},
            {"value": "b", "text": "Make a decision quickly, but run through the basics first", "scores": {"impulsiveness_score": 0.65, "cognitive_patience_score": 0.4}},
            {"value": "c", "text": "Wait until I have enough information, even if it takes time", "scores": {"impulsiveness_score": 0.2, "cognitive_patience_score": 0.85}},
            {"value": "d", "text": "Feel paralyzed — uncertainty makes it hard to decide anything", "scores": {"impulsiveness_score": 0.15, "cognitive_patience_score": 0.3, "emotional_reactivity_score": 0.75}},
        ]
    },
    {
        "id": "q2",
        "text": "How difficult is it for you to ignore something that feels urgent, even when you're focused on something else?",
        "dimension": "attention_control",
        "options": [
            {"value": "a", "text": "Nearly impossible — urgent things demand immediate attention", "scores": {"attention_control_score": 0.1, "impulsiveness_score": 0.8, "emotional_reactivity_score": 0.7}},
            {"value": "b", "text": "Hard — I usually pause what I'm doing to check it", "scores": {"attention_control_score": 0.3, "impulsiveness_score": 0.6}},
            {"value": "c", "text": "Manageable — I can finish what I'm doing first in most cases", "scores": {"attention_control_score": 0.7, "impulsiveness_score": 0.35}},
            {"value": "d", "text": "Easy — I rarely feel compelled to react immediately", "scores": {"attention_control_score": 0.9, "impulsiveness_score": 0.15, "cognitive_patience_score": 0.8}},
        ]
    },
    {
        "id": "q3",
        "text": "When you're in the middle of something important and someone interrupts you, how do you usually respond emotionally?",
        "dimension": "emotional_reactivity",
        "options": [
            {"value": "a", "text": "Noticeably frustrated — interruptions break my concentration hard", "scores": {"emotional_reactivity_score": 0.85, "stress_resilience_score": 0.25}},
            {"value": "b", "text": "Mildly annoyed, but I recover quickly", "scores": {"emotional_reactivity_score": 0.5, "stress_resilience_score": 0.6}},
            {"value": "c", "text": "Relatively unbothered — I adapt to interruptions well", "scores": {"emotional_reactivity_score": 0.25, "stress_resilience_score": 0.85}},
            {"value": "d", "text": "I welcome interruptions — I often want a reason to stop", "scores": {"emotional_reactivity_score": 0.2, "multitasking_tendency_score": 0.75}},
        ]
    },
    {
        "id": "q4",
        "text": "If your manager or someone senior sends you a message marked 'urgent', how strongly do you feel obligated to respond immediately?",
        "dimension": "authority_compliance",
        "options": [
            {"value": "a", "text": "Very strongly — authority demands immediate response regardless of situation", "scores": {"authority_compliance_score": 0.95, "risk_tolerance_score": 0.15}},
            {"value": "b", "text": "Fairly strongly — I'll respond as soon as I safely can", "scores": {"authority_compliance_score": 0.65, "risk_tolerance_score": 0.4}},
            {"value": "c", "text": "Moderately — I'll get to it when it's appropriate", "scores": {"authority_compliance_score": 0.4, "risk_tolerance_score": 0.6}},
            {"value": "d", "text": "Barely — urgency labels don't particularly change my priorities", "scores": {"authority_compliance_score": 0.1, "risk_tolerance_score": 0.8}},
        ]
    },
    {
        "id": "q5",
        "text": "Do you frequently find yourself switching between tasks, even when you're trying to stay focused on one thing?",
        "dimension": "multitasking",
        "options": [
            {"value": "a", "text": "Constantly — my mind naturally jumps between things", "scores": {"multitasking_tendency_score": 0.95, "attention_control_score": 0.1}},
            {"value": "b", "text": "Often — I usually have several things going at once", "scores": {"multitasking_tendency_score": 0.7, "attention_control_score": 0.35}},
            {"value": "c", "text": "Sometimes — I try to focus but often get pulled away", "scores": {"multitasking_tendency_score": 0.45, "attention_control_score": 0.55}},
            {"value": "d", "text": "Rarely — I prefer to fully complete one task before starting another", "scores": {"multitasking_tendency_score": 0.1, "attention_control_score": 0.9, "cognitive_patience_score": 0.75}},
        ]
    },
    {
        "id": "q6",
        "text": "When you're under significant time pressure, how does your decision quality typically change?",
        "dimension": "stress_resilience",
        "options": [
            {"value": "a", "text": "Gets noticeably worse — pressure causes me to make snap decisions I later regret", "scores": {"stress_resilience_score": 0.1, "impulsiveness_score": 0.75, "emotional_reactivity_score": 0.7}},
            {"value": "b", "text": "Gets somewhat worse — I rush but usually correct later", "scores": {"stress_resilience_score": 0.4, "impulsiveness_score": 0.55}},
            {"value": "c", "text": "Stays roughly the same — I'm fairly consistent under pressure", "scores": {"stress_resilience_score": 0.75, "impulsiveness_score": 0.3}},
            {"value": "d", "text": "Actually improves — I work better under pressure", "scores": {"stress_resilience_score": 0.9, "risk_tolerance_score": 0.7}},
        ]
    },
    {
        "id": "q7",
        "text": "How do you typically react when something unexpected happens that requires your immediate attention?",
        "dimension": "emotional_reactivity",
        "options": [
            {"value": "a", "text": "I feel a strong rush of anxiety or urgency — I need to deal with it NOW", "scores": {"emotional_reactivity_score": 0.9, "impulsiveness_score": 0.8, "stress_resilience_score": 0.15}},
            {"value": "b", "text": "I feel alert but can usually evaluate calmly before acting", "scores": {"emotional_reactivity_score": 0.45, "stress_resilience_score": 0.65}},
            {"value": "c", "text": "I stay relatively calm and assess before responding", "scores": {"emotional_reactivity_score": 0.2, "cognitive_patience_score": 0.8, "stress_resilience_score": 0.85}},
            {"value": "d", "text": "I tend to freeze briefly then slowly process the situation", "scores": {"emotional_reactivity_score": 0.35, "impulsiveness_score": 0.15, "cognitive_patience_score": 0.25}},
        ]
    },
    {
        "id": "q8",
        "text": "In fast-paced situations, do you tend to trust your instinct over established rules?",
        "dimension": "risk_tolerance",
        "options": [
            {"value": "a", "text": "Yes, always — rules slow you down when speed matters", "scores": {"risk_tolerance_score": 0.95, "impulsiveness_score": 0.8, "authority_compliance_score": 0.05}},
            {"value": "b", "text": "Usually — instinct is usually faster and often right", "scores": {"risk_tolerance_score": 0.7, "impulsiveness_score": 0.6, "authority_compliance_score": 0.25}},
            {"value": "c", "text": "Sometimes — depends on how familiar I am with the situation", "scores": {"risk_tolerance_score": 0.45, "cognitive_patience_score": 0.55}},
            {"value": "d", "text": "Rarely — rules exist for a reason and instinct can be unreliable", "scores": {"risk_tolerance_score": 0.1, "authority_compliance_score": 0.75, "cognitive_patience_score": 0.7}},
        ]
    },
    {
        "id": "q9",
        "text": "When you're aware that others are waiting for your response, how does that affect your decision-making?",
        "dimension": "authority_compliance",
        "options": [
            {"value": "a", "text": "Massively — social expectation makes me rush regardless of quality", "scores": {"authority_compliance_score": 0.9, "emotional_reactivity_score": 0.75, "impulsiveness_score": 0.7}},
            {"value": "b", "text": "Somewhat — I move faster but try to maintain quality", "scores": {"authority_compliance_score": 0.6, "emotional_reactivity_score": 0.5}},
            {"value": "c", "text": "Minimally — I'm aware of it but it doesn't change my process much", "scores": {"authority_compliance_score": 0.3, "stress_resilience_score": 0.7}},
            {"value": "d", "text": "Not at all — I respond when I'm ready regardless of others", "scores": {"authority_compliance_score": 0.05, "stress_resilience_score": 0.9, "risk_tolerance_score": 0.6}},
        ]
    },
    {
        "id": "q10",
        "text": "How would you describe your general relationship with waiting?",
        "dimension": "cognitive_patience",
        "options": [
            {"value": "a", "text": "I find waiting genuinely difficult — inaction feels like wasted time", "scores": {"cognitive_patience_score": 0.05, "impulsiveness_score": 0.8, "emotional_reactivity_score": 0.6}},
            {"value": "b", "text": "I'm not patient by nature but can manage it when necessary", "scores": {"cognitive_patience_score": 0.35, "impulsiveness_score": 0.55}},
            {"value": "c", "text": "I'm comfortable with waiting when I know the outcome is worth it", "scores": {"cognitive_patience_score": 0.75, "stress_resilience_score": 0.65}},
            {"value": "d", "text": "I'm very patient — I rarely feel the need to rush anything", "scores": {"cognitive_patience_score": 0.95, "impulsiveness_score": 0.1, "risk_tolerance_score": 0.2}},
        ]
    },
]


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


# ── Profile Label Classification ──────────────────────────────────────────────

def _derive_profile_label(scores: dict[str, float]) -> str:
    """
    Map trait scores to a psychological profile label.
    Priority-ordered: the most clinically relevant classification wins.
    """
    imp = scores["impulsiveness_score"]
    att = scores["attention_control_score"]
    emo = scores["emotional_reactivity_score"]
    auth = scores["authority_compliance_score"]
    pat = scores["cognitive_patience_score"]
    risk = scores["risk_tolerance_score"]
    stress = scores["stress_resilience_score"]
    multi = scores["multitasking_tendency_score"]

    # Emotionally Reactive: high reactivity + low resilience
    if emo >= 0.75 and stress <= 0.35:
        return "emotionally_reactive"
    # Impulsive: high impulsiveness + low patience
    if imp >= 0.72 and pat <= 0.35:
        return "impulsive"
    # Risk-Seeking: high risk tolerance + high impulsiveness
    if risk >= 0.75 and imp >= 0.55:
        return "risk_seeking"
    # Distracted: low attention + high multitasking
    if att <= 0.35 and multi >= 0.6:
        return "distracted"
    # Anxious/Hesitant: low patience + low resilience + high authority compliance
    if pat <= 0.35 and stress <= 0.4 and auth >= 0.65:
        return "hesitant"
    # Cautious: high patience + low risk + high attention
    if pat >= 0.72 and risk <= 0.3 and att >= 0.65:
        return "cautious"
    # Authoritative-compliant: high authority + moderate other traits
    if auth >= 0.75:
        return "authority_driven"
    # Default
    return "balanced"


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
class ConsistencyAnalysis:
    consistency_score: float          # 0.0–1.0
    self_awareness_score: float       # 0.0–1.0
    impulsiveness_mismatch: float     # signed delta
    attention_mismatch: float
    emotional_stability_mismatch: float
    flags: list[str]                  # human-readable mismatch descriptions


class PersonalityProfiler:

    # ── Public API ────────────────────────────────────────────────────────────

    async def process_assessment(
        self,
        db: AsyncSession,
        user_id: str,
        answers: list[dict],  # [{"question_id": "q1", "answer_value": "a"}, ...]
    ) -> PersonalityProfile:
        """
        Score the onboarding assessment and persist results.
        answers: list of {question_id, answer_value}
        Returns: the persisted PersonalityProfile record.
        """
        scores = self._score_answers(answers)
        label = _derive_profile_label(scores)

        # Fetch or create profile
        result = await db.execute(
            select(PersonalityProfile).where(PersonalityProfile.user_id == user_id)
        )
        profile = result.scalar_one_or_none()

        if profile is None:
            profile = PersonalityProfile(user_id=user_id)
            db.add(profile)

        # Update all fields
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
        # Consistency starts at 1.0 — will be updated post-simulation
        profile.consistency_score = 1.0
        profile.self_awareness_score = 0.5

        await db.flush()
        await db.refresh(profile)
        logger.info(
            "Personality assessment processed: user=%s label=%s imp=%.2f att=%.2f",
            user_id, label,
            scores["impulsiveness_score"],
            scores["attention_control_score"],
        )
        return profile

    async def get_profile(
        self, db: AsyncSession, user_id: str
    ) -> Optional[PersonalityProfile]:
        """Fetch the personality profile for a user, or None if not assessed."""
        result = await db.execute(
            select(PersonalityProfile).where(PersonalityProfile.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def update_consistency_after_session(
        self,
        db: AsyncSession,
        user_id: str,
        behavioral_state: BehavioralState,
    ) -> Optional[ConsistencyAnalysis]:
        """
        Called after each session completion.
        Compares self-reported trait scores vs actual simulation behavior.
        Updates consistency metrics on the PersonalityProfile record.
        """
        profile = await self.get_profile(db, user_id)
        if profile is None or behavioral_state.total_events < 5:
            return None  # Not enough data

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
            "Consistency updated: user=%s score=%.2f self_awareness=%.2f flags=%s",
            user_id, analysis.consistency_score, analysis.self_awareness_score, analysis.flags
        )
        return analysis

    def build_trait_context_for_prompt(self, profile: PersonalityProfile) -> str:
        """
        Returns a compact human-readable trait summary for LLM prompt injection.
        """
        traits = []
        if profile.impulsiveness_score >= 0.7:
            traits.append("highly impulsive decision-making")
        elif profile.impulsiveness_score <= 0.3:
            traits.append("deliberate, slow decision-making")

        if profile.attention_control_score <= 0.35:
            traits.append("low attentional control")
        elif profile.attention_control_score >= 0.75:
            traits.append("strong focused attention")

        if profile.emotional_reactivity_score >= 0.7:
            traits.append("high emotional reactivity to urgency cues")

        if profile.authority_compliance_score >= 0.75:
            traits.append("strong obligation to authority figures")
        elif profile.authority_compliance_score <= 0.2:
            traits.append("resistant to authority pressure")

        if profile.risk_tolerance_score >= 0.75:
            traits.append("risk-seeking orientation")
        elif profile.risk_tolerance_score <= 0.25:
            traits.append("risk-averse, rule-based decision framework")

        if profile.multitasking_tendency_score >= 0.7:
            traits.append("habitual multitasker with fragmented attention")

        if profile.stress_resilience_score <= 0.3:
            traits.append("deteriorates rapidly under time pressure")
        elif profile.stress_resilience_score >= 0.8:
            traits.append("resilient under stress")

        if not traits:
            return "balanced cognitive profile"
        return "; ".join(traits)

    # ── Internals ─────────────────────────────────────────────────────────────

    def _score_answers(self, answers: list[dict]) -> dict[str, float]:
        """
        Aggregate per-question scores into per-dimension averages.
        answers: [{"question_id": "q1", "answer_value": "a"}, ...]
        """
        dimension_sums: dict[str, list[float]] = {d: [] for d in TRAIT_DIMENSIONS}

        # Build question lookup
        q_lookup = {q["id"]: q for q in ASSESSMENT_QUESTIONS}

        for answer in answers:
            qid = answer.get("question_id")
            val = answer.get("answer_value")
            if qid not in q_lookup:
                continue
            question = q_lookup[qid]
            # Find matching option
            chosen = next((o for o in question["options"] if o["value"] == val), None)
            if chosen is None:
                continue
            for dim, score in chosen.get("scores", {}).items():
                if dim in dimension_sums:
                    dimension_sums[dim].append(score)

        # Average per dimension, default to 0.5 if no data
        result = {}
        for dim in TRAIT_DIMENSIONS:
            vals = dimension_sums[dim]
            result[dim] = round(sum(vals) / len(vals), 3) if vals else 0.5
        return result

    def _compute_consistency(
        self,
        profile: PersonalityProfile,
        state: BehavioralState,
    ) -> ConsistencyAnalysis:
        """
        Compare self-reported trait scores to simulation-derived behavior signals.
        Returns a consistency analysis with delta values and flags.
        """
        flags = []

        # ── Compute simulation-derived trait proxies ───────────────────────
        total = max(state.total_events, 1)
        safe_ratio = state.safe_decisions / total

        # Simulated impulsiveness: ratio of sub-2s unsafe reactions
        sim_impulsiveness = min(1.0, state.impulsive_count / max(total * 0.3, 1))

        # Simulated attention: inverse of distracted ratio
        sim_attention = safe_ratio  # Higher safe ratio ≈ better attention

        # Simulated emotional reactivity: yield rate under pressure
        total_pressure = max(state.pressure_yield_count + state.pressure_resist_count, 1)
        sim_emotional_reactivity = state.pressure_yield_count / total_pressure

        # ── Compute deltas (reported - simulated) ──────────────────────────
        imp_delta = profile.impulsiveness_score - sim_impulsiveness
        att_delta = profile.attention_control_score - sim_attention
        emo_delta = (1 - profile.emotional_reactivity_score) - (1 - sim_emotional_reactivity)

        # ── Detect mismatches ─────────────────────────────────────────────
        if abs(imp_delta) > 0.35:
            direction = "underestimated" if imp_delta < 0 else "overestimated"
            flags.append(f"Impulsiveness {direction}: self-reported {profile.impulsiveness_score:.1f}, simulated {sim_impulsiveness:.1f}")

        if abs(att_delta) > 0.3:
            direction = "overestimates" if att_delta > 0 else "underestimates"
            flags.append(f"Attention {direction} own focus: self-reported {profile.attention_control_score:.1f}, simulated {sim_attention:.1f}")

        if abs(emo_delta) > 0.3:
            direction = "calmer than expected" if emo_delta < 0 else "more reactive than expected"
            flags.append(f"Emotional response is {direction} under pressure")

        # ── Overall consistency score ──────────────────────────────────────
        # 1.0 = perfect match; lower = larger divergence
        avg_mismatch = (abs(imp_delta) + abs(att_delta) + abs(emo_delta)) / 3
        consistency_score = round(max(0.0, 1.0 - avg_mismatch), 3)

        # ── Self-awareness score ───────────────────────────────────────────
        # High self-awareness = low mismatch, regardless of direction
        self_awareness_score = consistency_score

        return ConsistencyAnalysis(
            consistency_score=consistency_score,
            self_awareness_score=self_awareness_score,
            impulsiveness_mismatch=round(imp_delta, 3),
            attention_mismatch=round(att_delta, 3),
            emotional_stability_mismatch=round(emo_delta, 3),
            flags=flags,
        )


# ── Singleton ─────────────────────────────────────────────────────────────────
personality_profiler = PersonalityProfiler()
