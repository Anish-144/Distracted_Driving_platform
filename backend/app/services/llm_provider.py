"""
LLM Provider Abstraction Layer
Supports: Gemini Flash → GPT-4o-mini → DeepSeek → Hardcoded Fallback
All providers use direct HTTP (httpx) — no extra SDK dependencies.
"""

import asyncio
import hashlib
import logging
from dataclasses import dataclass
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


@dataclass
class LLMResponse:
    text: str
    provider: str
    tokens_used: int = 0
    latency_ms: float = 0.0


# ── Fallback pool: safe, short, behaviorally relevant ─────────────────────────
_FALLBACKS = {
    "passenger": [
        "Just check it quickly, no one will know.",
        "Come on, it could be important.",
        "It's probably urgent, just a second.",
    ],
    "instructor": [
        "Good call. Eyes on the road.",
        "That was risky. Stay focused.",
        "Safe choice. Keep that discipline.",
    ],
    "authority": [
        "Device use while driving is a criminal offence.",
        "That decision could cost you your licence.",
        "One distraction. One accident. Zero excuses.",
    ],
}
_fallback_idx: dict[str, int] = {"passenger": 0, "instructor": 0, "authority": 0}


def _get_fallback(agent_type: str) -> str:
    pool = _FALLBACKS.get(agent_type, _FALLBACKS["instructor"])
    idx = _fallback_idx.get(agent_type, 0)
    text = pool[idx % len(pool)]
    _fallback_idx[agent_type] = (idx + 1) % len(pool)
    return text


# ── Main Provider ─────────────────────────────────────────────────────────────

class LLMProvider:
    """
    Tries each provider in order with a hard per-provider timeout.
    Returns the first successful response.
    If all fail, returns a rotating hardcoded fallback.
    """

    TIMEOUT = 6.0  # seconds per provider

    async def complete(
        self,
        prompt: str,
        agent_type: str = "instructor",
        max_tokens: int = 60,
        temperature: float = 0.85,
    ) -> LLMResponse:
        import time

        providers = []
        if settings.GEMINI_API_KEY:
            providers.append(self._call_gemini)
        if settings.OPENAI_API_KEY:
            providers.append(self._call_openai)
        if settings.DEEPSEEK_API_KEY:
            providers.append(self._call_deepseek)

        for provider_fn in providers:
            t0 = time.monotonic()
            try:
                result = await asyncio.wait_for(
                    provider_fn(prompt, max_tokens, temperature),
                    timeout=self.TIMEOUT,
                )
                result.latency_ms = (time.monotonic() - t0) * 1000
                logger.info(
                    "LLM[%s] %.0fms: %s",
                    result.provider,
                    result.latency_ms,
                    result.text[:60],
                )
                return result
            except asyncio.TimeoutError:
                logger.warning("LLM provider %s timed out", provider_fn.__name__)
            except Exception as exc:
                logger.warning("LLM provider %s error: %s", provider_fn.__name__, exc)

        fallback_text = _get_fallback(agent_type)
        logger.warning("All LLM providers failed. Using hardcoded fallback.")
        return LLMResponse(text=fallback_text, provider="fallback")

    # ── Gemini Flash ──────────────────────────────────────────────────────────

    async def _call_gemini(
        self, prompt: str, max_tokens: int, temperature: float
    ) -> LLMResponse:
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"gemini-2.0-flash-lite:generateContent?key={settings.GEMINI_API_KEY}"
        )
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "maxOutputTokens": max_tokens,
                "temperature": temperature,
                "stopSequences": ["\n\n", "\n"],
            },
        }
        async with httpx.AsyncClient(timeout=self.TIMEOUT) as client:
            r = await client.post(url, json=payload)
            r.raise_for_status()
            data = r.json()

        text = (
            data["candidates"][0]["content"]["parts"][0]["text"]
            .strip()
            .strip('"\'')
            .strip()
        )
        # Enforce single-sentence hard cut
        text = text.split(".")[0].strip() + "." if "." in text else text
        return LLMResponse(text=text, provider="gemini-2.0-flash-lite")

    # ── GPT-4o-mini ───────────────────────────────────────────────────────────

    async def _call_openai(
        self, prompt: str, max_tokens: int, temperature: float
    ) -> LLMResponse:
        async with httpx.AsyncClient(timeout=self.TIMEOUT) as client:
            r = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
                json={
                    "model": "gpt-4o-mini",
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                },
            )
            r.raise_for_status()
            data = r.json()

        text = data["choices"][0]["message"]["content"].strip().strip('"\'').strip()
        tokens = data["usage"]["total_tokens"]
        return LLMResponse(text=text, provider="gpt-4o-mini", tokens_used=tokens)

    # ── DeepSeek ──────────────────────────────────────────────────────────────

    async def _call_deepseek(
        self, prompt: str, max_tokens: int, temperature: float
    ) -> LLMResponse:
        async with httpx.AsyncClient(timeout=self.TIMEOUT) as client:
            r = await client.post(
                "https://api.deepseek.com/chat/completions",
                headers={"Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}"},
                json={
                    "model": "deepseek-chat",
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                },
            )
            r.raise_for_status()
            data = r.json()

        text = data["choices"][0]["message"]["content"].strip().strip('"\'').strip()
        return LLMResponse(text=text, provider="deepseek-chat")


# ── Singleton ─────────────────────────────────────────────────────────────────
llm_provider = LLMProvider()
