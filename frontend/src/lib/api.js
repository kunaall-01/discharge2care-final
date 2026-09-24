import axios from "axios";

const rawBase = process.env.REACT_APP_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: `${rawBase.replace(/\/+$/, "")}/api`,
  timeout: 90000,
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

/** Minutes east of UTC for the viewer, e.g. +330 for IST. The backend judges
 *  "overdue" against the patient's wall clock, not UTC. */
export function tzOffsetMinutes() {
  return -new Date().getTimezoneOffset();
}

/** Today's (or a given day's) dose slots with taken/missed/overdue status. */
export async function getAdherenceSchedule(patientId, { date } = {}) {
  const params = { tz_offset_minutes: tzOffsetMinutes() };
  if (date) params.date = date;
  const { data } = await api.get(
    `/adherence/patient/${encodeURIComponent(patientId)}/schedule`,
    { params }
  );
  return data;
}

/** Record one dose as taken / missed / skipped. */
export async function recordDose({ patientId, medicineId, medicineName, date, time, status }) {
  const { data } = await api.post("/adherence/dose", {
    patient_id: patientId,
    medicine_id: medicineId,
    medicine_name: medicineName,
    date,
    time,
    status,
  });
  return data;
}

/** Adherence % and overdue doses over a rolling window. */
export async function getAdherenceSummary(patientId, { days = 7 } = {}) {
  const { data } = await api.get(
    `/adherence/patient/${encodeURIComponent(patientId)}/summary`,
    { params: { days, tz_offset_minutes: tzOffsetMinutes() } }
  );
  return data;
}

export async function listCaregivers(patientId) {
  const { data } = await api.get(`/caregivers/patient/${encodeURIComponent(patientId)}`);
  return data;
}

export async function linkCaregiver({ patientId, name, relation, phone, email, permissions }) {
  const { data } = await api.post("/caregivers/", {
    patient_id: patientId,
    name,
    relation,
    phone: phone || "",
    email: email || "",
    permissions: permissions || {},
  });
  return data;
}

export async function updateCaregiver(caregiverId, patch) {
  const { data } = await api.patch(`/caregivers/${encodeURIComponent(caregiverId)}`, patch);
  return data;
}

export async function removeCaregiver(caregiverId) {
  const { data } = await api.delete(`/caregivers/${encodeURIComponent(caregiverId)}`);
  return data;
}

/** What a given caregiver is allowed to see, plus live adherence/overdue. */
export async function getCaregiverDashboard(caregiverId) {
  const { data } = await api.get(
    `/caregivers/${encodeURIComponent(caregiverId)}/dashboard`,
    { params: { tz_offset_minutes: tzOffsetMinutes() } }
  );
  return data;
}

/**
 * Compare the prescribed medicine with the one the chemist is handing over.
 * Returns the backend SaltVerificationResult shape:
 * { verdict_code, is_safe_to_use, salt_analysis, strength_analysis,
 *   chemist_summary, patient_guidance, source }
 */
export async function verifySaltEquivalence({ prescribed, available }) {
  const side = (m) => ({
    name: m.name,
    strength: m.strength || "",
    form: m.form || "",
    manufacturer: m.manufacturer || "",
  });
  const { data } = await api.post("/chemist/verify", {
    prescribed_medicine: side(prescribed),
    available_medicine: side(available),
  });
  return data;
}

/**
 * Same salt-equivalence check, but the dispensed medicine is read from a
 * wrapper photo: the backend runs OCR + drug identification, then compares.
 */
export async function verifySaltEquivalenceFromPhoto(file, prescribed) {
  const form = new FormData();
  form.append("file", file);
  form.append("prescribed_name", prescribed.name);
  form.append("prescribed_strength", prescribed.strength || "");
  form.append("prescribed_form", prescribed.form || "");

  const { data } = await api.post("/chemist/verify-photo", form);
  return data;
}

/** Turn any axios/thrown error into a single-line, user-safe message. */export function errorMessage(err) {
  const detail = err?.response?.data?.detail;
  if (detail) return typeof detail === "string" ? detail : JSON.stringify(detail);
  if (err?.code === "ECONNABORTED") return "Request timed out. The server may be cold-starting.";
  if (!err?.response) return "Cannot reach the backend. Check REACT_APP_API_URL and CORS_ORIGINS.";
  return `Request failed (${err.response.status}).`;
}
