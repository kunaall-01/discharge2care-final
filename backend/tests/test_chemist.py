"""
Chemist salt-equivalence tests.

The engine is pure logic over the local drug database and the router is
stateless, so these need no MongoDB and no network. The LLM path is exercised
through its provider/parsing helpers and a stubbed httpx client, so no API key
is required and no real call is made.
"""

import asyncio
import json
import sys
import types

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from chemist import llm
from chemist.router import chemist_router
from chemist.salt_engine import evaluate, parse_strength_mg, resolve, salts_equivalent
from chemist.schemas import (
    VERDICT_DOSAGE_MISMATCH,
    VERDICT_EXACT_BRAND_MATCH,
    VERDICT_SAFE_GENERIC_SUBSTITUTE,
    VERDICT_UNSAFE_INCOMPATIBLE,
    ChemistVerifyRequest,
    MedicineInput,
)


def med(spec, **extra):
    """'Crocin|500mg' -> {"name": "Crocin", "strength": "500mg", **extra}"""
    name, _, strength = spec.partition("|")
    return {"name": name, "strength": strength, **extra}


def request(prescribed, available):
    return ChemistVerifyRequest(
        prescribed_medicine=MedicineInput(**prescribed),
        available_medicine=MedicineInput(**available),
    )


def check(prescribed, available):
    return evaluate(request(med(prescribed), med(available)))


LLM_KEY_ENVS = ("OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GEMINI_API_KEY", "GOOGLE_API_KEY", "LLM_PROVIDER")


@pytest.fixture(autouse=True)
def no_llm_keys(monkeypatch):
    """Never let a developer's real API key turn these into live LLM calls."""
    for name in LLM_KEY_ENVS:
        monkeypatch.delenv(name, raising=False)


@pytest.fixture
def client():
    app = FastAPI()
    app.include_router(chemist_router)
    return TestClient(app)


# --- strength + salt normalization -----------------------------------------

@pytest.mark.parametrize("text,expected", [
    ("500mg", 500.0),
    ("500 mg", 500.0),
    ("0.5g", 500.0),
    ("250mcg", 0.25),
    ("Dolo 650", 650.0),
    ("", None),
    ("10 ml", None),
])
def test_parse_strength_mg(text, expected):
    assert parse_strength_mg(text) == expected


@pytest.mark.parametrize("a,b,expected", [
    ("Paracetamol", "paracetamol", True),
    ("Paracetamol + Caffeine", "Caffeine+Paracetamol", True),
    ("Paracetamol", "Ibuprofen", False),
    ("", "Paracetamol", False),
])
def test_salts_equivalent(a, b, expected):
    assert salts_equivalent(a, b) is expected


def test_resolve_brand_gets_salt_and_reference_strength():
    resolved = resolve(MedicineInput(name="Crocin"))
    assert resolved["salt"] == "Paracetamol"
    assert resolved["strength_mg"] == 500.0
    assert resolved["in_database"] is True


def test_resolve_unknown_name_keeps_entered_salt():
    resolved = resolve(MedicineInput(name="Cefixime 200mg"))
    assert resolved["salt"] == "Cefixime"
    assert resolved["strength_mg"] == 200.0
    assert resolved["in_database"] is False


def test_resolve_brand_with_a_strength_suffix_still_finds_the_salt():
    resolved = resolve(MedicineInput(name="Calpol 500mg"))
    assert resolved["salt"] == "Paracetamol"
    assert resolved["strength_mg"] == 500.0


def test_explicit_strength_wins_over_brand_implied_strength():
    # "Dolo 650" implies 650mg; a printed 500mg on the strip is authoritative.
    assert resolve(MedicineInput(name="Dolo 650", strength="500mg"))["strength_mg"] == 500.0


# --- verdicts ---------------------------------------------------------------

def test_same_brand_and_strength_is_exact_match():
    result = check("Crocin|500mg", "Crocin|500mg")
    assert result.verdict_code == VERDICT_EXACT_BRAND_MATCH
    assert result.is_safe_to_use is True


def test_same_salt_and_strength_is_safe_generic():
    result = check("Crocin|500mg", "Calpol|500mg")
    assert result.verdict_code == VERDICT_SAFE_GENERIC_SUBSTITUTE
    assert result.is_safe_to_use is True
    assert result.salt_analysis.salts_match is True
    assert result.strength_analysis.strengths_match is True


