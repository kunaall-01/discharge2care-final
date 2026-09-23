"""
Router-level tests for adherence + care circle endpoints.

These routers only touch `request.app.state.db`, so a tiny in-memory fake is
enough — no Motor stub and no MongoDB required.
"""

from datetime import datetime, timezone

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from adherence.router import adherence_router
from caregivers.router import caregiver_router

STORE = {"prescriptions": [], "dose_events": [], "caregivers": []}


def _matches(doc, query):
    return all(doc.get(key) == value for key, value in (query or {}).items())


class _Cursor:
    def __init__(self, docs):
        self._docs = docs

    async def to_list(self, limit):
        return [dict(d) for d in self._docs[:limit]]


class FakeCollection:
    def __init__(self, name):
        self.name = name

    def find(self, query=None):
        return _Cursor([d for d in STORE[self.name] if _matches(d, query or {})])

    async def find_one(self, query=None, projection=None):
        for doc in STORE[self.name]:
            if _matches(doc, query or {}):
                return dict(doc)
        return None

    async def insert_one(self, doc):
        STORE[self.name].append(dict(doc))

    async def update_one(self, query, update, upsert=False):
        for doc in STORE[self.name]:
            if _matches(doc, query):
                doc.update(update.get("$set", {}))
                return
        if upsert:
            created = dict(query)
            created.update(update.get("$set", {}))
            STORE[self.name].append(created)

    async def delete_one(self, query):
        for index, doc in enumerate(STORE[self.name]):
            if _matches(doc, query):
                STORE[self.name].pop(index)
                return type("Result", (), {"deleted_count": 1})()
        return type("Result", (), {"deleted_count": 0})()


class FakeDB:
    def __getattr__(self, name):
        return FakeCollection(name)


@pytest.fixture(autouse=True)
def reset_store():
    for bucket in STORE.values():
        bucket.clear()
    yield


@pytest.fixture
def client():
    app = FastAPI()
    app.state.db = FakeDB()
    app.include_router(adherence_router, prefix="/api")
    app.include_router(caregiver_router, prefix="/api")
    with TestClient(app) as test_client:
        yield test_client


def today():
    return datetime.now(timezone.utc).date().isoformat()


def seed_prescription(patient_id="pt-001"):
    STORE["prescriptions"].append({
        "patient_id": patient_id,
        "prescription_id": "RX-TEST",
        "medicines": [{
            "drug_id": "para500",
            "salt_composition": "Paracetamol",
            "strength": "500mg",
            "timing": ["08:00", "20:00"],
            "start_date": today(),
            "duration": "7 days",
        }],
    })


def test_schedule_requires_an_active_plan(client):
    response = client.get("/api/adherence/patient/pt-001/schedule")
    assert response.status_code == 404
    assert "No active care plan" in response.json()["detail"]


def test_schedule_expands_plan_into_slots(client):
    seed_prescription()
    response = client.get("/api/adherence/patient/pt-001/schedule")
    assert response.status_code == 200

    body = response.json()
    assert body["date"] == today()
    assert [s["time"] for s in body["slots"]] == ["08:00", "20:00"]
    assert all(s["medicine_name"] == "Paracetamol" for s in body["slots"])
    assert body["overdue"] == [s for s in body["slots"] if s["status"] == "overdue"]


def test_recording_a_dose_overrides_the_slot(client):
    seed_prescription()
    slot = client.get("/api/adherence/patient/pt-001/schedule").json()["slots"][0]

    response = client.post("/api/adherence/dose", json={
        "patient_id": "pt-001",
        "medicine_id": slot["medicine_id"],
        "medicine_name": slot["medicine_name"],
        "date": slot["date"],
        "time": slot["time"],
        "status": "taken",
    })
    assert response.status_code == 200
    assert response.json()["status"] == "taken"

    after = client.get("/api/adherence/patient/pt-001/schedule").json()
    recorded = next(s for s in after["slots"] if s["time"] == slot["time"])
    assert recorded["status"] == "taken"
    assert recorded["event_id"]


def test_recording_rejects_unknown_status(client):
    seed_prescription()
    response = client.post("/api/adherence/dose", json={
        "patient_id": "pt-001", "medicine_id": "para500",
        "date": today(), "time": "08:00", "status": "maybe",
    })
    assert response.status_code == 400


def test_summary_counts_recorded_doses(client):
    seed_prescription()
    slot = client.get("/api/adherence/patient/pt-001/schedule").json()["slots"][0]
    client.post("/api/adherence/dose", json={
        "patient_id": "pt-001", "medicine_id": slot["medicine_id"],
        "date": slot["date"], "time": slot["time"], "status": "taken",
    })

    summary = client.get("/api/adherence/patient/pt-001/summary?days=1").json()
    assert summary["taken"] == 1
    assert summary["adherence_pct"] == 100.0
    assert summary["window_days"] == 1


def link(client, **overrides):
    payload = {"patient_id": "pt-001", "name": "Aarav Sharma", "relation": "Son"}
    payload.update(overrides)
    return client.post("/api/caregivers/", json=payload)


def test_caregiver_link_list_and_revoke(client):
    created = link(client).json()
    assert created["caregiver_id"]
    assert created["permissions"]["medication"] is False

    listed = client.get("/api/caregivers/patient/pt-001").json()
    assert [c["name"] for c in listed] == ["Aarav Sharma"]

    revoked = client.delete(f"/api/caregivers/{created['caregiver_id']}")
    assert revoked.status_code == 200
    assert client.get(f"/api/caregivers/{created['caregiver_id']}").status_code == 404


def test_link_requires_name_and_relation(client):
    assert link(client, name="").status_code == 400
    assert link(client, relation="").status_code == 400


def test_dashboard_is_empty_until_medication_is_granted(client):
    seed_prescription()
    caregiver = link(client).json()

    gated = client.get(f"/api/caregivers/{caregiver['caregiver_id']}/dashboard").json()
    assert gated["has_medication_access"] is False
    assert gated["medicines"] == []
    assert gated["adherence"] is None


def test_dashboard_shows_plan_and_adherence_once_granted(client):
    seed_prescription()
    caregiver = link(client).json()

    client.patch(f"/api/caregivers/{caregiver['caregiver_id']}", json={
        "permissions": {"medication": True},
    })

    dashboard = client.get(f"/api/caregivers/{caregiver['caregiver_id']}/dashboard").json()
    assert dashboard["has_medication_access"] is True
    assert [m["salt_composition"] for m in dashboard["medicines"]] == ["Paracetamol"]
    assert len(dashboard["today"]) == 2
    assert dashboard["adherence"]["window_days"] == 7


def test_dashboard_unknown_caregiver_404(client):
    assert client.get("/api/caregivers/nope/dashboard").status_code == 404
