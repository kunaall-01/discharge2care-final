import axios from "axios";

const rawBase = process.env.REACT_APP_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: `${rawBase.replace(/\/+$/, "")}/api`,
  timeout: 45000,
});

/**
 * POST a wrapper photo to the OCR + drug-identification endpoint.
 * Returns the backend VerifyResponse shape:
 * { ocr_extracted_text, identified, confidence, drug_info, prescription_check, warning }
 */
export async function verifyPill(file, { patientId, prescriptionId } = {}) {
  const form = new FormData();
  form.append("file", file);
  if (patientId) form.append("patient_id", patientId);
  if (prescriptionId) form.append("prescription_id", prescriptionId);

  const { data } = await api.post("/pill/verify", form);
  return data;
}

/**
 * POST a discharge summary (PDF or photo). Returns the extraction draft the
 * review screen renders, plus the draft_id needed to confirm it later.
 */
export async function extractDischargeSummary(file, { patientId } = {}) {
  const form = new FormData();
  form.append("file", file);
  if (patientId) form.append("patient_id", patientId);

  const { data } = await api.post("/discharge/extract", form);
  return data;
}

/** Patient approved the reviewed extraction — activates the plan. */
export async function confirmDischargeSummary(draftId, plan) {
  const { data } = await api.post(
    `/discharge/${encodeURIComponent(draftId)}/confirm`,
    plan
  );
  return data;
}

/** Turn any axios/thrown error into a single-line, user-safe message. */
export function errorMessage(err) {
  const detail = err?.response?.data?.detail;
  if (detail) return typeof detail === "string" ? detail : JSON.stringify(detail);
  if (err?.code === "ECONNABORTED") return "Request timed out. The server may be cold-starting.";
  if (!err?.response) return "Cannot reach the backend. Check REACT_APP_API_URL and CORS_ORIGINS.";
  return `Request failed (${err.response.status}).`;
}
