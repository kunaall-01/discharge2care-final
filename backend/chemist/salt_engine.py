"""
Salt Equivalence Engine
-----------------------
Deterministic comparison of two medicines using the local drug reference
database (the same JSON the pill-verification OCR path matches against).

This is the fallback for `POST /api/chemist/verify` when no LLM API key is
configured, and it must never raise: the endpoint has to keep answering on a
keyless deploy.
"""

import re
from typing import Dict, List, Optional

from pill_verification.matching_service import _load_drug_db, _normalize, _similarity

from .schemas import (
    VERDICT_DOSAGE_MISMATCH,
    VERDICT_EXACT_BRAND_MATCH,
    VERDICT_SAFE_GENERIC_SUBSTITUTE,
    VERDICT_UNSAFE_INCOMPATIBLE,
    ChemistVerifyRequest,
    SaltAnalysis,
    SaltVerificationResult,
    StrengthAnalysis,
    is_safe_verdict,
)

# Everything is compared in milligrams so "0.5g" == "500mg".
UNIT_TO_MG = {"mg": 1.0, "mcg": 0.001, "ug": 0.001, "g": 1000.0}
STRENGTH_RE = re.compile(r"(\d+(?:[.,]\d+)?)\s*(mg|mcg|ug|g|ml|iu|%)\b", re.IGNORECASE)
BARE_TRAILING_NUMBER_RE = re.compile(r"\b(\d{2,4})\s*$")

FORM_ALIASES = {
    "tab": "tablet", "tabs": "tablet", "tablet": "tablet", "tablets": "tablet",
    "dt": "tablet", "od": "tablet", "sr": "tablet", "er": "tablet", "mr": "tablet",
    "cap": "capsule", "caps": "capsule", "capsule": "capsule", "capsules": "capsule",
    "syp": "syrup", "susp": "syrup", "syrup": "syrup", "suspension": "syrup",
    "inj": "injection", "injection": "injection",
    "drops": "drops", "drop": "drops",
}
FORM_WORDS = set(FORM_ALIASES)

FUZZY_THRESHOLD = 0.86


def parse_strength_mg(text: str) -> Optional[float]:
    """Return the dose in milligrams, or None when it is not a mass dose."""
    if not text:
        return None
    match = STRENGTH_RE.search(text)
    if match:
        value = float(match.group(1).replace(",", "."))
        unit = match.group(2).lower()
        factor = UNIT_TO_MG.get(unit)
        return round(value * factor, 4) if factor else None

    # Branded strengths are often bare numbers: "Dolo 650", "Atorva 10".
    bare = BARE_TRAILING_NUMBER_RE.search(text.strip())
    return float(bare.group(1)) if bare else None


def display_strength(mg: Optional[float], raw: str) -> str:
    if mg is None:
        return (raw or "").strip()
    if mg == int(mg):
        return f"{int(mg)} mg"
    return f"{mg:g} mg"


def strength_from_ocr_text(text: str, drug: dict) -> Optional[float]:
    """Read the dispensed strength off wrapper text.

    Brand names often carry it ("DOLO 650"); otherwise the first printed
    mass dose wins, and the reference record is the last resort.
    """
    normalized = _normalize(text)
    for candidate in drug["brand_names"] + [drug["salt_composition"]]:
        candidate_norm = _normalize(candidate).strip()
        if candidate_norm and candidate_norm in normalized:
            mg = parse_strength_mg(candidate)
            if mg is not None:
                return mg

    mg = parse_strength_mg(text)
    return mg if mg is not None else parse_strength_mg(drug["strength"])


def normalize_form(text: str) -> str:
    token = _normalize(text).split()
    if not token:
        return ""
    return FORM_ALIASES.get(token[0].lower(), token[0].lower())


def _strip_noise(name: str) -> str:
    """Drop strength, dosage-form and pack words so what is left is the salt/brand."""
    text = STRENGTH_RE.sub(" ", name)
    text = re.sub(r"\b\d+(?:[.,]\d+)?\b", " ", text)
    tokens = [t for t in _normalize(text).split() if t not in FORM_WORDS]
    return " ".join(tokens).strip()


def _salt_tokens(salt: str) -> List[str]:
    parts = re.split(r"[+/,\s]+", salt.upper())
    return sorted({p.strip() for p in parts if p.strip()})


def salts_equivalent(a: str, b: str) -> bool:
    """Handles combination salts, where the order on the strip varies."""
    if not a or not b:
        return False
    return _salt_tokens(a) == _salt_tokens(b)


def _lookup(name: str) -> Optional[dict]:
    """Match a name against the drug database: brand names first, then salts."""
    db = _load_drug_db()
    target = _normalize(name).strip()
    if not target:
        return None

    for drug in db["drugs"]:
        for candidate in drug["brand_names"] + [drug["salt_composition"]]:
            if _normalize(candidate).strip() == target:
                return drug

    best_drug, best_score = None, 0.0
    for drug in db["drugs"]:
        for candidate in drug["brand_names"] + [drug["salt_composition"]]:
            score = _similarity(_normalize(candidate).strip(), target)
            if score > best_score:
                best_drug, best_score = drug, score

    return best_drug if best_score >= FUZZY_THRESHOLD else None


def _lookup_name(name: str) -> Optional[dict]:
    """Look the name up as written, then again with any strength suffix removed.

    Counter staff type "Calpol 500mg"; the database knows the brand as "Calpol".
    """
    drug = _lookup(name)
    if drug is not None:
        return drug

    trimmed = BARE_TRAILING_NUMBER_RE.sub("", STRENGTH_RE.sub(" ", name)).strip()
    return _lookup(trimmed) if trimmed and trimmed != name.strip() else None


