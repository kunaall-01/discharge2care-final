"""
Chemist Router
--------------
POST /api/chemist/verify         compare the prescribed medicine with what
                                 the chemist has and return a safety verdict.
POST /api/chemist/verify-photo   same, but the dispensed medicine is read off
                                 a wrapper photo (OCR -> drug identification).

The LLM is consulted only when a provider API key is present in the
environment; otherwise (or on any LLM failure) the deterministic drug-database
engine answers, so these endpoints always return 200 with a usable verdict.
"""

import logging

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from .llm import ask_llm
from .salt_engine import evaluate, strength_from_ocr_text
from .schemas import (
    VERDICT_UNSAFE_INCOMPATIBLE,
    ChemistVerifyRequest,
    MedicineInput,
    SaltAnalysis,
    SaltVerificationResult,
    StrengthAnalysis,
)

chemist_router = APIRouter(prefix="/chemist", tags=["Chemist"])
logger = logging.getLogger(__name__)

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/jpg", "image/webp"}
MAX_FILE_SIZE_MB = 8


@chemist_router.post("/verify", response_model=SaltVerificationResult)
async def verify_salt_equivalence(payload: ChemistVerifyRequest):
    result = await ask_llm(payload)
    return result if result is not None else evaluate(payload)


def _unreadable(ocr_text: str, warning: str) -> SaltVerificationResult:
    return SaltVerificationResult(
        verdict_code=VERDICT_UNSAFE_INCOMPATIBLE,
        is_safe_to_use=False,
        salt_analysis=SaltAnalysis(prescribed_salt="", available_salt="", salts_match=False),
        strength_analysis=StrengthAnalysis(prescribed_strength="", available_strength="", strengths_match=False),
        chemist_summary="The wrapper photo could not be matched to a medicine in our reference database.",
        patient_guidance=(
            "We could not read this wrapper, so nothing is confirmed. Type the medicine name and "
            "strength yourself, or ask the chemist to show you the salt name before taking it."
        ),
        identified=False,
        ocr_extracted_text=ocr_text or None,
        warning=warning,
    )


@chemist_router.post("/verify-photo", response_model=SaltVerificationResult)
async def verify_salt_equivalence_from_photo(
    file: UploadFile = File(..., description="Photo of the dispensed medicine wrapper/strip"),
    prescribed_name: str = Form(..., description="Prescribed medicine: brand or salt name"),
    prescribed_strength: str = Form(""),
    prescribed_form: str = Form(""),
):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}")

    image_bytes = await file.read()
    if len(image_bytes) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File too large. Max {MAX_FILE_SIZE_MB}MB.")
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")

    # Imported lazily: OCR needs OpenCV/Tesseract, which the unit tests stub out.
    from pill_verification.matching_service import identify_drug_from_text
    from pill_verification.ocr_service import extract_text_from_image

    try:
        ocr_text = extract_text_from_image(image_bytes)
    except Exception as error:  # missing tesseract binary, undecodable image, ...
        logger.warning("Wrapper OCR failed: %s", error)
        ocr_text = ""

    match = identify_drug_from_text(ocr_text) if ocr_text else None
    if not match:
        return _unreadable(
            ocr_text,
            "Could not confidently identify this medicine from the wrapper photo. "
            "Try a clearer, well-lit, close-up photo of the printed name/salt on the strip.",
        )

    drug = match["matched_drug"]
    strength_mg = strength_from_ocr_text(ocr_text, drug)

    payload = ChemistVerifyRequest(
        prescribed_medicine=MedicineInput(
            name=prescribed_name, strength=prescribed_strength, form=prescribed_form
        ),
        available_medicine=MedicineInput(
            name=drug["salt_composition"],
            strength=f"{strength_mg:g}mg" if strength_mg is not None else "",
        ),
    )

    result = await ask_llm(payload)
    if result is None:
        result = evaluate(payload)

    result.identified = True
    result.confidence = match["confidence"]
    result.ocr_extracted_text = ocr_text or None
    return result
