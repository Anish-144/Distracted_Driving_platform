# SIMULATION_ENGINE.md — SafeDrive AI Simulation Runtime

---

## Architecture

The simulation engine is the core interactive loop of the SafeDrive AI platform. It runs primarily in the browser via React/Redux (`frontend/src/pages/simulation/index.tsx`) and is supported by several backend services.

**The Loop:**
1. Scenario generation / fetching (`scenarios.py`)
2. In-browser timer & prompt display (`simulation/index.tsx`)
3. User interaction (Ignore, Glance, Interact)
4. Event scoring & logging (`events.py`)
5. AI coaching feedback (`ai.py`)

## Core Concepts

### 1. Scenario Generation (`ScenarioGenerator`)
- Replaces static scenarios with dynamic, psychologically tailored narratives.
- Adaptive based on user's `profile_type` and past mistakes.
- Follows a 3-stage emotional escalation pattern to create genuine psychological pressure.
- Cascade: Gemini → GPT → DeepSeek → Hardcoded Fallback.
- **Rule**: Never use generic "Your phone rings". Context must be specific (e.g., "You're running 15 mins late...").

### 2. Behavioral State Tracking
- The simulation does NOT directly update `BehavioralState`.
- `events.py` logs the raw `Event` and `BehavioralLog`.
- `BehavioralState` is updated via `behavior_analyzer.analyze_event()` when the frontend calls `/api/ai/feedback`.
- **Rule**: The AI feedback endpoint is the trigger for longitudinal state updates.

### 3. Cognitive Pressure & Coaching (`AICoach`)
- **Passenger**: Pre-decision pressure. Uses zero-latency psychological phrase pools (no LLM) to apply immediate social pressure.
- **Instructor/Authority**: Post-decision feedback. Uses LLMs (with memory injected to prevent repetition) to correct or reinforce behavior.
- **Rule**: Never expose raw LLM delays during the simulation pressure phase.

### 4. Scoring Logic (`evaluate_decision`)
- Safe (Ignored/Voice Command): +10
- Delayed Hesitant (No response / > 5s): -5 to -10
- Risky (Interacted 2-5s): -15
- Impulsive Unsafe (Interacted < 2s): -20

## Frontend Synchronization

- Simulation state is managed entirely in Redux `sessionSlice.ts`.
- Transitions (e.g., waiting → active → feedback) must be atomic.
- Component unmounts must clean up timers to prevent memory leaks and zombie scenarios.
- **Rule**: Never use local component state for the active scenario or score.

## Future Scaling
- **WebSocket Integration**: Move from HTTP polling to WebSockets for real-time bi-directional telemetry and zero-latency coaching.
- **Video/WebGL Generation**: Hook the scenario narrative generator into an image/video model for visual immersion.
