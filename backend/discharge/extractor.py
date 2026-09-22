"""
Discharge Summary Extractor
---------------------------
Turns the plain text of a discharge summary into the structured draft the
frontend renders on the Extraction Review screen.

This is deterministic rule-based parsing (section headers + regex), not an
LLM call. It needs no API key, costs nothing, and behaves identically on
every deploy. Drug names are matched against the same reference data
pill_verification uses, so the two features stay consistent.

Every extracted value is a *suggestion*: the patient confirms or edits each
one before anything is activated.
"""

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Dict, List, Optional

DRUG_DB_PATH = (
    Path(__file__).resolve().parent.parent
    / "pill_verification"
    / "data"
    / "drug_database.json"
)

MONTHS = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}

STRENGTH_RE = re.compile(r"\b(\d+(?:\.\d+)?)\s*(mg|mcg|ug|g|gm|ml|iu|units?)\b", re.I)
DOSAGE_CODE_RE = re.compile(r"\b([0-3])\s*[-–]\s*([0-3])\s*[-–]\s*([0-3])\b")
DURATION_RE = re.compile(r"\b(?:for|x)\s*(\d+)\s*(day|days|week|weeks|month|months)\b|\b(\d+)\s*(day|days|week|weeks|month|months)\b", re.I)
TIME_RE = re.compile(r"\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b|\b([01]?\d|2[0-3]):([0-5]\d)\b", re.I)
# Deliberately case-sensitive: with re.I the name group swallows the following
# preposition ("Dr. Anand Verma on 24/02" -> "Anand Verma On").
DOCTOR_RE = re.compile(r"\b(?:Dr\.?|Doctor)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2})")
DOCTOR_STOPWORDS = {"On", "At", "For", "In", "The", "And", "With", "OPD", "Room", "Clinic"}

FORM_PREFIX_RE = re.compile(
    r"\b(tab|tabs|tablet|cap|caps|capsule|syp|syrup|inj|injection|sachet|gel|ointment|cream)\b\.?\s+"
    r"([A-Za-z][A-Za-z0-9\-]{2,})",
    re.I,
)

FREQUENCY_PHRASES = [
    (r"\b(three times|3 times|thrice)\s*(a|per)?\s*(day|daily)\b|\btds\b|\btid\b", "3 times/day"),
    (r"\b(twice|two times|2 times)\s*(a|per)?\s*(day|daily)\b|\bbd\b|\bbid\b", "2 times/day"),
    (r"\b(once|one time|1 time)\s*(a|per)?\s*(day|daily)\b|\bod\b|\bqd\b", "1 time/day"),
    (r"\bat bedtime|\bhs\b|\bnightly\b", "1 time/day at night"),
    (r"\bwhen needed|\bas needed|\bprn\b|\bsos\b", "As needed"),
]

TEST_KEYWORDS = [
    "complete blood count", "cbc", "liver function", "lft", "kidney function",
    "renal function", "kft", "rft", "lipid profile", "hba1c", "fasting blood sugar",
    "fbs", "ppbs", "thyroid", "tsh", "vitamin d", "vitamin b12", "urine routine",
    "urine culture", "blood culture", "x-ray", "xray", "ultrasound", "usg", "ecg",
    "echo", "echocardiogram", "mri", "ct scan", "hrct", "chest radiograph",
    "esr", "crp", "platelet count", "hemoglobin", "hb", "electrolytes",
]

APPOINTMENT_KEYWORDS = [
    "follow-up", "follow up", "followup", "review", "appointment", "consult",
    "consultation", "opd", "next visit", "come back", "report back", "suture removal",
    "stitch removal",
]

CARE_SECTION_HEADERS = [
    "discharge advice", "advice on discharge", "care instructions", "instructions",
    "recommendations", "activity", "diet", "wound care", "general advice",
    "patient education", "warning signs", "red flags",
]

CARE_KEYWORDS = [
    "wound", "dressing", "incision", "suture", "stitch", "keep dry", "walking",
    "walk", "exercise", "rest", "avoid", "diet", "fluid", "water", "elevate",
    "ice", "medication", "physiotherapy", "no heavy lifting", "lifting",
    "smoking", "alcohol", "shower", "bath", "drive", "driving", "stair",
]

