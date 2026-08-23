"""
Matching Service
-----------------
1. Identifies a drug from OCR-extracted wrapper text by matching against
   the local drug database (JSON — static reference data).
2. Compares the identified drug's salt composition against the doctor's
   prescription for that patient, stored in MongoDB (dynamic, per-patient
   data that lives in the same database as the rest of the app).
"""

import json
import re
from pathlib import Path
from difflib import SequenceMatcher
from typing import Optional

DATA_DIR = Path(__file__).resolve().parent / "data"
DRUG_DB_PATH = DATA_DIR / "drug_database.json"


def _load_drug_db() -> dict:
    with open(DRUG_DB_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.upper(), b.upper()).ratio()


def _normalize(text: str) -> str:
    return re.sub(r"[^A-Z0-9 ]", " ", text.upper())


def identify_drug_from_text(ocr_text: str, min_confidence: float = 0.6) -> Optional[dict]:
    """
    Match OCR-extracted wrapper text against the local drug database.

    Tries exact substring match on brand names / salt composition first
    (high confidence), then falls back to fuzzy token matching to handle
    OCR noise (misread characters, partial text, etc).
    """
    db = _load_drug_db()
    normalized_text = _normalize(ocr_text)
    tokens = normalized_text.split()

    best_match = None
    best_score = 0.0

    for drug in db["drugs"]:
        candidates = drug["brand_names"] + [drug["salt_composition"]]

        for candidate in candidates:
            candidate_norm = _normalize(candidate)

            if candidate_norm in normalized_text:
                score = 1.0
                if score > best_score:
                    best_score = score
                    best_match = drug
                continue

            for i in range(len(tokens)):
                window = " ".join(tokens[i:i + 2])
                score = _similarity(candidate_norm, window)
                if score > best_score:
                    best_score = score
                    best_match = drug

    if best_match and best_score >= min_confidence:
        return {
            "matched_drug": best_match,
            "confidence": round(best_score, 2)
        }
    return None


async def get_prescription(db, patient_id: Optional[str] = None,
                            prescription_id: Optional[str] = None) -> Optional[dict]:
    """
    Fetch a prescription from MongoDB.

    `db` is the same Motor database instance used elsewhere in server.py
    (passed in, not created here — one connection for the whole app).

    Expects documents in db.prescriptions shaped like:
    {
        "prescription_id": "RX1001",
        "patient_id": "P001",
        "patient_name": "Ravi Kumar",
        "doctor_name": "Dr. Anjali Mehta",
        "date_issued": "2026-08-15",
        "medicines": [
            {"drug_id": "para500", "salt_composition": "Paracetamol", "strength": "500mg", ...}
        ]
    }
    """
    query = {}
    if prescription_id:
        query["prescription_id"] = prescription_id
    elif patient_id:
        query["patient_id"] = patient_id
    else:
        return None

    doc = await db.prescriptions.find_one(query, {"_id": 0})
    return doc


def verify_against_prescription(matched_drug: dict, prescription: dict) -> dict:
    """
    Check whether the identified drug's salt composition matches ANY
    medicine listed in the doctor's prescription for this patient.
    """
    identified_salt = matched_drug["salt_composition"].strip().upper()

    for med in prescription["medicines"]:
        prescribed_salt = med["salt_composition"].strip().upper()
        if identified_salt == prescribed_salt:
            return {
                "is_match": True,
                "status": "VERIFIED",
                "message": f"Matches prescribed medicine: {med['salt_composition']} ({med['strength']})",
                "matched_prescription_entry": med
            }

    return {
        "is_match": False,
        "status": "MISMATCH",
        "message": (
            f"'{matched_drug['salt_composition']}' was NOT found in "
            f"{prescription.get('patient_name', 'the patient')}'s prescription "
            f"({prescription.get('prescription_id', 'unknown')}). "
            f"This could be the wrong medicine — please double-check before consumption."
        ),
        "matched_prescription_entry": None
    }
