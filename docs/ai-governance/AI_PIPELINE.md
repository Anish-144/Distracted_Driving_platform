# AI_PIPELINE.md — SafeDrive AI Cognitive Orchestration

---

## Overview

SafeDrive AI relies on a robust LLM pipeline to power the `ScenarioGenerator`, `AICoach`, `LessonGenerationService`, and `CognitiveReportService`. Because LLM APIs can be flaky or slow, the system is designed for maximum resilience.

## The Provider Cascade

Defined in `services/llm_provider.py`.

1. **Gemini 2.0 Flash Lite**: Primary provider. Fast, cost-effective, excellent at structured JSON output.
2. **GPT-4o-mini**: Secondary. High reasoning capability, slightly higher latency.
3. **DeepSeek Chat**: Tertiary. Used if OpenAI is rate-limited.
4. **Hardcoded Fallback**: Final safety net.

### Rules for the Cascade:
- **Timeouts**: Each provider has a strict timeout (e.g., 6.0 seconds). If it hangs, the cascade immediately moves to the next.
- **No SDKs**: The provider uses direct HTTP calls (`httpx`) to avoid dependency bloat and ensure precise timeout control.
- **Graceful Degradation**: The system MUST NEVER return an HTTP 500 simply because the LLMs are down. It must always fall back gracefully.

## The Fallback Architecture

If all LLMs fail, the system falls back to predefined content.
- **Rule**: Fallback content must be **substantive and schema-compliant**.
- For Lessons: `_FALLBACK_LESSONS` must exactly match the `UserLesson` DB schema keys.
- For Scenarios: `_build_fallback()` uses a deterministic hash based on the user's profile to select varied contexts, preventing identical scenarios.

## Prompt Engineering Standards

All prompts in the system must follow these rules:
1. **Context Injection**: Always inject the user's `driver_profile` (e.g., impulsive, hesitant) and `consecutive_mistakes`.
2. **Behavioral Realism**: Instruct the LLM to avoid robotic, generic phrasing. E.g., for the Passenger agent, enforce "Max 2 sentences. Natural human speech."
3. **JSON Enforcement**: When expecting JSON, the prompt must explicitly outline the required keys and types.
4. **Anti-Repetition**: For conversational agents, always inject recent session dialogue to prevent the LLM from repeating the same advice.

## Specialized AI Subsystems

### 1. Zero-Latency Passenger Pressure
The "Passenger" agent (which applies pressure *before* a decision) does NOT use the LLM at runtime. It uses pre-computed phrase pools (`phrase_pools.py`) to ensure zero latency during the critical simulation moment.

### 2. Intervention Engine
The `InterventionEngine` logs every AI coaching response and correlates it with the user's subsequent behavior. It uses this data to dynamically select the optimal coaching strategy (e.g., if a user ignores "calm reinforcement", it escalates to "authority pressure").
