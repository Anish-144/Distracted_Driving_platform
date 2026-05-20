"""
Behavioral Observability Engine.

This service replaces frontend-derived "vanity metrics" with research-grade
longitudinal metrics based strictly on the intervention history.

Metrics calculated here:
- Unsafe Decision Reduction % (how much unsafe behavior dropped after intervention)
- Average Hesitation Recovery Time (time to make a decision after a cognitive overload)
- Authority Intervention Success Rate (how often authority agents prevented a mistake)
- Cognitive Overload Failure Rate (how often a layered distraction caused an unsafe decision)
- Intervention Fatigue Index (decline in responsiveness over time)
"""

import math
from typing import Dict, List, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc

from app.models.intervention_log import InterventionLog
from app.models.behavioral_state import BehavioralState


class ObservabilityEngine:
    async def get_longitudinal_metrics(self, db: AsyncSession, user_id: str) -> Dict[str, Any]:
        """Calculate and return research-grade observability metrics."""
        
        # 1. Fetch all intervention logs for the user
        stmt = select(InterventionLog).where(
            InterventionLog.user_id == user_id,
            InterventionLog.effectiveness_score != None
        ).order_by(InterventionLog.created_at)
        
        result = await db.execute(stmt)
        logs = result.scalars().all()

        if not logs:
            return self._empty_metrics()

        # Analytics Accumulators
        auth_successes = 0
        auth_attempts = 0
        
        overload_failures = 0
        overload_attempts = 0
        
        hesitation_times = []
        
        # Calculate Unsafe Decision Reduction
        # Split history into "early" (first 30%) and "late" (last 30%)
        # to see if unsafe decision frequency dropped
        unsafe_early = 0
        unsafe_late = 0
        
        third = max(1, len(logs) // 3)
        early_logs = logs[:third]
        late_logs = logs[-third:]
        
        for log in early_logs:
            if log.resulting_decision in ("impulsive_unsafe", "risky", "delayed_hesitant"):
                unsafe_early += 1
                
        for log in late_logs:
            if log.resulting_decision in ("impulsive_unsafe", "risky", "delayed_hesitant"):
                unsafe_late += 1
                
        unsafe_reduction_pct = 0.0
        if unsafe_early > 0:
            reduction = ((unsafe_early - unsafe_late) / unsafe_early) * 100
            unsafe_reduction_pct = round(reduction, 1)

        # Calculate Fatigue Index (Rolling average of effectiveness dropping over time)
        effectiveness_trend = []
        for log in logs:
            effectiveness_trend.append(log.effectiveness_score)
            
            # Authority Success Rate
            if log.agent_type == "authority":
                auth_attempts += 1
                if log.effectiveness_score > 0:
                    auth_successes += 1
                    
            # Cognitive Overload Failure Rate (proxy: if prior mistakes >= 2 and they failed again)
            if log.prior_consecutive_mistakes >= 2:
                overload_attempts += 1
                if log.effectiveness_score < 0:
                    overload_failures += 1
                    
            # Hesitation Recovery Time (how long it took them to respond after an intervention)
            if log.resulting_reaction_time is not None:
                hesitation_times.append(log.resulting_reaction_time)

        auth_success_rate = round((auth_successes / auth_attempts * 100), 1) if auth_attempts > 0 else 0.0
        overload_failure_rate = round((overload_failures / overload_attempts * 100), 1) if overload_attempts > 0 else 0.0
        avg_hesitation_recovery = round(sum(hesitation_times) / len(hesitation_times), 2) if hesitation_times else 0.0
        
        # Fatigue Index: If the last 5 interventions were less effective than the first 5
        fatigue_index = 0.0
        if len(effectiveness_trend) >= 6:
            early_eff = sum(effectiveness_trend[:3]) / 3
            late_eff = sum(effectiveness_trend[-3:]) / 3
            if early_eff > 0 and late_eff < early_eff:
                fatigue_index = round(((early_eff - late_eff) / early_eff) * 100, 1)
        
        return {
            "total_interventions_tracked": len(logs),
            "unsafe_decision_reduction_pct": unsafe_reduction_pct,
            "authority_success_rate_pct": auth_success_rate,
            "cognitive_overload_failure_pct": overload_failure_rate,
            "avg_hesitation_recovery_sec": avg_hesitation_recovery,
            "intervention_fatigue_index": max(0.0, fatigue_index) # bounded at 0
        }
        
    def _empty_metrics(self) -> Dict[str, Any]:
        return {
            "total_interventions_tracked": 0,
            "unsafe_decision_reduction_pct": 0.0,
            "authority_success_rate_pct": 0.0,
            "cognitive_overload_failure_pct": 0.0,
            "avg_hesitation_recovery_sec": 0.0,
            "intervention_fatigue_index": 0.0
        }

    async def get_psychological_metrics(self, db: AsyncSession, user_id: str) -> Dict[str, Any]:
        """
        NEW: Extended psychological metrics derived from the personality profile
        and behavioral state. Returns self-awareness, emotional susceptibility,
        authority pressure index, cognitive overload, and behavioral consistency scores.
        """
        from app.models.personality_profile import PersonalityProfile
        from app.models.behavioral_state import BehavioralState

        # Fetch personality profile
        profile_result = await db.execute(
            select(PersonalityProfile).where(PersonalityProfile.user_id == user_id)
        )
        profile = profile_result.scalar_one_or_none()

        # Fetch behavioral state
        state_result = await db.execute(
            select(BehavioralState).where(BehavioralState.user_id == user_id)
        )
        state = state_result.scalar_one_or_none()

        if profile is None and state is None:
            return self._empty_psychological_metrics()

        # ── Self-Awareness Score ───────────────────────────────────────────────
        # How accurately user self-reports their own behavior
        self_awareness_score = profile.self_awareness_score if profile else 0.5
        consistency_score = profile.consistency_score if profile else 1.0

        # ── Emotional Susceptibility Score ────────────────────────────────────
        # Combination of emotional reactivity + pressure yield rate
        emotional_reactivity = profile.emotional_reactivity_score if profile else 0.5
        if state:
            total_pressure = max(state.pressure_yield_count + state.pressure_resist_count, 1)
            pressure_yield_rate = state.pressure_yield_count / total_pressure
            # Weighted combination: 60% trait, 40% actual behavior
            emotional_susceptibility = round((emotional_reactivity * 0.6) + (pressure_yield_rate * 0.4), 3)
        else:
            emotional_susceptibility = round(emotional_reactivity, 3)

        # ── Authority Pressure Index ───────────────────────────────────────────
        # How strongly authority cues affect decision-making
        authority_score = profile.authority_compliance_score if profile else 0.5
        if state:
            # Normalize by how often authority pressure led to unsafe decisions
            total_p = max(state.pressure_yield_count + state.pressure_resist_count, 1)
            authority_susceptibility = state.pressure_yield_count / total_p
            authority_pressure_index = round((authority_score * 0.5) + (authority_susceptibility * 0.5), 3)
        else:
            authority_pressure_index = round(authority_score, 3)

        # ── Cognitive Overload Score ───────────────────────────────────────────
        # Risk of failure under compound distraction load
        multitasking_tendency = profile.multitasking_tendency_score if profile else 0.5
        attention_control = profile.attention_control_score if profile else 0.5
        # Low attention + high multitasking tendency = high overload risk
        raw_overload = (multitasking_tendency * 0.5) + ((1 - attention_control) * 0.5)
        cognitive_overload_score = round(raw_overload, 3)

        # ── Behavioral Consistency Score ───────────────────────────────────────
        # Direct from profile
        behavioral_consistency = round(consistency_score, 3)

        # ── Impulsiveness vs Reality Mismatch ────────────────────────────────
        impulsiveness_mismatch = abs(profile.impulsiveness_mismatch) if profile else 0.0
        has_completed_assessment = profile is not None

        return {
            "self_awareness_score": self_awareness_score,
            "emotional_susceptibility_score": emotional_susceptibility,
            "authority_pressure_index": authority_pressure_index,
            "cognitive_overload_score": cognitive_overload_score,
            "behavioral_consistency_score": behavioral_consistency,
            "impulsiveness_mismatch_pct": round(impulsiveness_mismatch * 100, 1),
            "attention_mismatch_pct": round(abs(profile.attention_mismatch) * 100, 1) if profile else 0.0,
            "emotional_mismatch_pct": round(abs(profile.emotional_stability_mismatch) * 100, 1) if profile else 0.0,
            "onboarding_profile_label": profile.onboarding_profile_label if profile else "unknown",
            "has_completed_assessment": has_completed_assessment,
            "total_simulations_since_assessment": profile.total_simulations_since_assessment if profile else 0,
        }

    def _empty_psychological_metrics(self) -> Dict[str, Any]:
        return {
            "self_awareness_score": 0.5,
            "emotional_susceptibility_score": 0.5,
            "authority_pressure_index": 0.5,
            "cognitive_overload_score": 0.5,
            "behavioral_consistency_score": 1.0,
            "impulsiveness_mismatch_pct": 0.0,
            "attention_mismatch_pct": 0.0,
            "emotional_mismatch_pct": 0.0,
            "onboarding_profile_label": "unknown",
            "has_completed_assessment": False,
            "total_simulations_since_assessment": 0,
        }

observability_engine = ObservabilityEngine()

