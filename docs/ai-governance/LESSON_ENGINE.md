# LESSON_ENGINE.md — Adaptive Lesson Generation

---

## Overview

The Lesson Engine generates personalized safety curriculums based on a user's simulated driving behavior. It bridges the gap between raw data (mistakes, reaction times) and actionable psychological intervention.

## Pipeline Flow

1. User completes a session or triggers lesson generation manually (`/api/lessons/ai/generate`).
2. Backend queries `BehavioralState` and `BehavioralLog`.
3. `LessonGenerationService` constructs a prompt combining trait data, recent mistakes, and reaction times.
4. LLM Provider (Gemini → GPT → DeepSeek) generates a structured JSON payload.
5. Service parses the JSON, validates keys, and persists a `UserLesson` record.

## Core Rules & Constraints

### 1. Data Schema Adherence
The generated JSON MUST strictly match the SQLAlchemy `UserLesson` model.
Required fields:
- `behavioral_diagnosis`
- `psychological_interpretation`
- `cognitive_coaching_narrative`
- `behavioral_exercises`
- `personalized_improvement_strategy`

**Rule**: Any schema change in `UserLesson` MUST be mirrored in the LLM prompt and the fallback dictionary.

### 2. The Fallback Pool
When all LLM providers fail or time out, the system uses `_FALLBACK_LESSONS` in `lesson_service.py`.
- **Rule**: The fallback pool is NOT a placeholder. It contains research-grade, profile-specific (impulsive, distracted, hesitant, safe) content.
- **Rule**: The fallback pool dictionary keys MUST exactly match the `UserLesson` DB schema to prevent "Pending" or empty fields in the UI.

### 3. Personalization
- Lessons must not be generic driver's ed material.
- They must reference the user's specific `dominant_fail_scenario` (e.g., "WhatsApp Notification").
- They must address the psychological root cause (e.g., dopamine loop vs decisional paralysis).

## Persistence
- AI lessons are saved to the `user_lessons` table.
- They are linked to the `session_id` that triggered them.
- Users can mark them as `completed`.
- **Rule**: Never overwrite a lesson. Generate new ones and append to history.
