"""Unit tests for the discharge-summary extractor. Pure stdlib — no DB, no FastAPI."""

from discharge.extractor import extract_structured

SUMMARY = """
SUNRISE MULTI-SPECIALTY HOSPITAL
DISCHARGE SUMMARY
Discharge Date: 12/02/2026

MEDICATIONS
1. Tab. Pantoprazole 40 mg 1-0-0 for 10 days
2. Tab. Paracetamol 500 mg 1-0-1 for 5 days
3. Tab. Domperidone 10 mg 1-1-1 for 5 days

INVESTIGATIONS ADVISED
Complete Blood Count (CBC) on 17/02/2026 at Sunrise Diagnostics
Liver Function Test (LFT) on 20 Feb 2026 at Sunrise Diagnostics

APPOINTMENTS
Follow-up with Dr. Anand Verma on 24/02/2026 at 11:00 AM, OPD-3
Suture removal review 19 Feb 2026

DISCHARGE ADVICE
- Wound dressing daily at 6:00 PM - keep incision area dry
- Light walking 20 min twice daily - avoid strenuous activity
"""


def test_medicines_parsed_with_dosage_code():
    meds = {m["name"]: m for m in extract_structured(SUMMARY)["medicines"]}

    assert meds["Pantoprazole"]["strength"] == "40 mg"
    assert meds["Pantoprazole"]["dose"] == "1-0-0"
    assert meds["Pantoprazole"]["frequency"] == "1 time/day"
    assert meds["Pantoprazole"]["timing"] == ["08:00"]
    assert meds["Pantoprazole"]["duration"] == "10 days"

    # 1-1-1 expands to three reminder slots
    assert meds["Domperidone"]["frequency"] == "3 times/day"
    assert meds["Domperidone"]["timing"] == ["08:00", "14:00", "21:00"]


def test_medicines_start_date_comes_from_discharge_date():
    meds = extract_structured(SUMMARY)["medicines"]
    assert all(m["startDate"] == "2026-02-12" for m in meds)


def test_medicines_default_to_unconfirmed():
    assert all(m["confirmed"] is False for m in extract_structured(SUMMARY)["medicines"])


def test_frequency_phrase_used_when_no_dosage_code():
    out = extract_structured("Tab. Atorvastatin 10 mg once daily at night for 30 days")
    med = out["medicines"][0]
    assert med["frequency"] == "1 time/day at night"
    assert med["timing"] == ["21:00"]


def test_drugs_outside_reference_db_found_via_form_prefix():
    out = extract_structured("Tab. Losartan 50 mg 1-0-0 for 30 days")
    assert out["medicines"][0]["name"] == "Losartan"


def test_duplicate_medicines_collapse_to_one_entry():
    out = extract_structured("Tab. Paracetamol 500mg\nTab. Paracetamol 650mg")
    assert [m["name"] for m in out["medicines"]] == ["Paracetamol"]


def test_dates_normalized_to_iso_across_formats():
    tests = {t["name"]: t for t in extract_structured(SUMMARY)["tests"]}
    assert tests["Complete Blood Count"]["date"] == "2026-02-17"  # DD/MM/YYYY
    assert tests["Liver Function"]["date"] == "2026-02-20"       # 20 Feb 2026

    iso = extract_structured("HbA1c on 2026-03-05")
    assert iso["tests"][0]["date"] == "2026-03-05"


def test_appointment_extracts_doctor_date_and_time():
    appt = extract_structured(SUMMARY)["appointments"][0]
    # Regression: a case-insensitive name group used to swallow the trailing "On"
    assert appt["doctor"] == "Anand Verma"
    assert appt["date"] == "2026-02-24"
    assert appt["time"] == "11:00"


def test_appointment_lines_do_not_leak_into_care_tasks():
    tasks = extract_structured(SUMMARY)["careTasks"]
    assert not any("suture removal" in t["title"].lower() for t in tasks)


def test_care_tasks_split_title_from_note():
    tasks = {t["title"]: t for t in extract_structured(SUMMARY)["careTasks"]}
    assert tasks["Wound dressing daily at 6:00 PM"]["schedule"] == "daily at 6:00 PM"
    assert tasks["Wound dressing daily at 6:00 PM"]["note"] == "keep incision area dry"


def test_care_tasks_capped_at_ten():
    doc = "DISCHARGE ADVICE\n" + "\n".join(f"- Avoid lifting item {i}" for i in range(25))
    assert len(extract_structured(doc)["careTasks"]) == 10


def test_notes_exclude_lines_already_used_as_tasks():
    out = extract_structured(SUMMARY)
    task_titles = {t["title"] for t in out["careTasks"]}
    assert not (task_titles & set(out["notes"].split(" ")))
    assert out["notes"] == ""  # every advice line became a task


def test_ids_are_sequential_and_prefixed():
    out = extract_structured(SUMMARY)
    assert [m["id"] for m in out["medicines"]] == ["m1", "m2", "m3"]
    assert [t["id"] for t in out["tests"]] == ["t1", "t2"]


def test_empty_and_gibberish_input_return_empty_result():
    for text in ("", "   \n\n  ", "8472 %%% zzz qqq nothing usable here"):
        out = extract_structured(text)
        assert out == {
            "medicines": [], "tests": [], "appointments": [],
            "careTasks": [], "notes": "",
        }
