"""
Pure schedule math for medication adherence. No database access here so the
overdue / adherence-percent rules can be unit-tested without Mongo.

All comparisons use naive "wall clock" datetimes. The caller supplies the
patient's UTC offset in minutes so a 08:00 dose is judged against 08:00 in the
patient's day, not 08:00 UTC.
"""

import re
from datetime import date, datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple

STATUS_TAKEN = "taken"
STATUS_MISSED = "missed"
STATUS_SKIPPED = "skipped"
STATUS_UPCOMING = "upcoming"
STATUS_OVERDUE = "overdue"

RECORDED_STATUSES = {STATUS_TAKEN, STATUS_MISSED, STATUS_SKIPPED}

_DURATION_RE = re.compile(r"(\d+)\s*(day|week)s?", re.I)


def local_now(tz_offset_minutes: int = 0) -> datetime:
    """Naive wall-clock 'now' for the patient's timezone."""
    return datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=tz_offset_minutes)


def parse_clock(value: str) -> Optional[Tuple[int, int]]:
    match = re.fullmatch(r"\s*(\d{1,2}):(\d{2})\s*", value or "")
    if not match:
        return None
    hour, minute = int(match.group(1)), int(match.group(2))
    if hour > 23 or minute > 59:
        return None
    return hour, minute


def parse_duration_days(value: str) -> Optional[int]:
    match = _DURATION_RE.search(value or "")
    if match:
        amount = int(match.group(1))
        return amount * 7 if match.group(2).lower() == "week" else amount
    if (value or "").strip().isdigit():
        return int(value.strip())
    return None


def normalize_medicine(raw: Dict) -> Dict:
    """
    Accept both shapes that reach adherence: the frontend MedicineItem
    (id/name/timing/startDate) and the db.prescriptions document produced by
    discharge confirm (drug_id/salt_composition/timing/start_date).
    """
    return {
        "id": raw.get("drug_id") or raw.get("id") or "",
        "name": raw.get("salt_composition") or raw.get("name") or "",
        "strength": raw.get("strength") or "",
        "timing": [t for t in (raw.get("timing") or []) if parse_clock(t)],
        "start_date": raw.get("start_date") or raw.get("startDate") or "",
        "duration": raw.get("duration") or "",
    }


def course_active(medicine: Dict, date_str: str) -> bool:
    start = medicine.get("start_date") or ""
    if start and date_str < start:
        return False
    days = parse_duration_days(medicine.get("duration") or "")
    if start and days:
        try:
            last_day = date.fromisoformat(start) + timedelta(days=days - 1)
        except ValueError:
            return True
        if date_str > last_day.isoformat():
            return False
    return True


def build_slots(
    medicines: List[Dict],
    date_str: str,
    now_wall: datetime,
    events: Dict[Tuple[str, str, str], Dict],
) -> List[Dict]:
    """
    Expand the active plan into one slot per medicine per scheduled time for
    `date_str`. A recorded dose event wins; otherwise a slot whose time has
    passed is overdue and one still ahead is upcoming.
    """
    slots: List[Dict] = []

    for raw in medicines:
        medicine = normalize_medicine(raw)
        if not medicine["timing"] or not course_active(medicine, date_str):
            continue

        for clock in medicine["timing"]:
            event = events.get((medicine["id"], date_str, clock))
            if event:
                status = event.get("status")
                event_id = event.get("event_id")
            else:
                hour, minute = parse_clock(clock)
                slot_dt = datetime.combine(date.fromisoformat(date_str), datetime.min.time().replace(hour=hour, minute=minute))
                status = STATUS_OVERDUE if slot_dt < now_wall else STATUS_UPCOMING
                event_id = None

            slots.append({
                "medicine_id": medicine["id"],
                "medicine_name": medicine["name"],
                "strength": medicine["strength"],
                "date": date_str,
                "time": clock,
                "status": status,
                "event_id": event_id,
            })

    slots.sort(key=lambda slot: slot["time"])
    return slots


def compute_summary(slots: List[Dict]) -> Dict:
    counts = {
        STATUS_TAKEN: 0,
        STATUS_MISSED: 0,
        STATUS_SKIPPED: 0,
        STATUS_OVERDUE: 0,
        STATUS_UPCOMING: 0,
    }
    for slot in slots:
        if slot["status"] in counts:
            counts[slot["status"]] += 1

    # Skipped doses are a deliberate clinical decision, so they are left out of
    # the denominator; counting them would punish the patient for following
    # "stop this medicine" advice.
    due = counts[STATUS_TAKEN] + counts[STATUS_MISSED] + counts[STATUS_OVERDUE]
    adherence_pct = round(100.0 * counts[STATUS_TAKEN] / due, 1) if due else None

    return {
        "taken": counts[STATUS_TAKEN],
        "missed": counts[STATUS_MISSED],
        "skipped": counts[STATUS_SKIPPED],
        "overdue": counts[STATUS_OVERDUE],
        "upcoming": counts[STATUS_UPCOMING],
        "adherence_pct": adherence_pct,
    }
