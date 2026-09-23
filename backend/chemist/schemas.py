from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

VERDICT_EXACT_BRAND_MATCH = "EXACT_BRAND_MATCH"
VERDICT_SAFE_GENERIC_SUBSTITUTE = "SAFE_GENERIC_SUBSTITUTE"
VERDICT_DOSAGE_MISMATCH = "DOSAGE_MISMATCH"
VERDICT_UNSAFE_INCOMPATIBLE = "UNSAFE_INCOMPATIBLE"

VERDICT_CODES = (
    VERDICT_EXACT_BRAND_MATCH,
    VERDICT_SAFE_GENERIC_SUBSTITUTE,
    VERDICT_DOSAGE_MISMATCH,
    VERDICT_UNSAFE_INCOMPATIBLE,
)

# Only these verdicts clear the medicine for use.
SAFE_VERDICTS = frozenset({VERDICT_EXACT_BRAND_MATCH, VERDICT_SAFE_GENERIC_SUBSTITUTE})


def is_safe_verdict(verdict_code: str) -> bool:
    return verdict_code in SAFE_VERDICTS


class MedicineInput(BaseModel):
    """One side of the comparison. `name` may be a brand or a salt name."""

    name: str = Field(min_length=1, description="Brand or salt name as printed on the strip")
    strength: str = Field("", description="e.g. 500mg, 40 mg, 0.5g")
    form: str = Field("", description="tablet | capsule | syrup | injection ...")
    manufacturer: str = ""

    @model_validator(mode="before")
    @classmethod
    def accept_a_bare_name(cls, data):
        # Callers may send "Pantocid 40mg" instead of a structured object.
        return {"name": data} if isinstance(data, str) else data


class ChemistVerifyRequest(BaseModel):
    prescribed_medicine: MedicineInput
    available_medicine: MedicineInput


class SaltAnalysis(BaseModel):
    prescribed_salt: str
    available_salt: str
    salts_match: bool


class StrengthAnalysis(BaseModel):
    prescribed_strength: str
    available_strength: str
    strengths_match: bool


class SaltVerificationResult(BaseModel):
    # Extra keys are ignored so an LLM answer with additional fields still validates.
    model_config = ConfigDict(extra="ignore")

    verdict_code: str
    is_safe_to_use: bool
    salt_analysis: SaltAnalysis
    strength_analysis: StrengthAnalysis
    chemist_summary: str
    patient_guidance: str
    source: str = Field("local", description="llm | local")
    # Only set by the wrapper-photo route.
    identified: bool = True
    confidence: Optional[float] = None
    ocr_extracted_text: Optional[str] = None
    warning: Optional[str] = None
