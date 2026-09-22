"""
Discharge Summary Router
------------------------
POST /api/discharge/extract      upload a PDF/photo, get a structured draft
GET  /api/discharge/draft/{id}   reload a saved draft
POST /api/discharge/{id}/confirm patient approved the draft -> activate plan

Reuses the Motor client that server.py already created (passed in via
request.app.state.db) rather than opening a second connection.

Confirming also upserts into db.prescriptions, which is the collection
pill_verification already reads — so a verified discharge summary makes
Chemist Pill Verification work against real data for that patient.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile

from .document_text import extract_document_text
from .extractor import extract_structured
from .schemas import ConfirmResponse, ConfirmedPlan, ExtractionResponse

discharge_router = APIRouter(prefix="/discharge", tags=["Discharge Summary"])
logger = logging.getLogger(__name__)

ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
}
MAX_FILE_SIZE_MB = 10


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@discharge_router.post("/extract", response_model=ExtractionResponse)
async def extract_discharge_summary(
    request: Request,
    file: UploadFile = File(..., description="Discharge summary as PDF or photo"),
    patient_id: Optional[str] = Form(None),
):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file type: {file.content_type}. "
                "Upload a PDF, JPEG, PNG or WEBP."
            ),
        )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")
    if len(file_bytes) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max {MAX_FILE_SIZE_MB}MB."
        )

    try:
        text, pages_read, ocr_used = extract_document_text(file_bytes, file.content_type)
    except Exception as exc:
        logger.warning("Could not read uploaded document: %s", exc)
        raise HTTPException(
            status_code=400,
            detail=(
                "Could not read this file. It may be corrupted, password-protected, "
                "or in a format we cannot open (HEIC is not supported — convert to JPEG/PNG)."
            ),
        )

    if not text.strip():
        raise HTTPException(
            status_code=422,
            detail=(
                "No readable text found in this document. If it is a scan or photo, "
                "retake it in good light with the page flat and filling the frame."
            ),
        )

    result = extract_structured(text)

    warnings: List[str] = []
    if not result["medicines"]:
        warnings.append("No medicines detected — add them manually on the review screen.")
    if not result["tests"]:
        warnings.append("No tests detected.")
    if not result["appointments"]:
        warnings.append("No follow-up appointments detected.")
    if ocr_used:
        warnings.append("Some pages were scanned images and were read with OCR; check accuracy carefully.")

    draft_id = str(uuid.uuid4())
    db = request.app.state.db

    await db.discharge_drafts.insert_one({
        "draft_id": draft_id,
        "patient_id": patient_id,
        "filename": file.filename or "upload",
        "status": "draft",
        "created_at": _utc_now_iso(),
        "source_text": text,
        "pages_read": pages_read,
        "ocr_used": ocr_used,
        "result": result,
    })

    return ExtractionResponse(
        draft_id=draft_id,
        patient_id=patient_id,
        filename=file.filename or "upload",
        pages_read=pages_read,
        ocr_used=ocr_used,
        source_text_preview=text.strip()[:600],
        warnings=warnings,
        **result,
    )


@discharge_router.get("/draft/{draft_id}")
async def get_draft(draft_id: str, request: Request):
    db = request.app.state.db
    draft = await db.discharge_drafts.find_one(
        {"draft_id": draft_id}, {"_id": 0, "source_text": 0}
    )
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found.")
    return draft


@discharge_router.post("/{draft_id}/confirm", response_model=ConfirmResponse)
async def confirm_discharge_summary(
    draft_id: str,
    plan: ConfirmedPlan,
    request: Request,
):
    """
    Called when the patient approves the reviewed extraction. Persists the
    plan as active and syncs the medicines into db.prescriptions.
    """
    db = request.app.state.db

    existing = await db.discharge_drafts.find_one(
        {"draft_id": draft_id}, {"_id": 0, "patient_id": 1, "status": 1}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Draft not found.")

    patient_id = plan.patient_id or existing.get("patient_id")
    activated_at = datetime.now(timezone.utc)

    await db.discharge_drafts.update_one(
        {"draft_id": draft_id},
        {"$set": {
            "status": "active",
            "activated_at": activated_at.isoformat(),
            "confirmed_plan": plan.model_dump(),
        }},
    )

    prescription_synced = False
    if patient_id and plan.medicines:
        prescription_id = f"RX-{draft_id[:8].upper()}"
        await db.prescriptions.update_one(
            {"patient_id": patient_id},
            {"$set": {
                "prescription_id": prescription_id,
                "patient_id": patient_id,
                "doctor_name": "",
                "date_issued": activated_at.date().isoformat(),
                "source_draft_id": draft_id,
                "medicines": [
                    {
                        "drug_id": medicine.id,
                        "salt_composition": medicine.name,
                        "strength": (medicine.strength or "").replace(" ", ""),
                        "dosage": medicine.dose or medicine.frequency,
                        "frequency": medicine.frequency,
                        "duration": medicine.duration,
                    }
                    for medicine in plan.medicines
                ],
            }},
            upsert=True,
        )
        prescription_synced = True

    return ConfirmResponse(
        draft_id=draft_id,
        patient_id=patient_id,
        status="active",
        activated_at=activated_at,
        medicines_activated=len(plan.medicines),
        prescription_synced=prescription_synced,
    )
