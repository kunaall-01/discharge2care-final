"""
Router-level tests for the discharge endpoints.

Motor is stubbed with an in-memory fake before `server` is imported, so these
run without a MongoDB instance. The stub must be installed at import time —
server.py builds its Motor client at module level.
"""

import asyncio
import json
import sys
import types
from pathlib import Path

import pytest

STORE = {"discharge_drafts": [], "prescriptions": []}


def _matches(doc, query):
    return all(doc.get(key) == value for key, value in (query or {}).items())


class FakeCollection:
    def __init__(self, name):
        self.name = name

    async def insert_one(self, doc):
        STORE[self.name].append(dict(doc))

    async def find_one(self, query=None, projection=None):
        for doc in STORE[self.name]:
            if _matches(doc, query):
                if projection and projection.get("source_text") == 0:
                    return {k: v for k, v in doc.items() if k != "source_text"}
                return dict(doc)
        return None

    async def update_one(self, query, update, upsert=False):
        for doc in STORE[self.name]:
            if _matches(doc, query):
                doc.update(update.get("$set", {}))
                return
        if upsert:
            created = dict(query)
            created.update(update.get("$set", {}))
            STORE[self.name].append(created)


class FakeDB:
    def __getattr__(self, name):
        return FakeCollection(name)


class FakeClient:
    def __init__(self, *args, **kwargs):
        pass

    def __getitem__(self, name):
        return FakeDB()

    def close(self):
        pass


_motor = types.ModuleType("motor")
_motor_asyncio = types.ModuleType("motor.motor_asyncio")
_motor_asyncio.AsyncIOMotorClient = FakeClient
_motor.motor_asyncio = _motor_asyncio
sys.modules.setdefault("motor", _motor)
sys.modules.setdefault("motor.motor_asyncio", _motor_asyncio)

import os  # noqa: E402

os.environ.setdefault("MONGO_URL", "mongodb://fake")
os.environ.setdefault("DB_NAME", "d2c_test")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")

import pymupdf  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import server  # noqa: E402

DRUG_DB = json.loads(
    (Path(__file__).resolve().parents[1] / "pill_verification" / "data" / "drug_database.json").read_text()
)

SUMMARY_TEXT = """SUNRISE MULTI-SPECIALTY HOSPITAL
DISCHARGE SUMMARY
Patient Name: Ramesh Sharma
Discharge Date: 12/02/2026

MEDICATIONS
1. Tab. Pantoprazole 40 mg 1-0-0 for 10 days
2. Tab. Paracetamol 500 mg 1-0-1 for 5 days
3. Cap. Cefixime 200 mg 1-0-1 for 7 days

INVESTIGATIONS ADVISED
Complete Blood Count (CBC) on 17/02/2026 at Sunrise Diagnostics

APPOINTMENTS
Follow-up with Dr. Anand Verma on 24/02/2026 at 11:00 AM, OPD-3

DISCHARGE ADVICE
- Wound dressing daily at 6:00 PM - keep incision area dry
- Avoid lifting heavy weights for 2 weeks
"""


def make_pdf(text):
    document = pymupdf.open()
    page = document.new_page(width=595, height=1200)
    # insert_textbox (not insert_text) so newlines survive into the text layer
    overflow = page.insert_textbox(pymupdf.Rect(40, 40, 555, 1160), text, fontsize=9)
    assert overflow >= 0, f"test fixture text overflowed the page by {-overflow}pt"
    data = document.tobytes(garbage=0)
    document.close()
    return data


@pytest.fixture(autouse=True)
def reset_store():
    STORE["discharge_drafts"].clear()
    STORE["prescriptions"].clear()
    yield


@pytest.fixture
def client():
    with TestClient(server.app) as test_client:
        yield test_client


def upload(client, content, filename="summary.pdf", content_type="application/pdf", **form):
    return client.post(
        "/api/discharge/extract",
        files={"file": (filename, content, content_type)},
        data=form,
    )


def test_discharge_routes_are_registered():
    paths = {route.path for route in server.app.routes if getattr(route, "methods", None)}
    assert "/api/discharge/extract" in paths
    assert "/api/discharge/draft/{draft_id}" in paths
    assert "/api/discharge/{draft_id}/confirm" in paths


