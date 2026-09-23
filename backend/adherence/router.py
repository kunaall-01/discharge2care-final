"""
Adherence Router
----------------
GET  /api/adherence/patient/{id}/schedule   today's (or a given day's) dose slots
POST /api/adherence/dose                    record taken / missed / skipped
GET  /api/adherence/patient/{id}/summary    adherence % + overdue over a window

The schedule is derived from db.prescriptions, the same collection discharge
confirm writes, so an activated care plan immediately produces dose slots.
Recorded events live in db.dose_events and override the computed status.
"""

import logging
import uuid
from datetime import timedelta
from typing import Dict, Optional, Tuple

from fastapi import APIRouter, HTTPException, Query, Request

from .schemas import AdherenceSummary, DoseEventCreate, DoseSlot, ScheduleResponse
from .schedule import (
    RECORDED_STATUSES,
    STATUS_OVERDUE,
    build_slots,
    compute_summary,
    local_now,
)

adherence_router = APIRouter(prefix="/adherence", tags=["Adherence"])
logger = logging.getLogger(__name__)

MAX_WINDOW_DAYS = 30


def _event_key(event: Dict) -> Tuple[str, str, str]:
    return (event.get("medicine_id", ""), event.get("date", ""), event.get("time", ""))


async def _load_events(db, patient_id: str, date: Optional[str] = None) -> Dict[Tuple[str, str, str], Dict]:
    query = {"patient_id": patient_id}
    if date:
        query["date"] = date
    events = await db.dose_events.find(query).to_list(2000)
    return {_event_key(e): e for e in events}


async def _load_prescription(db, patient_id: str):
    prescription = await db.prescriptions.find_one({"patient_id": patient_id})
    if not prescription:
        raise HTTPException(
            status_code=404,
            detail="No active care plan for this patient. Confirm a discharge summary first.",
        )
    return prescription


@adherence_router.get("/patient/{patient_id}/schedule", response_model=ScheduleResponse)
async def get_schedule(
    patient_id: str,
    request: Request,
    date: Optional[str] = Query(None, description="YYYY-MM-DD, defaults to today"),
    tz_offset_minutes: int = Query(0, description="Patient UTC offset in minutes, e.g. +330 for IST"),
):
    db = request.app.state.db
    now_wall = local_now(tz_offset_minutes)
    date_str = date or now_wall.date().isoformat()

    prescription = await _load_prescription(db, patient_id)
    events = await _load_events(db, patient_id, date_str)

    slots = build_slots(prescription.get("medicines", []), date_str, now_wall, events)
    return ScheduleResponse(
        patient_id=patient_id,
        date=date_str,
        slots=[DoseSlot(**s) for s in slots],
        overdue=[DoseSlot(**s) for s in slots if s["status"] == STATUS_OVERDUE],
    )


@adherence_router.post("/dose", response_model=DoseSlot)
async def record_dose(event: DoseEventCreate, request: Request):
    status = event.validated_status()
    if not status:
        raise HTTPException(
            status_code=400,
            detail=f"status must be one of {sorted(RECORDED_STATUSES)}.",
        )

    db = request.app.state.db
    key = {
        "patient_id": event.patient_id,
        "medicine_id": event.medicine_id,
        "date": event.date,
        "time": event.time,
    }

    existing = await db.dose_events.find_one(key)
    event_id = (existing or {}).get("event_id") or str(uuid.uuid4())

    document = dict(key)
    document.update({
        "event_id": event_id,
        "medicine_name": event.medicine_name,
        "status": status,
        "note": event.note,
        "recorded_at": local_now().isoformat(),
    })
    await db.dose_events.update_one(key, {"$set": document}, upsert=True)

    return DoseSlot(
        medicine_id=event.medicine_id,
        medicine_name=event.medicine_name,
        date=event.date,
        time=event.time,
        status=status,
        event_id=event_id,
    )


@adherence_router.get("/patient/{patient_id}/summary", response_model=AdherenceSummary)
async def get_summary(
    patient_id: str,
    request: Request,
    days: int = Query(7, ge=1, le=MAX_WINDOW_DAYS),
    tz_offset_minutes: int = Query(0),
):
    db = request.app.state.db
    now_wall = local_now(tz_offset_minutes)
    today = now_wall.date()

    prescription = await _load_prescription(db, patient_id)
    medicines = prescription.get("medicines", [])
    events = await _load_events(db, patient_id)

    all_slots = []
    for offset in range(days):
        date_str = (today - timedelta(days=offset)).isoformat()
        day_events = {k: v for k, v in events.items() if k[1] == date_str}
        all_slots.extend(build_slots(medicines, date_str, now_wall, day_events))

    summary = compute_summary(all_slots)
    overdue_slots = [s for s in all_slots if s["status"] == STATUS_OVERDUE]
    overdue_slots.sort(key=lambda s: (s["date"], s["time"]), reverse=True)

    return AdherenceSummary(
        patient_id=patient_id,
        window_days=days,
        overdue_slots=[DoseSlot(**s) for s in overdue_slots],
        **summary,
    )
