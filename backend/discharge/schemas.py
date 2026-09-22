from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class MedicineItem(BaseModel):
    id: str
    name: str
    strength: str = ""
    dose: str = ""
    frequency: str = ""
    timing: List[str] = Field(default_factory=list)
    duration: str = ""
    startDate: str = ""
    confirmed: bool = False


class TestItem(BaseModel):
    id: str
    name: str
    date: str = ""
    location: str = ""
    status: str = "upcoming"
    report: Optional[str] = None


class AppointmentItem(BaseModel):
    id: str
    title: str
    doctor: str = ""
    department: str = ""
    date: str = ""
    time: str = ""
    location: str = ""
    notes: str = ""
    completed: bool = False


class CareTaskItem(BaseModel):
    id: str
    title: str
    schedule: str = ""
    note: str = ""


class ExtractionResult(BaseModel):
    """Mirrors `extractionResult` in frontend/src/data/mockData.js."""

    medicines: List[MedicineItem] = Field(default_factory=list)
    tests: List[TestItem] = Field(default_factory=list)
    appointments: List[AppointmentItem] = Field(default_factory=list)
    careTasks: List[CareTaskItem] = Field(default_factory=list)
    notes: str = ""


class ExtractionResponse(ExtractionResult):
    draft_id: str
    patient_id: Optional[str] = None
    filename: str
    pages_read: int = 0
    ocr_used: bool = False
    source_text_preview: str = ""
    warnings: List[str] = Field(default_factory=list)


class ConfirmedPlan(ExtractionResult):
    patient_id: Optional[str] = None


class ConfirmResponse(BaseModel):
    draft_id: str
    patient_id: Optional[str] = None
    status: str
    activated_at: datetime
    medicines_activated: int
    prescription_synced: bool = False


class DraftRecord(BaseModel):
    draft_id: str
    patient_id: Optional[str] = None
    filename: str
    status: str
    created_at: datetime
