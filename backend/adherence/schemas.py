from typing import List, Optional

from pydantic import BaseModel, Field

from .schedule import RECORDED_STATUSES


class DoseEventCreate(BaseModel):
    patient_id: str
    medicine_id: str
    medicine_name: str = ""
    date: str = Field(description="YYYY-MM-DD")
    time: str = Field(description="HH:MM, the scheduled slot being recorded")
    status: str = Field(description="taken | missed | skipped")
    note: str = ""

    def validated_status(self) -> str:
        return self.status if self.status in RECORDED_STATUSES else ""


class DoseSlot(BaseModel):
    medicine_id: str
    medicine_name: str = ""
    strength: str = ""
    date: str
    time: str
    status: str
    event_id: Optional[str] = None


class ScheduleResponse(BaseModel):
    patient_id: str
    date: str
    slots: List[DoseSlot] = Field(default_factory=list)
    overdue: List[DoseSlot] = Field(default_factory=list)


class AdherenceSummary(BaseModel):
    patient_id: str
    window_days: int
    taken: int = 0
    missed: int = 0
    skipped: int = 0
    overdue: int = 0
    upcoming: int = 0
    adherence_pct: Optional[float] = None
    overdue_slots: List[DoseSlot] = Field(default_factory=list)
