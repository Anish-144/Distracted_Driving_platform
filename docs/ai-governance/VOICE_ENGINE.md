# VOICE_ENGINE.md — ElevenLabs Voice Orchestration Layer

---

## Overview

The Voice Engine transforms SafeDrive AI from a text-based behavioral platform into an **immersive adaptive coaching platform** using ElevenLabs voice synthesis. It sits as a distinct layer above the existing TTS service, adding long-form emotionally adaptive narration for three use-cases:

1. **Post-session coaching** — Delivered immediately after simulation completes
2. **Report narration** — Executive summary of the cognitive behavioral report
3. **Lesson narration** — AI-generated lesson content read aloud

## Architecture — Services

```
voice_orchestrator.py       ← Central intelligence layer
  ├── coaching_prompt_builder.py  ← Emotionally adaptive narration prompts
  └── tts_service.py              ← Low-level ElevenLabs HTTP calls (existing, extended)
```

### voice_orchestrator.py

- **Three public methods**: `generate_post_session_coaching()`, `generate_report_narration()`, `generate_lesson_narration()`
- Uses the existing `llm_provider` cascade (Gemini → GPT → DeepSeek → fallback) to generate narration text
- Passes text to `tts_service.synthesize_with_model()` using `eleven_multilingual_v2` (higher quality for narration vs `eleven_flash_v2_5` for simulation real-time audio)
- **Never raises** — all failures degrade gracefully to hardcoded fallback content
- Returns `VoiceNarration` dataclass with `text`, `audio_b64`, `provider`, `available`

### coaching_prompt_builder.py

- Three builder functions: `build_post_session_prompt()`, `build_report_narration_prompt()`, `build_lesson_narration_prompt()`
- All prompts inject driver personality type and behavioral context
- Tone adapts per `driver_type`: impulsive (firm), anxious (grounding), overconfident (analytical), distractible (calm corrective)
- Post-session prompts rotate structural variants via session_id hash to prevent identical narration across sessions

### tts_service.py (extended)

- Added `synthesize_with_model()` method — allows overriding the ElevenLabs model
- Simulation uses `eleven_flash_v2_5` (lowest latency, real-time)
- Narration uses `eleven_multilingual_v2` (higher quality, acceptable latency for post-session)
- Both methods use the same in-memory LRU cache (200 slot limit)

## Architecture — Routes

```
POST /api/voice/post-session  ← Adaptive coaching after simulation
POST /api/voice/report        ← Report executive summary narration
POST /api/voice/lesson        ← Lesson content narration
```

All routes: require JWT auth, pull `BehavioralState` server-side, return `{ text, audio_b64, provider, available }`.

## Architecture — Frontend

```
src/api/voice.ts                        ← API client (fetchPostSessionVoice, fetchReportVoice, fetchLessonVoice)
src/components/voice/
  ├── VoicePlayer.tsx                   ← Core playback primitive (play/pause/replay/progress)
  ├── CoachingAudioCard.tsx             ← Context-aware card wrapper (mode-specific styling)
  └── SimulationVoiceOverlay.tsx        ← Floating badge during active simulation audio
```

### Integration Points

| Location | Component | Behaviour |
|---|---|---|
| `ScenarioContainer.tsx` (session complete) | `CoachingAudioCard mode="post_session"` | Auto-fetches + auto-plays on session end |
| `pages/dashboard/report.tsx` | `CoachingAudioCard mode="report"` | Tap-to-play narration of executive summary |
| `pages/simulation/index.tsx` | `SimulationVoiceOverlay` | Floating badge shows when AI audio plays during simulation |

## Critical Rules

1. **Never duplicate audio elements.** `AIDialogue.tsx` owns the simulation audio element. `SimulationVoiceOverlay` is read-only from Redux.
2. **Never use `eleven_flash_v2_5` for narration.** Simulation real-time = flash. Post-session narration = multilingual_v2.
3. **Fallback pools are substantive**, not placeholders. One pool entry per driver_type in `voice_orchestrator.py`.
4. **Prompt formatting safety**: All Python prompt strings that use `.format()` must double-escape literal JSON braces (`{{` not `{`). See REPORT_ENGINE.md.
5. **Audio Object URLs must be revoked** after use. `VoicePlayer.tsx` handles this on unmount and audioB64 change.
6. **All voice routes return HTTP 200** regardless of TTS availability — `available: false` signals silent fallback to text-only mode.

## Environment Variables (all pre-existing in .env)

```env
ELEVENLABS_API_KEY=...
ELEVENLABS_PASSENGER_VOICE_ID=EXAVITQu4vr4xnSDxMaL   # Bella — casual, expressive
ELEVENLABS_INSTRUCTOR_VOICE_ID=onwK4e9ZLuTAKqWW03F9   # Daniel — calm, steady
ELEVENLABS_AUTHORITY_VOICE_ID=pNInz6obpgDQGcFmaJgB    # Adam — authoritative
```

The narration orchestrator uses the **instructor** voice profile (`eleven_multilingual_v2` model) for all three narration types. The passenger and authority voices are reserved for real-time simulation coaching in `ai_coach.py`.
