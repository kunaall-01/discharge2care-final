"""Unit tests for the adherence schedule math (no database involved)."""

from datetime import datetime

from adherence.schedule import (
    STATUS_MISSED,
    STATUS_OVERDUE,
    STATUS_SKIPPED,
    STATUS_TAKEN,
    STATUS_UPCOMING,
    build_slots,
    compute_summary,
    course_active,
    parse_clock,
    parse_duration_days,
)

NOON = datetime(2026, 9, 23, 12, 0)

MEDICINE = {
    "drug_id": "m1",
    "salt_composition": "Paracetamol",
    "strength": "500mg",
    "timing": ["08:00", "20:00"],
    "start_date": "2026-09-20",
    "duration": "7 days",
}


def test_parse_clock_accepts_and_rejects():
    assert parse_clock("08:00") == (8, 0)
    assert parse_clock(" 9:30 ") == (9, 30)
    assert parse_clock("24:00") is None
    assert parse_clock("8pm") is None
    assert parse_clock("") is None


def test_parse_duration_days_handles_days_weeks_and_bare():
    assert parse_duration_days("7 days") == 7
    assert parse_duration_days("2 weeks") == 14
    assert parse_duration_days("10") == 10
    assert parse_duration_days("until finished") is None


def test_course_active_respects_start_and_duration_window():
    assert course_active(MEDICINE, "2026-09-19") is False   # before start
    assert course_active(MEDICINE, "2026-09-20") is True    # first day
    assert course_active(MEDICINE, "2026-09-26") is True    # last day (7th)
    assert course_active(MEDICINE, "2026-09-27") is False   # course finished


def test_build_slots_marks_past_slots_overdue_and_future_upcoming():
    slots = build_slots([MEDICINE], "2026-09-23", NOON, {})
    assert [(s["time"], s["status"]) for s in slots] == [
        ("08:00", STATUS_OVERDUE),
        ("20:00", STATUS_UPCOMING),
    ]
    assert slots[0]["medicine_name"] == "Paracetamol"


def test_build_slots_recorded_event_overrides_computed_status():
    events = {("m1", "2026-09-23", "08:00"): {"status": STATUS_TAKEN, "event_id": "e1"}}
    slots = build_slots([MEDICINE], "2026-09-23", NOON, events)
    assert slots[0]["status"] == STATUS_TAKEN
    assert slots[0]["event_id"] == "e1"
    assert slots[1]["status"] == STATUS_UPCOMING


def test_build_slots_skips_finished_course_and_missing_timing():
    assert build_slots([MEDICINE], "2026-09-27", NOON, {}) == []
    no_timing = dict(MEDICINE, timing=[])
    assert build_slots([no_timing], "2026-09-23", NOON, {}) == []


def test_build_slots_accepts_frontend_medicine_shape():
    frontend_shape = {
        "id": "m1",
        "name": "Paracetamol",
        "timing": ["08:00"],
        "startDate": "2026-09-20",
        "duration": "7 days",
    }
    slots = build_slots([frontend_shape], "2026-09-23", NOON, {})
    assert slots[0]["medicine_id"] == "m1"
    assert slots[0]["medicine_name"] == "Paracetamol"


def test_compute_summary_excludes_skipped_from_denominator():
    slots = [
        {"status": STATUS_TAKEN},
        {"status": STATUS_MISSED},
        {"status": STATUS_OVERDUE},
        {"status": STATUS_SKIPPED},
        {"status": STATUS_UPCOMING},
    ]
    summary = compute_summary(slots)
    assert summary["taken"] == 1
    assert summary["missed"] == 1
    assert summary["overdue"] == 1
    assert summary["skipped"] == 1
    # 1 taken of 3 due (skipped and upcoming excluded)
    assert summary["adherence_pct"] == 33.3


def test_compute_summary_with_no_doses_due_is_undefined_not_zero():
    assert compute_summary([])["adherence_pct"] is None
