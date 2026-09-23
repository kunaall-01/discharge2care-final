"""
Optional LLM path for salt-equivalence checks.

The endpoint prefers an LLM when a provider API key is configured, because a
model can reason about brand names it has never seen. It is entirely optional:
every failure mode here (no key, timeout, HTTP error, malformed JSON, unknown
verdict) returns None so the router falls back to the deterministic engine in
salt_engine.py. Nothing in this module is allowed to raise.
"""

import json
import logging
import os
from typing import Dict, Optional, Tuple

import httpx
from pydantic import ValidationError

from .schemas import (
    VERDICT_CODES,
    ChemistVerifyRequest,
    SaltVerificationResult,
    is_safe_verdict,
)

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT_SECONDS = 12.0
DEFAULT_MODELS = {
    "openai": "gpt-4o-mini",
    "anthropic": "claude-3-5-haiku-latest",
    "gemini": "gemini-1.5-flash",
}
KEY_ENVS = {
    "openai": ("OPENAI_API_KEY",),
    "anthropic": ("ANTHROPIC_API_KEY",),
    "gemini": ("GEMINI_API_KEY", "GOOGLE_API_KEY"),
}
PROVIDER_ORDER = ("openai", "anthropic", "gemini")

SYSTEM_PROMPT = (
    "You are a careful clinical pharmacist assistant for an Indian discharge-care app. "
    "You compare the medicine a doctor prescribed with the medicine the chemist actually has, "
    "and decide whether the patient can safely take it. Be conservative: when unsure, do not "
    "clear the medicine."
)


def _prompt(request: ChemistVerifyRequest) -> str:
    def side(label: str, medicine) -> str:
        return (
            f"{label}:\n"
            f"- name: {medicine.name}\n"
            f"- strength: {medicine.strength or 'not stated'}\n"
            f"- form: {medicine.form or 'not stated'}\n"
            f"- manufacturer: {medicine.manufacturer or 'not stated'}\n"
        )

    return (
        side("Prescribed medicine", request.prescribed_medicine)
        + "\n"
        + side("Available medicine at the chemist", request.available_medicine)
        + "\n"
        + "Compare the salt composition (active ingredient) and the strength.\n"
        + f"verdict_code must be exactly one of: {', '.join(VERDICT_CODES)}.\n"
        + "- EXACT_BRAND_MATCH: same brand/product and same strength.\n"
        + "- SAFE_GENERIC_SUBSTITUTE: same salt, same strength, different brand.\n"
        + "- DOSAGE_MISMATCH: same salt but a different strength.\n"
        + "- UNSAFE_INCOMPATIBLE: different salt, or you cannot identify either medicine.\n"
        + "is_safe_to_use is true only for EXACT_BRAND_MATCH and SAFE_GENERIC_SUBSTITUTE.\n"
        + "chemist_summary is 1-2 sentences for the chemist/patient explaining the comparison.\n"
        + "patient_guidance is one plain-language sentence telling the patient what to do.\n"
        + "Respond with ONLY a JSON object, no markdown fences, using exactly these keys:\n"
        + json.dumps(
            {
                "verdict_code": "SAFE_GENERIC_SUBSTITUTE",
                "is_safe_to_use": True,
                "salt_analysis": {
                    "prescribed_salt": "Paracetamol",
                    "available_salt": "Paracetamol",
                    "salts_match": True,
                },
                "strength_analysis": {
                    "prescribed_strength": "500 mg",
                    "available_strength": "500 mg",
                    "strengths_match": True,
                },
                "chemist_summary": "...",
                "patient_guidance": "...",
            },
            indent=2,
        )
    )


def provider_config() -> Optional[Tuple[str, str]]:
    """Pick a provider from the environment, or None when no key is configured."""
    forced = os.environ.get("LLM_PROVIDER", "").strip().lower()
    candidates = (forced,) if forced in KEY_ENVS else PROVIDER_ORDER

    for provider in candidates:
        for env_name in KEY_ENVS[provider]:
            if os.environ.get(env_name, "").strip():
                return provider, os.environ[env_name].strip()
    return None


def _timeout() -> float:
    try:
        return float(os.environ.get("LLM_TIMEOUT_SECONDS", DEFAULT_TIMEOUT_SECONDS))
    except ValueError:
        return DEFAULT_TIMEOUT_SECONDS


async def _call_openai(client: httpx.AsyncClient, key: str, prompt: str) -> str:
    model = os.environ.get("LLM_MODEL", "").strip() or DEFAULT_MODELS["openai"]
    response = await client.post(
        "https://api.openai.com/v1/chat/completions",
        headers={"Authorization": f"Bearer {key}"},
        json={
            "model": model,
            "temperature": 0,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
        },
    )
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"]


async def _call_anthropic(client: httpx.AsyncClient, key: str, prompt: str) -> str:
    model = os.environ.get("LLM_MODEL", "").strip() or DEFAULT_MODELS["anthropic"]
    response = await client.post(
        "https://api.anthropic.com/v1/messages",
        headers={"x-api-key": key, "anthropic-version": "2023-06-01"},
        json={
            "model": model,
            "max_tokens": 1024,
            "temperature": 0,
            "system": SYSTEM_PROMPT,
            "messages": [{"role": "user", "content": prompt}],
        },
    )
    response.raise_for_status()
    return response.json()["content"][0]["text"]


async def _call_gemini(client: httpx.AsyncClient, key: str, prompt: str) -> str:
    model = os.environ.get("LLM_MODEL", "").strip() or DEFAULT_MODELS["gemini"]
    response = await client.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
        params={"key": key},
        json={
            "contents": [{"parts": [{"text": prompt}]}],
            "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
            "generationConfig": {"temperature": 0, "responseMimeType": "application/json"},
        },
    )
    response.raise_for_status()
    parts = response.json()["candidates"][0]["content"]["parts"]
    return "".join(part.get("text", "") for part in parts)


_CALLERS = {"openai": _call_openai, "anthropic": _call_anthropic, "gemini": _call_gemini}


def _extract_json(text: str) -> Dict:
    """Models sometimes wrap JSON in prose or fences — take the outermost object."""
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end <= start:
        raise ValueError("no JSON object in model response")
    return json.loads(text[start:end + 1])


def _parse(payload: Dict) -> Optional[SaltVerificationResult]:
    verdict = str(payload.get("verdict_code", "")).strip().upper()
    if verdict not in VERDICT_CODES:
        logger.warning("LLM returned unknown verdict_code %r", payload.get("verdict_code"))
        return None

    payload["verdict_code"] = verdict
    # Recompute rather than trust the model, so the safety flag can never
    # contradict the verdict.
    payload["is_safe_to_use"] = is_safe_verdict(verdict)
    payload["source"] = "llm"

    try:
        return SaltVerificationResult(**payload)
    except ValidationError as error:
        logger.warning("LLM response failed schema validation: %s", error)
        return None


async def ask_llm(request: ChemistVerifyRequest) -> Optional[SaltVerificationResult]:
    config = provider_config()
    if not config:
        return None

    provider, key = config
    try:
        async with httpx.AsyncClient(timeout=_timeout()) as client:
            raw = await _CALLERS[provider](client, key, _prompt(request))
        return _parse(_extract_json(raw))
    except httpx.TimeoutException:
        logger.warning("LLM provider %s timed out; falling back to the local engine", provider)
    except httpx.HTTPError as error:
        logger.warning("LLM provider %s request failed: %s", provider, error)
    except (ValueError, KeyError, IndexError, TypeError) as error:
        logger.warning("Unparseable LLM response from %s: %s", provider, error)
    return None