STOPWORD_SECTION_HEADERS = [
    "medications", "medicines", "prescription", "drug", "laboratory",
    "investigations", "tests", "appointments", "diagnosis", "history",
    "examination", "vitals", "billing", "signature",
]

# Word-boundary matching: bare substring checks let short keywords like "rest"
# or "diet" fire inside drug names and produce junk care tasks.
_CARE_KEYWORD_RE = re.compile(
    r"\b(?:" + "|".join(re.escape(k) for k in CARE_KEYWORDS) + r")\b", re.I
)
_APPOINTMENT_KEYWORD_RE = re.compile(
    r"\b(?:" + "|".join(re.escape(k) for k in APPOINTMENT_KEYWORDS) + r")\b", re.I
)
_BULLET_RE = re.compile(r"^([-•*·]|\d{1,2}[.)])\s+")
MAX_CARE_TASKS = 10


@lru_cache(maxsize=1)
def _known_drug_names() -> List[str]:
    with open(DRUG_DB_PATH, "r", encoding="utf-8") as handle:
        database = json.load(handle)

    names = set()
    for drug in database["drugs"]:
        names.add(drug["salt_composition"])
        names.update(drug["brand_names"])
    # Longest first so "Amoxicillin" wins over a shorter overlapping name.
    return sorted(names, key=len, reverse=True)


def _normalize_date(raw: str) -> Optional[str]:
    """Best-effort parse of the date formats hospitals actually print."""
    text = raw.strip()

    iso = re.match(r"^(\d{4})-(\d{1,2})-(\d{1,2})$", text)
    if iso:
        year, month, day = iso.groups()
        return f"{year}-{int(month):02d}-{int(day):02d}"

    # DD/MM/YYYY and DD-MM-YYYY — Indian discharge summaries are day-first.
    numeric = re.match(r"^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$", text)
    if numeric:
        day, month, year = numeric.groups()
        if int(month) > 12 and int(day) <= 12:
            day, month = month, day
        return f"{year}-{int(month):02d}-{int(day):02d}"

    named = re.match(r"^(\d{1,2})\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})$", text)
    if named:
        day, month_name, year = named.groups()
        month = MONTHS.get(month_name[:3].lower())
        if month:
            return f"{year}-{month:02d}-{int(day):02d}"

    return None


def _find_date(line: str) -> str:
    candidates = re.findall(
        r"\b\d{4}-\d{1,2}-\d{1,2}\b"
        r"|\b\d{1,2}[/\-.]\d{1,2}[/\-.]\d{4}\b"
        r"|\b\d{1,2}\s+[A-Za-z]{3,9}\.?,?\s+\d{4}\b",
        line,
    )
    for candidate in candidates:
        parsed = _normalize_date(candidate)
        if parsed:
            return parsed
    return ""


def _find_time(line: str) -> str:
    match = TIME_RE.search(line)
    if not match:
        return ""

    hour, minute, meridiem, h24, m24 = match.groups()
    if h24 is not None:
        return f"{int(h24):02d}:{int(m24):02d}"

    hour = int(hour)
    minute = int(minute or 0)
    if meridiem:
        meridiem = meridiem.lower()
        if meridiem == "pm" and hour != 12:
            hour += 12
        elif meridiem == "am" and hour == 12:
            hour = 0
    return f"{hour:02d}:{minute:02d}"


def _strength_from(line: str) -> str:
    match = STRENGTH_RE.search(line)
    if not match:
        return ""
    value, unit = match.groups()
    unit = unit.lower().replace("ug", "mcg").replace("gm", "g")
    if unit == "units":
        unit = "units" if value != "1" else "unit"
    return f"{value} {unit}"


def _duration_from(line: str) -> str:
    match = DURATION_RE.search(line)
    if not match:
        return ""
    count, unit = (match.group(1) or match.group(3)), (match.group(2) or match.group(4))
    unit = unit.lower()
    if unit in ("day", "days"):
        return f"{count} days" if count != "1" else "1 day"
    if unit in ("week", "weeks"):
        return f"{count} weeks" if count != "1" else "1 week"
    return f"{count} months" if count != "1" else "1 month"