def resolve(medicine) -> Dict:
    """Reduce one input to the salt, strength, form and drug record we could find."""
    drug = _lookup_name(medicine.name)

    strength_raw = (medicine.strength or "").strip()
    strength_mg = parse_strength_mg(strength_raw)
    if strength_mg is None:
        # Strengths hide in brand names ("Dolo 650") before we fall back to the
        # reference record, which only carries a typical strength.
        strength_mg = parse_strength_mg(medicine.name)
    if strength_mg is None and drug:
        strength_mg = parse_strength_mg(drug["strength"])

    salt = drug["salt_composition"] if drug else _strip_noise(medicine.name).title()

    return {
        "salt": salt,
        "strength_mg": strength_mg,
        "strength_display": display_strength(strength_mg, strength_raw or (drug or {}).get("strength", "")),
        "form": normalize_form(medicine.form),
        "name_key": _normalize(medicine.name).strip(),
        "in_database": drug is not None,
    }


def strengths_equivalent(a: Optional[float], b: Optional[float], a_raw: str, b_raw: str) -> bool:
    if a is not None and b is not None:
        return abs(a - b) <= max(0.01, 0.01 * max(a, b))
    if a is None and b is None:
        return _normalize(a_raw) == _normalize(b_raw) and bool(a_raw.strip())
    return False


def _summary(verdict: str, prescribed: Dict, available: Dict, form_note: str) -> str:
    p_salt = prescribed["salt"] or prescribed["name_key"].title()
    a_salt = available["salt"] or available["name_key"].title()
    p_dose = prescribed["strength_display"] or "unknown strength"
    a_dose = available["strength_display"] or "unknown strength"

    if verdict == VERDICT_EXACT_BRAND_MATCH:
        text = (
            f"Same product as prescribed: {a_salt} {a_dose}. "
            f"Both the salt and the strength match the prescription."
        )
    elif verdict == VERDICT_SAFE_GENERIC_SUBSTITUTE:
        text = (
            f"{a_salt} {a_dose} contains the same salt at the same strength as the "
            f"prescribed {p_salt} {p_dose} — a brand/generic substitute, not a different medicine."
        )
    elif verdict == VERDICT_DOSAGE_MISMATCH:
        text = (
            f"Same salt ({p_salt}) but a different strength: prescribed {p_dose}, "
            f"available {a_dose}. The dose would have to be adjusted to use this pack."
        )
    else:
        text = (
            f"Different salt: prescribed {p_salt}, available {a_salt}. "
            f"These are not interchangeable."
        )

    if not available["in_database"] or not prescribed["in_database"]:
        text += " One or both names are not in our reference database, so this is based on the text you entered."
    return text + form_note


def _guidance(verdict: str, prescribed: Dict) -> str:
    asked = f"{prescribed['salt'] or prescribed['name_key'].title()} {prescribed['strength_display']}".strip()

    if verdict == VERDICT_EXACT_BRAND_MATCH:
        return "This is the medicine your doctor prescribed. Take it exactly as directed."
    if verdict == VERDICT_SAFE_GENERIC_SUBSTITUTE:
        return (
            "Safe to use. It has the same salt and strength, so keep the same dose and timing "
            "your doctor gave you."
        )
    if verdict == VERDICT_DOSAGE_MISMATCH:
        return (
            "Do not start this pack on your own. Ask the chemist for the "
            f"{asked} strip, or check with your doctor/pharmacist before taking a different strength."
        )
    return (
        f"Do not take this medicine. It is not what was prescribed. Ask the chemist for {asked}, "
        "or call your doctor if it is unavailable."
    )


def evaluate(request: ChemistVerifyRequest) -> SaltVerificationResult:
    prescribed = resolve(request.prescribed_medicine)
    available = resolve(request.available_medicine)

    salts_match = salts_equivalent(prescribed["salt"], available["salt"])
    strengths_match = strengths_equivalent(
        prescribed["strength_mg"], available["strength_mg"],
        prescribed["strength_display"], available["strength_display"],
    )

    # The same product name on both sides means the chemist is handing back
    # exactly what was prescribed; two different brands of one salt do not.
    same_product = bool(prescribed["name_key"]) and prescribed["name_key"] == available["name_key"]

    if not salts_match:
        verdict = VERDICT_UNSAFE_INCOMPATIBLE
    elif not strengths_match:
        verdict = VERDICT_DOSAGE_MISMATCH
    elif same_product:
        verdict = VERDICT_EXACT_BRAND_MATCH
    else:
        verdict = VERDICT_SAFE_GENERIC_SUBSTITUTE

    form_note = ""
    if (
        prescribed["form"] and available["form"]
        and prescribed["form"] != available["form"]
    ):
        form_note = (
            f" Note: the dosage form differs ({prescribed['form']} vs {available['form']}), "
            "which can change how the dose is taken."
        )

    return SaltVerificationResult(
        verdict_code=verdict,
        is_safe_to_use=is_safe_verdict(verdict),
        salt_analysis=SaltAnalysis(
            prescribed_salt=prescribed["salt"],
            available_salt=available["salt"],
            salts_match=salts_match,
        ),
        strength_analysis=StrengthAnalysis(
            prescribed_strength=prescribed["strength_display"],
            available_strength=available["strength_display"],
            strengths_match=strengths_match,
        ),
        chemist_summary=_summary(verdict, prescribed, available, form_note),
        patient_guidance=_guidance(verdict, prescribed),
        source="local",
    )
