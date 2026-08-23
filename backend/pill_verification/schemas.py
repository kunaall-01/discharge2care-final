from pydantic import BaseModel
from typing import Optional, List


class DrugInfo(BaseModel):
    id: str
    brand_names: List[str]
    salt_composition: str
    strength: str
    category: str
    uses: List[str]
    side_effects: List[str]
    common_dosage: str


class PrescriptionMatch(BaseModel):
    is_match: bool
    status: str
    message: str
    matched_prescription_entry: Optional[dict] = None


class VerifyResponse(BaseModel):
    ocr_extracted_text: str
    identified: bool
    confidence: Optional[float] = None
    drug_info: Optional[DrugInfo] = None
    prescription_check: Optional[PrescriptionMatch] = None
    warning: Optional[str] = None