def _timing_from_dosage_code(line: str) -> Optional[Dict[str, object]]:
    """'1-0-1' is the shorthand most Indian discharge summaries use."""
    match = DOSAGE_CODE_RE.search(line)
    if not match:
        return None

    morning, afternoon, night = (int(g) for g in match.groups())
    total = morning + afternoon + night
    if total == 0:
        return None

    slots = []
    if morning:
        slots.append("08:00")
    if afternoon:
        slots.append("14:00")
    if night:
        slots.append("20:00" if not afternoon else "21:00")

    label = {1: "1 time/day", 2: "2 times/day", 3: "3 times/day"}.get(
        total, f"{total} times/day"
    )
    return {
        "frequency": label,
        "timing": slots,
        "dose": f"{morning}-{afternoon}-{night}",
    }


NIGHT_RE = re.compile(r"\bat bedtime\b|\bhs\b|\bnightly\b|\bat night\b", re.I)

# Fallback for lines written in words ("twice daily") instead of the 1-0-1 code.
DEFAULT_TIMING_BY_FREQUENCY = {
    "1 time/day": ["08:00"],
    "2 times/day": ["08:00", "20:00"],
    "3 times/day": ["08:00", "14:00", "21:00"],
    "1 time/day at night": ["21:00"],
}


def _frequency_from_phrase(line: str) -> str:
    base = ""
    for pattern, label in FREQUENCY_PHRASES:
        if re.search(pattern, line, re.I):
            base = label
            break

    if base and NIGHT_RE.search(line) and "night" not in base:
        return f"{base} at night"
    return base


def _timing_from_frequency(line: str, frequency: str) -> List[str]:
    if NIGHT_RE.search(line):
        return ["21:00"]
    return list(DEFAULT_TIMING_BY_FREQUENCY.get(frequency, []))


def _title_case_name(name: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9\- ]", "", name).strip()
    return " ".join(part.capitalize() for part in cleaned.split())


def _extract_medicines(lines: List[str]) -> List[Dict]:
    known_drugs = _known_drug_names()
    found = []
    seen = set()
    counter = 0

    for line in lines:
        if not line.strip():
            continue
        lowered = line.lower()

        name = None
        for drug in known_drugs:
            if re.search(rf"\b{re.escape(drug.lower())}\b", lowered):
                name = _title_case_name(drug)
                break

        if name is None:
            form_match = FORM_PREFIX_RE.search(line)
            if form_match:
                name = _title_case_name(form_match.group(2))

        if not name or name.lower() in seen:
            continue
        seen.add(name.lower())

        counter += 1
        dosage = _timing_from_dosage_code(line) or {}
        frequency = dosage.get("frequency") or _frequency_from_phrase(line)
        slots = dosage.get("timing") or _timing_from_frequency(line, frequency)
        strength = _strength_from(line)

        found.append({
            "id": f"m{counter}",
            "name": name,
            "strength": strength,
            "dose": dosage.get("dose") or ("1 dose" if frequency else ""),
            "frequency": frequency,
            "timing": slots,
            "duration": _duration_from(line),
            "confirmed": False,
        })

    return found


def _extract_tests(lines: List[str]) -> List[Dict]:
    found = []
    seen = set()
    counter = 0

    for line in lines:
        lowered = line.lower()
        if not lowered.strip():
            continue
        if _APPOINTMENT_KEYWORD_RE.search(lowered):
            continue

        matched = None
        for keyword in TEST_KEYWORDS:
            if re.search(rf"\b{re.escape(keyword)}\b", lowered):
                matched = keyword
                break
        if not matched:
            continue

        label = _title_case_name(matched)
        if label.lower() in seen:
            continue
        seen.add(label.lower())

        counter += 1
        location = ""
        location_match = re.search(r"\b(?:at|from|@)\s+([A-Z][A-Za-z0-9&\-. ]{2,40})", line)
        if location_match:
            location = location_match.group(1).strip()

        found.append({
            "id": f"t{counter}",
            "name": label,
            "date": _find_date(line),
            "location": location,
            "status": "upcoming",
            "report": None,
        })

    return found


