# OBSERVABILITY_ENGINE.md — Longitudinal Analytics

---

## Overview

The Observability Engine powers the dashboard's "Research" tab. It aggregates raw session events into high-level behavioral and psychological metrics, enabling tracking of improvement (or degradation) over time.

## Data Source Hierarchy (CRITICAL)

The engine (`intervention_observability.py`) uses a dual-source strategy to ensure the dashboard always has data after a simulation:

1. **Primary Source**: `Session` + `Event` + `BehavioralLog` tables.
   - These are guaranteed to exist if the user has driven.
   - Used to calculate `safe_ratio`, `avg_hesitation_recovery`, `cognitive_overload_pct`.
2. **Supplementary Source**: `BehavioralState`.
   - Used as an override IF `total_events > 0`. (Note: `BehavioralState` only updates when the `/api/ai/feedback` endpoint is called).
3. **High-Precision Override**: `InterventionLog`.
   - Used to calculate AI effectiveness and intervention fatigue if the coaching engine was active and logged.

**Rule**: NEVER gate the observability endpoint solely on `BehavioralState` or `InterventionLog`, as this results in the "Awaiting Longitudinal Data" error when users skip the AI feedback phase.

## Core Metrics

- **Total Interventions Tracked**: Number of sessions (or interventions) analyzed.
- **Unsafe Decision Reduction**: Compares early sessions vs late sessions.
- **Authority Success Rate**: Proxy for how often the user resists unsafe impulses.
- **Cognitive Overload Failure Rate**: Combined rate of impulsive (fast/unsafe) and hesitant (very slow) decisions.
- **Avg Hesitation Recovery**: Average reaction time for delayed decisions (>5s).
- **Intervention Fatigue Index**: Score degradation over time.

## Psychological Profiling

The engine also bridges onboarding data with simulation data:
- Combines the user's static `PersonalityProfile` (from the onboarding quiz) with their dynamic simulation behavior.
- Calculates `impulsiveness_mismatch_pct` (e.g., user claimed to be patient but reacts impulsively in sim).

## Engineering Constraints
- The `/api/ai/observability/metrics` endpoint must be fast. Perform aggregations via SQLAlchemy where possible, or limit the number of sessions analyzed in Python.
- Never hardcode zero values unless the user has zero completed sessions.
