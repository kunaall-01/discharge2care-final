"""
Care Circle Router
------------------
POST   /api/caregivers                       link a family member to a patient
GET    /api/caregivers/patient/{id}          the patient's care circle
GET    /api/caregivers/{id}                  one caregiver
PATCH  /api/caregivers/{id}                  rename / re-permission
DELETE /api/caregivers/{id}                  revoke access
GET    /api/caregivers/{id}/dashboard        what this caregiver is allowed to see

The dashboard is permission-gated: a caregiver only sees the medication
schedule and adherence if the patient granted `medication`. That keeps the
"access is controlled by you" promise the Family page makes, server-side.
"""

import logging
import uuid
from datetime import timedelta
from typing import Dict, List, Tuple

from fastapi import APIRouter, HTTPException, Query, Request

from adherence.schemas import AdherenceSummary, DoseSlot
from adherence.schedule import STATUS_OVERDUE, build_slots, compute_summary, local_now

from .schemas import Caregiver, CaregiverCreate, CaregiverDashboard, CaregiverUpdate, Permissions

caregiver_router = APIRouter(prefix="/caregivers", tags=["Care Circle"])
logger = logging.getLogger(__name__)

SUMMARY_WINDOW_DAYS = 7


def _to_caregiver(doc: Dict) -> Caregiver:
    return Caregiver(
        caregiver_id=doc.get("caregiver_id", ""),
        patient_id=doc.get("patient_id", ""),
        name=doc.get("name", ""),
        relation=doc.get("relation", ""),
        phone=doc.get("phone", ""),
        email=doc.get("email", ""),
        permissions=Permissions(**(doc.get("permissions") or {})),
        created_at=doc.get("created_at", ""),
    )


def _event_key(event: Dict) -> Tuple[str, str, str]:
    return (event.get("medicine_id", ""), event.get("date", ""), event.get("time", ""))


@caregiver_router.post("/", response_model=Caregiver)
async def link_caregiver(payload: CaregiverCreate, request: Request):
    if not payload.name.strip() or not payload.relation.strip():
        raise HTTPException(status_code=400, detail="Name and relation are required.")

    db = request.app.state.db
    document = {
        "caregiver_id": str(uuid.uuid4()),
        "patient_id": payload.patient_id,
        "name": payload.name.strip(),
        "relation": payload.relation.strip(),
        "phone": payload.phone.strip(),
        "email": payload.email.strip(),
        "permissions": payload.permissions.as_dict(),
        "created_at": local_now().isoformat(),
    }
    await db.caregivers.insert_one(document)
    return _to_caregiver(document)


@caregiver_router.get("/patient/{patient_id}", response_model=List[Caregiver])
async def list_caregivers(patient_id: str, request: Request):
    db = request.app.state.db
    docs = await db.caregivers.find({"patient_id": patient_id}).to_list(200)
    return [_to_caregiver(d) for d in docs]


@caregiver_router.get("/{caregiver_id}", response_model=Caregiver)
async def get_caregiver(caregiver_id: str, request: Request):
    db = request.app.state.db
    doc = await db.caregivers.find_one({"caregiver_id": caregiver_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Caregiver not found.")
    return _to_caregiver(doc)


@caregiver_router.patch("/{caregiver_id}", response_model=Caregiver)
async def update_caregiver(caregiver_id: str, payload: CaregiverUpdate, request: Request):
    db = request.app.state.db
    existing = await db.caregivers.find_one({"caregiver_id": caregiver_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Caregiver not found.")

    changes = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if k != "permissions"}
    if payload.permissions is not None:
        merged = {**(existing.get("permissions") or {}), **payload.permissions.as_dict()}
        changes["permissions"] = merged

    if not changes:
        return _to_caregiver(existing)

    await db.caregivers.update_one({"caregiver_id": caregiver_id}, {"$set": changes})
    return _to_caregiver({**existing, **changes})


@caregiver_router.delete("/{caregiver_id}")
async def revoke_caregiver(caregiver_id: str, request: Request):
    db = request.app.state.db
    result = await db.caregivers.delete_one({"caregiver_id": caregiver_id})
    deleted = getattr(result, "deleted_count", 0) or 0
    if not deleted:
        raise HTTPException(status_code=404, detail="Caregiver not found.")
    return {"caregiver_id": caregiver_id, "revoked": True}


@caregiver_router.get("/{caregiver_id}/dashboard", response_model=CaregiverDashboard)
async def caregiver_dashboard(
    caregiver_id: str,
    request: Request,
    tz_offset_minutes: int = Query(0),
):
    db = request.app.state.db
    doc = await db.caregivers.find_one({"caregiver_id": caregiver_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Caregiver not found.")

    caregiver = _to_caregiver(doc)
    base = CaregiverDashboard(
        caregiver=caregiver,
        patient_id=caregiver.patient_id,
        has_medication_access=bool(caregiver.permissions.medication),
    )
    if not caregiver.permissions.medication:
        return base

    now_wall = local_now(tz_offset_minutes)
    today = now_wall.date().isoformat()

    prescription = await db.prescriptions.find_one({"patient_id": caregiver.patient_id})
    medicines = (prescription or {}).get("medicines", [])

    events = await db.dose_events.find({"patient_id": caregiver.patient_id}).to_list(2000)
    by_key = {_event_key(e): e for e in events}

    all_slots: List[Dict] = []
    for offset in range(SUMMARY_WINDOW_DAYS):
        date_str = (now_wall.date() - timedelta(days=offset)).isoformat()
        day_events = {k: v for k, v in by_key.items() if k[1] == date_str}
        all_slots.extend(build_slots(medicines, date_str, now_wall, day_events))

    today_slots = [s for s in all_slots if s["date"] == today]
    overdue = [s for s in all_slots if s["status"] == STATUS_OVERDUE]
    overdue.sort(key=lambda s: (s["date"], s["time"]), reverse=True)
    summary = compute_summary(all_slots)

    base.medicines = medicines
    base.today = [DoseSlot(**s) for s in today_slots]
    base.overdue = [DoseSlot(**s) for s in overdue]
    base.adherence = AdherenceSummary(
        patient_id=caregiver.patient_id,
        window_days=SUMMARY_WINDOW_DAYS,
        overdue_slots=[DoseSlot(**s) for s in overdue],
        **summary,
    )
    return base
