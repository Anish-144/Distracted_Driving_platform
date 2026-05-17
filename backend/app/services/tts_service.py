"""
ElevenLabs TTS Service.

Converts short AI dialogue text into audio bytes.
Uses eleven_flash_v2_5 (lowest latency model).
Caches in-memory by content hash to avoid redundant API calls.
"""

import hashlib
import logging
from functools import lru_cache
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# ── Voice profile registry ────────────────────────────────────────────────────
# Configure your preferred ElevenLabs voice IDs in .env
VOICE_PROFILES = {
    "passenger": {
        "voice_id": None,      # Overridden by settings.ELEVENLABS_PASSENGER_VOICE_ID
        "stability": 0.40,     # More expressive, casual
        "similarity_boost": 0.70,
        "style": 0.30,
        "use_speaker_boost": True,
    },
    "instructor": {
        "voice_id": None,      # Overridden by settings.ELEVENLABS_INSTRUCTOR_VOICE_ID
        "stability": 0.65,     # Calm, steady
        "similarity_boost": 0.80,
        "style": 0.10,
        "use_speaker_boost": False,
    },
    "authority": {
        "voice_id": None,      # Overridden by settings.ELEVENLABS_AUTHORITY_VOICE_ID
        "stability": 0.75,     # Authoritative, controlled
        "similarity_boost": 0.85,
        "style": 0.05,
        "use_speaker_boost": False,
    },
}

# ── In-memory audio cache (text_hash → bytes) ─────────────────────────────────
_audio_cache: dict[str, bytes] = {}
_MAX_CACHE_SIZE = 200  # max cached audio clips


def _cache_key(text: str, agent_type: str) -> str:
    return hashlib.sha256(f"{agent_type}:{text}".encode()).hexdigest()[:16]


class TTSService:

    ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1/text-to-speech"
    MODEL_ID = "eleven_flash_v2_5"  # Lowest latency ElevenLabs model

    def __init__(self) -> None:
        # Resolve voice IDs from settings at runtime
        VOICE_PROFILES["passenger"]["voice_id"] = (
            settings.ELEVENLABS_PASSENGER_VOICE_ID or "EXAVITQu4vr4xnSDxMaL"
        )
        VOICE_PROFILES["instructor"]["voice_id"] = (
            settings.ELEVENLABS_INSTRUCTOR_VOICE_ID or "onwK4e9ZLuTAKqWW03F9"
        )
        VOICE_PROFILES["authority"]["voice_id"] = (
            settings.ELEVENLABS_AUTHORITY_VOICE_ID or "pNInz6obpgDQGcFmaJgB"
        )

    async def synthesize(
        self,
        text: str,
        agent_type: str = "instructor",
    ) -> Optional[bytes]:
        """
        Convert text to audio bytes (MP3).
        Returns None if ElevenLabs is not configured or call fails.
        """
        if not settings.ELEVENLABS_API_KEY:
            logger.debug("ElevenLabs not configured — skipping TTS")
            return None

        # Check cache first
        key = _cache_key(text, agent_type)
        if key in _audio_cache:
            logger.debug("TTS cache hit: %s", key)
            return _audio_cache[key]

        profile = VOICE_PROFILES.get(agent_type, VOICE_PROFILES["instructor"])
        voice_id = profile["voice_id"]
        url = f"{self.ELEVENLABS_API_BASE}/{voice_id}"

        payload = {
            "text": text,
            "model_id": self.MODEL_ID,
            "voice_settings": {
                "stability": profile["stability"],
                "similarity_boost": profile["similarity_boost"],
                "style": profile["style"],
                "use_speaker_boost": profile["use_speaker_boost"],
            },
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.post(
                    url,
                    json=payload,
                    headers={
                        "xi-api-key": settings.ELEVENLABS_API_KEY,
                        "Accept": "audio/mpeg",
                        "Content-Type": "application/json",
                    },
                )
                response.raise_for_status()
                audio_bytes = response.content

            # Store in cache (evict oldest if full)
            if len(_audio_cache) >= _MAX_CACHE_SIZE:
                oldest_key = next(iter(_audio_cache))
                del _audio_cache[oldest_key]
            _audio_cache[key] = audio_bytes

            logger.info(
                "TTS[%s] synthesized %d bytes for: %s",
                agent_type,
                len(audio_bytes),
                text[:50],
            )
            return audio_bytes

        except httpx.HTTPStatusError as e:
            logger.error("ElevenLabs HTTP error %d: %s", e.response.status_code, e.response.text[:200])
            return None
        except Exception as e:
            logger.error("ElevenLabs TTS error: %s", e)
            return None

    def is_available(self) -> bool:
        return bool(settings.ELEVENLABS_API_KEY)


# ── Singleton ─────────────────────────────────────────────────────────────────
tts_service = TTSService()
