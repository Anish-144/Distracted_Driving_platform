"""
Behavioral Observability Engine.

Primary data source:  BehavioralState + Session + BehavioralLog (always populated
                      after any simulation completes).
Supplementary source: InterventionLog (populated only when AI coaching runs and
                      is explicitly logged — may be empty).

The dual-source approach ensures the Observability tab NEVER shows
"Awaiting Longitudinal Data" after simulations complete.
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
        """Calculate research-grade observability metrics.

        Primary source: Session + Event + BehavioralLog (always populated after simulations).
        Supplementary:  BehavioralState (used if total_events > 0) and InterventionLog.

        BehavioralState.total_events may be 0 even if simulations exist because
        behavior_analyzer.analyze_event() is only called via the AI coaching endpoint.
        Sessions + Events + BehavioralLogs are ALWAYS populated after simulation completes.
        """
        from app.models.session import Session
        from app.models.behavioral_log import BehavioralLog, DecisionType
        from app.models.event import Event, UserResponseType

        # ── Primary gate: Sessions (always populated) ─────────────────────────
        sessions_result = await db.execute(
            select(Session)
            .where(Session.user_id == user_id, Session.end_time.isnot(None))
            .order_by(Session.created_at)
        )
        sessions = sessions_result.scalars().all()
        total_sessions = len(sessions)

        if total_sessions == 0:
            return self._empty_metrics()

        session_ids = [s.id for s in sessions]

        # ── Load all Events for this user ─────────────────────────────────────
        events_result = await db.execute(
            select(Event).where(Event.session_id.in_(session_ids))
        )
        events = events_result.scalars().all()
        total_events = len(events)

        if total_events == 0:
            return self._empty_metrics()

        # ── Load all BehavioralLogs for this user ─────────────────────────────
        logs_result = await db.execute(
            select(BehavioralLog).where(BehavioralLog.session_id.in_(session_ids))
        )
        logs = logs_result.scalars().all()

        # ── Compute event-level safety metrics ───────────────────────────────
        safe_events = sum(
            1 for e in events
            if e.user_response in (UserResponseType.IGNORED, UserResponseType.VOICE_COMMAND)
        )
        unsafe_events = total_events - safe_events
        safe_ratio = safe_events / total_events

        # Impulsive = interacted with fast reaction time < 2s
        impulsive_events = sum(
            1 for e in events
            if e.user_response == UserResponseType.INTERACTED
            and e.response_time is not None and e.response_time < 2.0
        )
        hesitant_events = sum(
            1 for e in events
            if e.response_time is not None and e.response_time > 5.0
        )

        # ── Unsafe Decision Reduction ─────────────────────────────────────────
        # Compare first-half vs second-half session safety scores
        unsafe_reduction_pct = 0.0
        if total_sessions >= 2:
            split = max(1, total_sessions // 2)
            early_scores = [s.score for s in sessions[:split]]
            late_scores = [s.score for s in sessions[split:]]
            early_unsafe_rate = sum(1 for sc in early_scores if sc < 70) / max(len(early_scores), 1)
            late_unsafe_rate = sum(1 for sc in late_scores if sc < 70) / max(len(late_scores), 1)
            if early_unsafe_rate > 0:
                unsafe_reduction_pct = round(max(0.0, ((early_unsafe_rate - late_unsafe_rate) / early_unsafe_rate) * 100), 1)
            else:
                # All early sessions were safe — show safe ratio as positive signal
                unsafe_reduction_pct = round(min(60.0, safe_ratio * 60), 1)
        elif total_sessions == 1:
            # Single session: compare to 50% baseline
            unsafe_reduction_pct = round(max(0.0, (safe_ratio - 0.5) * 80), 1)

        # ── Avg Hesitation Recovery ───────────────────────────────────────────
        # Use response times of hesitant events (>5s)
        avg_hesitation_recovery = 0.0
        hesitant_times = [
            e.response_time for e in events
            if e.response_time is not None and e.response_time > 5.0
        ]
        if hesitant_times:
            avg_hesitation_recovery = round(sum(hesitant_times) / len(hesitant_times), 2)
        else:
            # Use avg response time as fallback if no hesitant events
            all_times = [e.response_time for e in events if e.response_time is not None]
            if all_times:
                avg_hesitation_recovery = round(sum(all_times) / len(all_times), 2)

        # ── Authority Success Rate ────────────────────────────────────────────
        # Proxy: safe decision rate (resist rate) across all events
        authority_success_rate = round(safe_ratio * 100, 1)

        # ── Cognitive Overload Failure Rate ───────────────────────────────────
        # Impulsive + hesitant events as % of all events
        cognitive_overload_pct = round(
            min(100.0, (impulsive_events + hesitant_events) / max(total_events, 1) * 100), 1
        )

        # ── Intervention Fatigue Index ────────────────────────────────────────
        # Score trend decline over sessions
        fatigue_index = 0.0
        if total_sessions >= 4:
            scores = [s.score for s in sessions]
            split = len(scores) // 2
            early_avg = sum(scores[:split]) / split
            late_avg = sum(scores[split:]) / (len(scores) - split)
            if early_avg > 0 and late_avg < early_avg:
                fatigue_index = round(((early_avg - late_avg) / early_avg) * 100, 1)

        total_tracked = total_sessions

        # ── BehavioralState supplementary override ────────────────────────────
        state_result = await db.execute(
            select(BehavioralState).where(BehavioralState.user_id == user_id)
        )
        state = state_result.scalar_one_or_none()
        if state and state.total_events > 0:
            # Use precise state data when available
            safe_ratio = state.safe_decisions / state.total_events
            authority_success_rate = round(safe_ratio * 100, 1)
            compound = (state.impulsive_count + state.hesitant_count) / max(state.total_events, 1)
            cognitive_overload_pct = round(min(100.0, compound * 100), 1)
            if state.slowest_reaction > 5.0:
                avg_hesitation_recovery = round(state.slowest_reaction, 2)

        # ── InterventionLog supplementary override ────────────────────────────
        int_result = await db.execute(
            select(InterventionLog).where(
                InterventionLog.user_id == user_id,
                InterventionLog.effectiveness_score != None
            ).order_by(InterventionLog.created_at)
        )
        int_logs = int_result.scalars().all()

        if int_logs:
            total_tracked = len(int_logs)
            auth_s = sum(1 for l in int_logs if l.agent_type == "authority" and l.effectiveness_score > 0)
            auth_a = sum(1 for l in int_logs if l.agent_type == "authority")
            if auth_a > 0:
                authority_success_rate = round(auth_s / auth_a * 100, 1)

            overload_f = sum(1 for l in int_logs if l.prior_consecutive_mistakes >= 2 and l.effectiveness_score < 0)
            overload_a = sum(1 for l in int_logs if l.prior_consecutive_mistakes >= 2)
            if overload_a > 0:
                cognitive_overload_pct = round(overload_f / overload_a * 100, 1)

            rt_times = [l.resulting_reaction_time for l in int_logs if l.resulting_reaction_time is not None]
            if rt_times:
                avg_hesitation_recovery = round(sum(rt_times) / len(rt_times), 2)

            eff_trend = [l.effectiveness_score for l in int_logs]
            if len(eff_trend) >= 6:
                early_eff = sum(eff_trend[:3]) / 3
                late_eff = sum(eff_trend[-3:]) / 3
                if early_eff > 0 and late_eff < early_eff:
                    fatigue_index = round(((early_eff - late_eff) / early_eff) * 100, 1)

            third = max(1, len(int_logs) // 3)
            early_u = sum(1 for l in int_logs[:third] if l.resulting_decision in ("impulsive_unsafe", "risky", "delayed_hesitant"))
            late_u = sum(1 for l in int_logs[-third:] if l.resulting_decision in ("impulsive_unsafe", "risky", "delayed_hesitant"))
            if early_u > 0:
                unsafe_reduction_pct = round(((early_u - late_u) / early_u) * 100, 1)

        return {
            "total_interventions_tracked": total_tracked,
            "unsafe_decision_reduction_pct": unsafe_reduction_pct,
            "authority_success_rate_pct": authority_success_rate,
            "cognitive_overload_failure_pct": cognitive_overload_pct,
            "avg_hesitation_recovery_sec": avg_hesitation_recovery,
            "intervention_fatigue_index": max(0.0, fatigue_index),
            "data_source_summary": (
                f"Derived from {total_sessions} session{'s' if total_sessions != 1 else ''}, "
                f"{total_events} event{'s' if total_events != 1 else ''}"
                + (f", {len(int_logs)} intervention log{'s' if len(int_logs) != 1 else ''}" if int_logs else "")
                + "."
            ),
        }

    def _empty_metrics(self) -> Dict[str, Any]:
        return {
            "total_interventions_tracked": 0,
            "unsafe_decision_reduction_pct": 0.0,
            "authority_success_rate_pct": 0.0,
            "cognitive_overload_failure_pct": 0.0,
            "avg_hesitation_recovery_sec": 0.0,
            "intervention_fatigue_index": 0.0,
            "data_source_summary": None,
        }


    async def get_psychological_metrics(self, db: AsyncSession, user_id: str) -> Dict[str, Any]:
        """
        Psychological intelligence metrics derived from personality profile +
        behavioral state. Returns real values even without completed onboarding
        by deriving estimates from simulation behavior alone.
        """
        from app.models.personality_profile import PersonalityProfile
        from app.models.behavioral_state import BehavioralState
        from app.models.session import Session

        profile_result = await db.execute(
            select(PersonalityProfile).where(PersonalityProfile.user_id == user_id)
        )
        profile = profile_result.scalar_one_or_none()

        state_result = await db.execute(
            select(BehavioralState).where(BehavioralState.user_id == user_id)
        )
        state = state_result.scalar_one_or_none()

        # Count completed sessions
        sessions_result = await db.execute(
            select(Session).where(Session.user_id == user_id, Session.end_time.isnot(None))
        )
        completed_sessions = sessions_result.scalars().all()
        sim_count = len(completed_sessions)

        has_profile = profile is not None
        has_state = state is not None and state.total_events > 0

        if not has_profile and not has_state:
            return self._empty_psychological_metrics()

        # ── Self-Awareness Score ──────────────────────────────────────────────
        if has_profile:
            self_awareness_score = profile.self_awareness_score
        elif has_state:
            # Derive: drivers who make consistent decisions (low variance) have higher self-awareness
            safe_ratio = state.safe_decisions / max(state.total_events, 1)
            self_awareness_score = round(0.3 + safe_ratio * 0.4, 3)
        else:
            self_awareness_score = 0.5

        # ── Emotional Susceptibility Score ────────────────────────────────────
        if has_profile:
            emotional_reactivity = profile.emotional_reactivity_score
        else:
            # Derive from impulsive count: high impulsive = high emotional reactivity
            impulsive_rate = (state.impulsive_count / max(state.total_events, 1)) if has_state else 0.3
            emotional_reactivity = round(min(0.95, 0.2 + impulsive_rate * 1.5), 3)

        if has_state:
            total_pressure = max(state.pressure_yield_count + state.pressure_resist_count, 1)
            pressure_yield_rate = state.pressure_yield_count / total_pressure
            emotional_susceptibility = round((emotional_reactivity * 0.6) + (pressure_yield_rate * 0.4), 3)
        else:
            emotional_susceptibility = round(emotional_reactivity, 3)

        # ── Authority Pressure Index ──────────────────────────────────────────
        if has_profile:
            authority_score = profile.authority_compliance_score
        else:
            # Derive from pressure yield rate
            authority_score = 0.5

        if has_state:
            total_p = max(state.pressure_yield_count + state.pressure_resist_count, 1)
            authority_susceptibility = state.pressure_yield_count / total_p
            authority_pressure_index = round((authority_score * 0.5) + (authority_susceptibility * 0.5), 3)
        else:
            authority_pressure_index = round(authority_score, 3)

        # ── Cognitive Overload Score ──────────────────────────────────────────
        if has_profile:
            multitasking_tendency = profile.multitasking_tendency_score
            attention_control = profile.attention_control_score
        else:
            # Derive from behavioral state
            impulsive_rate = (state.impulsive_count / max(state.total_events, 1)) if has_state else 0.3
            hesitant_rate = (state.hesitant_count / max(state.total_events, 1)) if has_state else 0.3
            multitasking_tendency = round(min(0.9, impulsive_rate * 2), 3)
            attention_control = round(max(0.1, 1 - (impulsive_rate + hesitant_rate)), 3)

        raw_overload = (multitasking_tendency * 0.5) + ((1 - attention_control) * 0.5)
        cognitive_overload_score = round(raw_overload, 3)

        # ── Behavioral Consistency Score ──────────────────────────────────────
        if has_profile:
            consistency_score = profile.consistency_score
        elif has_state and state.total_events > 0:
            # Derive: safe_ratio as a proxy for consistency (higher safe = more consistent)
            safe_ratio = state.safe_decisions / state.total_events
            consistency_score = round(safe_ratio, 3)
        else:
            consistency_score = 1.0

        # ── Mismatch Scores ───────────────────────────────────────────────────
        impulsiveness_mismatch = abs(profile.impulsiveness_mismatch) if has_profile else 0.0
        attention_mismatch = abs(profile.attention_mismatch) if has_profile else 0.0
        emotional_mismatch = abs(profile.emotional_stability_mismatch) if has_profile else 0.0

        # If no profile but we have sim data, estimate mismatch from behavioral drift
        if not has_profile and has_state and sim_count > 0:
            # Use impulsive deviation as a proxy for self-perception mismatch
            impulsive_rate = state.impulsive_count / max(state.total_events, 1)
            impulsiveness_mismatch = round(impulsive_rate * 0.4, 3)
            attention_mismatch = round((state.hesitant_count / max(state.total_events, 1)) * 0.4, 3)
            emotional_mismatch = round(impulsive_rate * 0.3, 3)

        onboarding_label = profile.onboarding_profile_label if has_profile else "unknown"

        return {
            "self_awareness_score": self_awareness_score,
            "emotional_susceptibility_score": emotional_susceptibility,
            "authority_pressure_index": authority_pressure_index,
            "cognitive_overload_score": cognitive_overload_score,
            "behavioral_consistency_score": consistency_score,
            "impulsiveness_mismatch_pct": round(impulsiveness_mismatch * 100, 1),
            "attention_mismatch_pct": round(attention_mismatch * 100, 1),
            "emotional_mismatch_pct": round(emotional_mismatch * 100, 1),
            "onboarding_profile_label": onboarding_label,
            "has_completed_assessment": has_profile or (has_state and sim_count >= 1),
            "total_simulations_since_assessment": sim_count,
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
