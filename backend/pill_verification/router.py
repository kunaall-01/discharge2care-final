"""
Pill Verification Router
-------------------------
Plugs into the existing Discharge2Care FastAPI app. Reuses the same
MongoDB connection (`db`) that server.py already creates — no separate
database connection is opened here.

To wire this in, server.py needs to:
  1. import this router
  2. include it under api_router (so it inherits the /api prefix)
  3. pass the existing `db` object in via a dependency

See INTEGRATION.md for the exact 3 lines to add to server.py.
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from typing import Optional

from .ocr_service import extract_text_from_image
from .matching_service import (
    identify_drug_from_text,
    get_prescription,
    verify_against_prescription,
)
from .schemas import VerifyResponse, PrescriptionMatch

pill_router = APIRouter(prefix="/pill", tags=["Pill Verification"])

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/jpg", "image/webp"}
MAX_FILE_SIZE_MB = 8


@pill_router.post("/verify", response_model=VerifyResponse)
async def verify_pill(
    request: Request,
    file: UploadFile = File(..., description="Photo of the medicine wrapper/strip"),
    patient_id: Optional[str] = Form(None, description="Patient ID to check prescription against"),
    prescription_id: Optional[str] = Form(None, description="Prescription ID (alternative to patient_id)"),
):
    """
    Upload a photo of a medicine wrapper. Returns the identified drug's
    salt composition, uses, side effects — and, if patient_id or
    prescription_id is given, whether it matches the doctor's prescription
    stored in MongoDB.
    """
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}")

    image_bytes = await file.read()
    if len(image_bytes) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File too large. Max {MAX_FILE_SIZE_MB}MB.")
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")

    # Step 1: OCR
    ocr_text = extract_text_from_image(image_bytes)

    # Step 2: Identify drug (local JSON reference data)
    match_result = identify_drug_from_text(ocr_text)

    if not match_result:
        return VerifyResponse(
            ocr_extracted_text=ocr_text,
            identified=False,
            warning=(
                "Could not confidently identify this medicine from the wrapper photo. "
                "Try a clearer, well-lit, close-up photo of the printed name/salt on the strip."
            ),
        )

    drug = match_result["matched_drug"]
    confidence = match_result["confidence"]

    response = VerifyResponse(
        ocr_extracted_text=ocr_text,
        identified=True,
        confidence=confidence,
        drug_info=drug,
    )

    # Step 3: Optional prescription check — reads from MongoDB
    if patient_id or prescription_id:
        db = request.app.state.db  # same Motor db instance server.py created
        prescription = await get_prescription(db, patient_id=patient_id, prescription_id=prescription_id)
        if not prescription:
            response.warning = "No prescription found for the given patient_id/prescription_id."
        else:
            response.prescription_check = PrescriptionMatch(**verify_against_prescription(drug, prescription))

    return response


@pill_router.get("/prescription/{patient_id}")
async def get_patient_prescription(patient_id: str, request: Request):
    """Fetch a patient's current prescription from MongoDB (for reference/debugging)."""
    db = request.app.state.db
    prescription = await get_prescription(db, patient_id=patient_id)
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found for this patient.")
    return prescription