def test_salt_name_vs_brand_is_safe_generic():
    assert check("Paracetamol|500mg", "Dolo 650|500mg").verdict_code == VERDICT_SAFE_GENERIC_SUBSTITUTE


def test_units_are_normalized_before_comparing():
    assert check("Metformin|0.5g", "Glycomet|500mg").verdict_code == VERDICT_SAFE_GENERIC_SUBSTITUTE


def test_same_salt_different_strength_is_dosage_mismatch():
    result = check("Paracetamol|500mg", "Dolo 650")
    assert result.verdict_code == VERDICT_DOSAGE_MISMATCH
    assert result.is_safe_to_use is False
    assert result.strength_analysis.strengths_match is False
    assert "650 mg" in result.chemist_summary


def test_different_salt_is_unsafe():
    result = check("Paracetamol|500mg", "Ibuprofen|400mg")
    assert result.verdict_code == VERDICT_UNSAFE_INCOMPATIBLE
    assert result.is_safe_to_use is False
    assert result.salt_analysis.salts_match is False
    assert "Do not take" in result.patient_guidance


def test_unknown_medicines_are_not_cleared():
    result = check("Zylopram|20mg", "Qvantum|40mg")
    assert result.verdict_code == VERDICT_UNSAFE_INCOMPATIBLE
    assert result.is_safe_to_use is False


def test_identical_unknown_medicine_is_an_exact_match_and_flags_the_missing_reference():
    result = check("Cefixime|200mg", "Cefixime|200mg")
    assert result.verdict_code == VERDICT_EXACT_BRAND_MATCH
    assert "reference database" in result.chemist_summary


def test_form_difference_is_reported_but_does_not_change_the_verdict():
    result = evaluate(request(
        med("Paracetamol|500mg", form="tablet"),
        med("Calpol|500mg", form="syrup"),
    ))
    assert result.verdict_code == VERDICT_SAFE_GENERIC_SUBSTITUTE
    assert "dosage form differs" in result.chemist_summary


def test_every_verdict_carries_summary_and_guidance():
    for prescribed, available in [
        ("Crocin|500mg", "Crocin|500mg"),
        ("Crocin|500mg", "Calpol|500mg"),
        ("Paracetamol|500mg", "Dolo 650"),
        ("Paracetamol|500mg", "Ibuprofen|400mg"),
    ]:
        result = check(prescribed, available)
        assert result.chemist_summary.strip()
        assert result.patient_guidance.strip()
        assert result.source == "local"


# --- router -----------------------------------------------------------------

def test_verify_route_is_registered(client):
    paths = client.get("/openapi.json").json()["paths"]
    assert "/chemist/verify" in paths


def test_verify_endpoint_uses_local_engine_without_a_key(client):
    response = client.post("/chemist/verify", json={
        "prescribed_medicine": {"name": "Pantocid", "strength": "40mg"},
        "available_medicine": {"name": "Pantoprazole", "strength": "40 mg"},
    })
    assert response.status_code == 200
    body = response.json()
    assert body["verdict_code"] == VERDICT_SAFE_GENERIC_SUBSTITUTE
    assert body["is_safe_to_use"] is True
    assert body["source"] == "local"
    assert body["salt_analysis"] == {
        "prescribed_salt": "Pantoprazole",
        "available_salt": "Pantoprazole",
        "salts_match": True,
    }
    assert body["strength_analysis"]["strengths_match"] is True


def test_verify_endpoint_falls_back_when_the_llm_is_unavailable(client, monkeypatch):
    async def no_llm(payload):
        return None

    monkeypatch.setattr("chemist.router.ask_llm", no_llm)
    response = client.post("/chemist/verify", json={
        "prescribed_medicine": {"name": "Paracetamol", "strength": "500mg"},
        "available_medicine": {"name": "Brufen", "strength": "400mg"},
    })
    assert response.status_code == 200
    assert response.json()["verdict_code"] == VERDICT_UNSAFE_INCOMPATIBLE
    assert response.json()["source"] == "local"


def test_verify_endpoint_passes_the_llm_answer_through(client, monkeypatch):
    async def fake_llm(payload):
        return llm._parse({
            **LLM_PAYLOAD,
            "verdict_code": "safe_generic_substitute",
            "is_safe_to_use": False,  # contradicts the verdict — must be corrected
            "unexpected_extra_key": "ignored",
        })

    monkeypatch.setattr("chemist.router.ask_llm", fake_llm)
    response = client.post("/chemist/verify", json={
        "prescribed_medicine": {"name": "Azithral", "strength": "500mg"},
        "available_medicine": {"name": "Azee", "strength": "500mg"},
    })
    body = response.json()
    assert response.status_code == 200
    assert body["source"] == "llm"
    assert body["verdict_code"] == VERDICT_SAFE_GENERIC_SUBSTITUTE
    assert body["is_safe_to_use"] is True