def test_extract_returns_structured_draft(client):
    response = upload(client, make_pdf(SUMMARY_TEXT), patient_id="pt-001")
    assert response.status_code == 200

    body = response.json()
    assert body["draft_id"]
    assert body["patient_id"] == "pt-001"
    assert [m["name"] for m in body["medicines"]] == ["Pantoprazole", "Paracetamol", "Cefixime"]
    assert body["medicines"][0]["startDate"] == "2026-02-12"
    assert body["tests"][0]["date"] == "2026-02-17"
    assert body["appointments"][0]["doctor"] == "Anand Verma"
    assert body["appointments"][0]["time"] == "11:00"
    assert len(body["careTasks"]) == 2
    assert all(m["confirmed"] is False for m in body["medicines"])


def test_extract_persists_a_draft(client):
    draft_id = upload(client, make_pdf(SUMMARY_TEXT)).json()["draft_id"]
    assert len(STORE["discharge_drafts"]) == 1
    assert STORE["discharge_drafts"][0]["draft_id"] == draft_id
    assert STORE["discharge_drafts"][0]["status"] == "draft"


def test_extract_rejects_unsupported_content_type(client):
    response = upload(client, b"hello", filename="notes.txt", content_type="text/plain")
    assert response.status_code == 400
    assert "Unsupported file type" in response.json()["detail"]


def test_extract_rejects_empty_upload(client):
    assert upload(client, b"").status_code == 400


def test_extract_rejects_oversized_upload(client):
    response = upload(client, make_pdf(SUMMARY_TEXT) + b"\0" * (10 * 1024 * 1024))
    assert response.status_code == 400
    assert "too large" in response.json()["detail"].lower()


def test_extract_reports_unreadable_document(client):
    # A page with no text layer falls through to OCR, which yields nothing.
    blank = pymupdf.open()
    blank.new_page()
    data = blank.tobytes(garbage=0)
    blank.close()

    response = upload(client, data)
    assert response.status_code in (400, 422)


def test_draft_round_trip_omits_source_text(client):
    draft_id = upload(client, make_pdf(SUMMARY_TEXT)).json()["draft_id"]

    response = client.get(f"/api/discharge/draft/{draft_id}")
    assert response.status_code == 200
    assert response.json()["status"] == "draft"
    assert "source_text" not in response.json()


def test_unknown_draft_returns_404(client):
    assert client.get("/api/discharge/draft/nope").status_code == 404
    assert client.post("/api/discharge/nope/confirm", json={}).status_code == 404


def test_confirm_activates_plan_and_syncs_prescription(client):
    extraction = upload(client, make_pdf(SUMMARY_TEXT), patient_id="pt-001").json()

    extraction["medicines"][0]["confirmed"] = True
    response = client.post(f"/api/discharge/{extraction['draft_id']}/confirm", json=extraction)
    assert response.status_code == 200

    confirmed = response.json()
    assert confirmed["status"] == "active"
    assert confirmed["medicines_activated"] == 3
    assert confirmed["prescription_synced"] is True

    assert STORE["discharge_drafts"][0]["status"] == "active"
    prescription = STORE["prescriptions"][0]
    assert prescription["patient_id"] == "pt-001"
    assert [m["salt_composition"] for m in prescription["medicines"]] == [
        "Pantoprazole", "Paracetamol", "Cefixime",
    ]


def test_confirmed_plan_becomes_verifiable_by_pill_matching(client):
    """The two features share db.prescriptions — confirm the loop closes."""
    from pill_verification.matching_service import get_prescription, verify_against_prescription

    extraction = upload(client, make_pdf(SUMMARY_TEXT), patient_id="pt-001").json()
    client.post(f"/api/discharge/{extraction['draft_id']}/confirm", json=extraction)

    prescription = asyncio.run(get_prescription(FakeDB(), patient_id="pt-001"))
    assert prescription is not None

    paracetamol = next(d for d in DRUG_DB["drugs"] if d["salt_composition"] == "Paracetamol")
    assert verify_against_prescription(paracetamol, prescription)["is_match"] is True

    # Not on this prescription — must flag as a mismatch, not silently pass.
    atorvastatin = next(d for d in DRUG_DB["drugs"] if d["salt_composition"] == "Atorvastatin")
    assert verify_against_prescription(atorvastatin, prescription)["is_match"] is False
