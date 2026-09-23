from typing import Any, List, Optional

from pydantic import BaseModel, Field

from adherence.schemas import AdherenceSummary, DoseSlot

PERMISSION_KEYS = [
    "medication",
    "appointments",
    "tests",
    "dischargeSummary",
    "labReports",
    "fullHistory",
]


class Permissions(BaseModel):
    medication: bool = False
    appointments: bool = False
    tests: bool = False
    dischargeSummary: bool = False
    labReports: bool = False
    fullHistory: bool = False

    def as_dict(self) -> dict:
        return self.model_dump()


class CaregiverCreate(BaseModel):
    patient_id: str
    name: str
    relation: str
    phone: str = ""
    email: str = ""
    permissions: Permissions = Field(default_factory=Permissions)


class CaregiverUpdate(BaseModel):
    name: Optional[str] = None
    relation: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    permissions: Optional[Permissions] = None


class Caregiver(BaseModel):
    caregiver_id: str
    patient_id: str
    name: str
    relation: str
    phone: str = ""
    email: str = ""
    permissions: Permissions = Field(default_factory=Permissions)
    created_at: str = ""


class CaregiverDashboard(BaseModel):
    caregiver: Caregiver
    patient_id: str
    has_medication_access: bool
    medicines: List[Any] = Field(default_factory=list)
    today: List[DoseSlot] = Field(default_factory=list)
    overdue: List[DoseSlot] = Field(default_factory=list)
    adherence: Optional[AdherenceSummary] = None