def test_verify_endpoint_accepts_bare_medicine_names(client):
    response = client.post("/chemist/verify", json={
        "prescribed_medicine": "Paracetamol 500mg",
        "available_medicine": "Calpol 500mg",
    })
    assert response.status_code == 200
    body = response.json()
    assert body["verdict_code"] == VERDICT_SAFE_GENERIC_SUBSTITUTE
    assert body["salt_analysis"]["salts_match"] is True
    assert body["strength_analysis"]["strengths_match"] is True


def test_verify_endpoint_rejects_an_empty_medicine_name(client):
    response = client.post("/chemist/verify", json={
        "prescribed_medicine": {"name": ""},
        "available_medicine": {"name": "Crocin", "strength": "500mg"},
    })
    assert response.status_code == 422


# --- llm helpers ------------------------------------------------------------

LLM_PAYLOAD = {
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
    "chemist_summary": "Same salt and strength, different brand.",
    "patient_guidance": "Safe to take as prescribed.",
}


def test_provider_config_is_none_without_keys():
    assert llm.provider_config() is None


def test_provider_config_prefers_the_forced_provider(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-openai")
    monkeypatch.setenv("GEMINI_API_KEY", "gemini-key")
    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    assert llm.provider_config() == ("gemini", "gemini-key")


def test_extract_json_tolerates_fences_and_prose():
    text = 'Sure! Here you go:\n```json\n{"verdict_code": "DOSAGE_MISMATCH"}\n```\nHope that helps.'
    assert llm._extract_json(text) == {"verdict_code": "DOSAGE_MISMATCH"}


def test_extract_json_rejects_a_response_with_no_object():
    with pytest.raises(ValueError):
        llm._extract_json("I cannot answer that.")


def test_parse_rejects_an_unknown_verdict():
    assert llm._parse({**LLM_PAYLOAD, "verdict_code": "MAYBE_SAFE"}) is None


def test_parse_rejects_a_payload_missing_the_analyses():
    assert llm._parse({"verdict_code": "DOSAGE_MISMATCH"}) is None


def test_prompt_names_every_verdict_and_the_requested_keys():
    prompt = llm._prompt(request(med("Crocin|500mg"), med("Calpol|500mg")))
    for code in (
        VERDICT_EXACT_BRAND_MATCH,
        VERDICT_SAFE_GENERIC_SUBSTITUTE,
        VERDICT_DOSAGE_MISMATCH,
        VERDICT_UNSAFE_INCOMPATIBLE,
    ):
        assert code in prompt
    for key in ("verdict_code", "salt_analysis", "strength_analysis", "chemist_summary", "patient_guidance"):
        assert key in prompt
    assert "Crocin" in prompt and "Calpol" in prompt


class _Responder:
    """Stands in for httpx.AsyncClient and records what was sent."""

    def __init__(self, payload=None, error=None):
        self.payload = payload
        self.error = error
        self.calls = []

    def install(self, monkeypatch):
        responder = self

        class _Response:
            def raise_for_status(self):
                pass

            def json(self):
                return responder.payload

        class _Client:
            def __init__(self, *args, **kwargs):
                pass

            async def __aenter__(self):
                return self

            async def __aexit__(self, *exc):
                return False

            async def post(self, url, **kwargs):
                responder.calls.append((url, kwargs))
                if responder.error:
                    raise responder.error
                return _Response()

        monkeypatch.setattr(llm.httpx, "AsyncClient", _Client)
        return self


@pytest.mark.parametrize("provider,key_env,host", [
    ("openai", "OPENAI_API_KEY", "api.openai.com"),
    ("anthropic", "ANTHROPIC_API_KEY", "api.anthropic.com"),
    ("gemini", "GEMINI_API_KEY", "generativelanguage.googleapis.com"),
])
def test_ask_llm_parses_each_provider_shape(monkeypatch, provider, key_env, host):
    payloads = {
        "openai": {"choices": [{"message": {"content": json.dumps(LLM_PAYLOAD)}}]},
        "anthropic": {"content": [{"text": json.dumps(LLM_PAYLOAD)}]},
        "gemini": {"candidates": [{"content": {"parts": [{"text": json.dumps(LLM_PAYLOAD)}]}}]},
    }
    responder = _Responder(payload=payloads[provider]).install(monkeypatch)
    monkeypatch.setenv(key_env, "test-key")
    monkeypatch.setenv("LLM_PROVIDER", provider)

    result = asyncio.run(llm.ask_llm(request(med("Crocin|500mg"), med("Calpol|500mg"))))

    assert result is not None
    assert result.verdict_code == VERDICT_SAFE_GENERIC_SUBSTITUTE
    assert result.is_safe_to_use is True
    assert result.source == "llm"

    url, kwargs = responder.calls[0]
    assert host in url
    assert "test-key" in json.dumps(kwargs, default=str)


@pytest.mark.parametrize("error", [
    llm.httpx.TimeoutException("timed out"),
    llm.httpx.ConnectError("refused"),
])
def test_ask_llm_returns_none_when_the_call_fails(monkeypatch, error):
    _Responder(error=error).install(monkeypatch)
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.delenv("LLM_PROVIDER", raising=False)

    assert asyncio.run(llm.ask_llm(request(med("Crocin|500mg"), med("Calpol|500mg")))) is None


def test_ask_llm_returns_none_on_garbage_json(monkeypatch):
    _Responder(payload={"choices": [{"message": {"content": "not json"}}]}).install(monkeypatch)
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.delenv("LLM_PROVIDER", raising=False)

    assert asyncio.run(llm.ask_llm(request(med("Crocin|500mg"), med("Calpol|500mg")))) is None


# --- wrapper-photo route ----------------------------------------------------

# OCR needs OpenCV + the tesseract binary; the photo route imports it lazily,
# so a stub module in sys.modules is enough to keep these tests hermetic.
_ocr_stub = types.ModuleType("pill_verification.ocr_service")
_ocr_stub.extract_text_from_image = lambda image_bytes: "DOLO 650 PARACETAMOL TABLETS IP 650 MG"
sys.modules["pill_verification.ocr_service"] = _ocr_stub


def set_ocr(text=None, error=None):
    def fake(image_bytes):
        if error:
            raise error
        return text
    _ocr_stub.extract_text_from_image = fake


def photo(client, prescribed_name="Paracetamol", prescribed_strength="500mg", body=b"img"):
    return client.post(
        "/chemist/verify-photo",
        files={"file": ("wrapper.jpg", body, "image/jpeg")},
        data={"prescribed_name": prescribed_name, "prescribed_strength": prescribed_strength},
    )


def test_photo_reads_the_strength_off_the_wrapper(client):
    set_ocr("DOLO 650 PARACETAMOL TABLETS IP 650 MG")
    body = photo(client).json()
    assert body["identified"] is True
    assert body["verdict_code"] == VERDICT_DOSAGE_MISMATCH
    assert body["strength_analysis"]["available_strength"] == "650 mg"
    assert body["salt_analysis"]["salts_match"] is True
    assert body["ocr_extracted_text"]


def test_photo_of_an_equivalent_brand_is_safe(client):
    set_ocr("CROCIN PARACETAMOL 500 MG STRIP")
    body = photo(client, prescribed_name="Crocin").json()
    assert body["verdict_code"] == VERDICT_SAFE_GENERIC_SUBSTITUTE
    assert body["is_safe_to_use"] is True
    assert body["confidence"]


def test_photo_of_a_different_salt_is_unsafe(client):
    set_ocr("BRUFEN IBUPROFEN TABLETS 400 MG")
    body = photo(client).json()
    assert body["verdict_code"] == VERDICT_UNSAFE_INCOMPATIBLE
    assert body["is_safe_to_use"] is False


def test_unreadable_photo_is_not_cleared(client):
    set_ocr("")
    body = photo(client).json()
    assert body["identified"] is False
    assert body["is_safe_to_use"] is False
    assert body["warning"]
    assert "could not read" in body["patient_guidance"].lower()


def test_ocr_crash_degrades_to_unreadable(client):
    set_ocr(error=RuntimeError("tesseract not installed"))
    body = photo(client).json()
    assert body["identified"] is False
    assert body["is_safe_to_use"] is False


def test_photo_route_rejects_bad_uploads(client):
    set_ocr("DOLO 650")
    assert photo(client, body=b"").status_code == 400

    response = client.post(
        "/chemist/verify-photo",
        files={"file": ("notes.txt", b"hello", "text/plain")},
        data={"prescribed_name": "Paracetamol"},
    )
    assert response.status_code == 400