def _extract_appointments(lines: List[str]) -> List[Dict]:
    found = []
    counter = 0

    for line in lines:
        lowered = line.lower()
        if not lowered.strip():
            continue
        if not _APPOINTMENT_KEYWORD_RE.search(lowered):
            continue

        date = _find_date(line)
        appointment_time = _find_time(line)
        if not date and not appointment_time:
            continue

        counter += 1
        doctor = ""
        doctor_match = DOCTOR_RE.search(line)
        if doctor_match:
            name_words = [
                word for word in doctor_match.group(1).split()
                if word not in DOCTOR_STOPWORDS
            ]
            doctor = _title_case_name(" ".join(name_words))

        title = line.strip(" -:•*\t")
        title = re.sub(r"\s+", " ", title)

        found.append({
            "id": f"a{counter}",
            "title": title[:90],
            "doctor": doctor,
            "department": "",
            "date": date,
            "time": appointment_time,
            "location": "",
            "notes": "",
            "completed": False,
        })

    return found


def _care_lines(lines: List[str]) -> List[str]:
    """Lines that belong to the advice/instructions part of the document."""
    collected = []
    in_care_section = False

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        header = stripped.lower().rstrip(":")
        if header in CARE_SECTION_HEADERS:
            in_care_section = True
            continue
        if header in STOPWORD_SECTION_HEADERS:
            in_care_section = False
            continue

        lowered = stripped.lower()

        # Follow-up lines belong to the appointments list, not the care plan.
        if _APPOINTMENT_KEYWORD_RE.search(lowered):
            continue

        is_bullet = bool(_BULLET_RE.match(stripped))
        has_care_keyword = bool(_CARE_KEYWORD_RE.search(lowered))

        if in_care_section or (is_bullet and has_care_keyword):
            collected.append(_BULLET_RE.sub("", stripped))
        elif has_care_keyword and len(stripped) < 160:
            collected.append(stripped)

    return collected


def _extract_care_tasks(care_lines: List[str]):
    """Returns (tasks, consumed_lines) so notes can skip what became a task."""
    tasks = []
    consumed = []

    for line in care_lines:
        if len(line) < 6:
            continue
        if len(tasks) >= MAX_CARE_TASKS:
            break

        consumed.append(line)
        schedule_match = re.search(
            r"\b(daily|twice daily|twice a day|three times daily|once daily|"
            r"every day|weekly|as needed|at night|in the morning|in the evening)\b"
            r"(?:\s+at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?))?",
            line,
            re.I,
        )
        schedule = schedule_match.group(0).strip() if schedule_match else ""

        title = re.split(r"\s*[—-]\s*|\s{2,}|\.\s", line, maxsplit=1)[0].strip()
        note = line[len(title):].strip(" —-.:") if len(line) > len(title) else ""

        tasks.append({
            "id": f"c{len(tasks) + 1}",
            "title": title[:90] or line[:90],
            "schedule": schedule,
            "note": note[:200],
        })

    return tasks, consumed


def _build_notes(care_lines: List[str], consumed: List[str]) -> str:
    consumed_set = set(consumed)
    leftovers = [
        line for line in care_lines
        if line not in consumed_set and len(line.strip()) > 10
    ]
    return " ".join(leftovers[:4]).strip()[:500]


def extract_structured(text: str) -> Dict:
    """
    Parse discharge-summary text into the ExtractionResult shape.
    """
    lines = [line.rstrip() for line in text.splitlines()]

    medicines = _extract_medicines(lines)
    tests = _extract_tests(lines)
    appointments = _extract_appointments(lines)

    care_lines = _care_lines(lines)
    care_tasks, consumed_care_lines = _extract_care_tasks(care_lines)

    discharge_date = ""
    for line in lines:
        if re.search(r"\bdischarge(d)?\s+(date|on)\b", line, re.I):
            discharge_date = _find_date(line)
            if discharge_date:
                break
    if not discharge_date:
        for test in tests:
            if test["date"]:
                discharge_date = test["date"]
                break

    for medicine in medicines:
        medicine["startDate"] = discharge_date

    notes = _build_notes(care_lines, consumed_care_lines)

    return {
        "medicines": medicines,
        "tests": tests,
        "appointments": appointments,
        "careTasks": care_tasks,
        "notes": notes,
    }
