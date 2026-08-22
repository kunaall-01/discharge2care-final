// Synthetic demo data — Ramesh Sharma
export const demoPatient = {
  id: "pt-001",
  name: "Ramesh Sharma",
  age: 62,
  gender: "Male",
  bloodGroup: "B+",
  mobile: "+91 98765 43210",
  hospital: "Sunrise Multi-Specialty Hospital",
  admittedDate: "2026-02-08",
  dischargedDate: "2026-02-12",
  diagnosis: "Post-operative recovery — cholecystectomy (gall bladder)",
  allergies: ["Sulfa drugs"],
  emergencyContact: { name: "Sita Sharma", relation: "Wife", phone: "+91 98765 43211" },
};

export const demoDoctor = {
  id: "dr-001",
  name: "Dr. Anand Verma",
  specialty: "General Surgery",
  hospital: "Sunrise Multi-Specialty Hospital",
  regNo: "MCI-58201",
};

export const initialMedicines = [
  { id: "m1", name: "Pantoprazole", strength: "40 mg", dose: "1 tablet", frequency: "1 time/day", timing: ["08:00"], duration: "10 days", startDate: "2026-02-12", stockStart: 10, stockRemaining: 6, confirmed: true },
  { id: "m2", name: "Paracetamol", strength: "500 mg", dose: "1 tablet", frequency: "2 times/day", timing: ["09:00", "21:00"], duration: "5 days", startDate: "2026-02-12", stockStart: 10, stockRemaining: 4, confirmed: true },
  { id: "m3", name: "Cefixime", strength: "200 mg", dose: "1 capsule", frequency: "2 times/day", timing: ["10:00", "22:00"], duration: "7 days", startDate: "2026-02-12", stockStart: 14, stockRemaining: 8, confirmed: true },
  { id: "m4", name: "Domperidone", strength: "10 mg", dose: "1 tablet", frequency: "3 times/day", timing: ["08:30", "13:30", "20:30"], duration: "5 days", startDate: "2026-02-12", stockStart: 15, stockRemaining: 6, confirmed: true },
  { id: "m5", name: "Multivitamin", strength: "1 tablet", dose: "1 tablet", frequency: "1 time/day", timing: ["14:00"], duration: "30 days", startDate: "2026-02-12", stockStart: 30, stockRemaining: 24, confirmed: true },
];

export const initialTests = [
  { id: "t1", name: "Complete Blood Count (CBC)", date: "2026-02-17", location: "Sunrise Diagnostics", status: "upcoming", report: null },
  { id: "t2", name: "Liver Function Test (LFT)", date: "2026-02-20", location: "Sunrise Diagnostics", status: "upcoming", report: null },
];

export const initialAppointments = [
  { id: "a1", title: "Post-op Follow-up", doctor: "Dr. Anand Verma", department: "General Surgery", date: "2026-02-24", time: "11:00", location: "Sunrise Multi-Specialty, OPD-3", checklist: ["Carry discharge summary", "Carry latest reports", "Review current medicine list", "Arrange transport"], notes: "", completed: false },
];

export const initialFamily = [
  { id: "f1", name: "Aarav Sharma", relation: "Son", phone: "+91 98111 22233", responsibilities: ["Medicines", "Appointments"], permissions: { medication: true, appointments: true, tests: false, dischargeSummary: true, labReports: false, fullHistory: false }, avatar: "AS" },
  { id: "f2", name: "Priya Sharma", relation: "Daughter", phone: "+91 98111 33344", responsibilities: ["Tests", "Transport"], permissions: { medication: false, appointments: true, tests: true, dischargeSummary: true, labReports: true, fullHistory: false }, avatar: "PS" },
  { id: "f3", name: "Sita Sharma", relation: "Wife", phone: "+91 98765 43211", responsibilities: ["Daily Care"], permissions: { medication: true, appointments: true, tests: true, dischargeSummary: true, labReports: true, fullHistory: true }, avatar: "SS" },
];

export const initialTasks = [
  { id: "tk1", title: "Give Pantoprazole 8:00 AM", type: "medicine", assignee: "f1", status: "pending", dueTime: "08:00", note: "" },
  { id: "tk2", title: "Book CBC lab appointment", type: "test", assignee: "f2", status: "pending", dueTime: "18:00", note: "" },
  { id: "tk3", title: "Arrange transport for follow-up", type: "transport", assignee: "f1", status: "in-progress", dueTime: "10:00", note: "Cab booked, awaiting confirmation" },
  { id: "tk4", title: "Wound dressing", type: "care", assignee: "f3", status: "pending", dueTime: "18:00", note: "" },
];

export const initialCareTasks = [
  { id: "c1", title: "Wound dressing", schedule: "Daily at 6:00 PM", note: "Keep incision area dry" },
  { id: "c2", title: "Light walking", schedule: "20 min twice/day", note: "Avoid strenuous activity" },
];

export const initialNotifications = [
  { id: "n1", type: "medicine", title: "Medicine reminder", body: "Pantoprazole at 8:00 AM", time: "08:00", read: false, severity: "info" },
  { id: "n2", type: "appointment", title: "Appointment tomorrow", body: "Follow-up with Dr. Verma 11:00 AM", time: "09:30", read: false, severity: "info" },
  { id: "n3", type: "family", title: "Family task assigned", body: "Aarav — Give Pantoprazole", time: "07:45", read: true, severity: "info" },
  { id: "n4", type: "stock", title: "Refill soon", body: "Paracetamol — 2 days remaining", time: "yesterday", read: true, severity: "warning" },
];

export const otcDataset = [
  { name: "Ibuprofen", conflictsWith: ["Pantoprazole"], note: "May reduce GI protection when combined with certain PPIs. Verify with clinician." },
  { name: "Aspirin", conflictsWith: ["Cefixime"], note: "Antibiotic interaction possible. Please confirm with pharmacist." },
  { name: "Cetirizine", conflictsWith: [], note: "" },
  { name: "Vitamin C", conflictsWith: [], note: "" },
  { name: "Antacid", conflictsWith: ["Cefixime"], note: "May reduce absorption of certain antibiotics." },
];

export const pillDatabase = [
  { name: "Paracetamol", strength: "500 mg", manufacturer: "GSK" },
  { name: "Pantoprazole", strength: "40 mg", manufacturer: "Sun Pharma" },
  { name: "Cefixime", strength: "200 mg", manufacturer: "Cipla" },
  { name: "Domperidone", strength: "10 mg", manufacturer: "Torrent" },
];

// Extraction "AI" result that appears when demo upload runs
export const extractionResult = {
  medicines: initialMedicines.map((m) => ({ ...m, confirmed: false })),
  tests: initialTests,
  appointments: initialAppointments,
  careTasks: initialCareTasks,
  notes: "Continue soft diet for 5 days. Avoid lifting > 5 kg for 2 weeks.",
};

// Doctor-side patient list
export const doctorPatientList = [
  { id: "pt-001", name: "Ramesh Sharma", age: 62, dischargeDate: "2026-02-12", carePlan: "Active", family: 3, upcoming: "Follow-up 24 Feb", status: "on-track", lastActivity: "Medicine confirmed 09:02 AM" },
  { id: "pt-002", name: "Meena Iyer", age: 55, dischargeDate: "2026-02-10", carePlan: "Active", family: 2, upcoming: "LFT 19 Feb", status: "needs-attention", lastActivity: "Task unconfirmed" },
  { id: "pt-003", name: "Karan Malhotra", age: 47, dischargeDate: "2026-02-09", carePlan: "Active", family: 4, upcoming: "MRI 22 Feb", status: "on-track", lastActivity: "Report uploaded" },
  { id: "pt-004", name: "Fatima Khan", age: 68, dischargeDate: "2026-02-08", carePlan: "Awaiting", family: 1, upcoming: "—", status: "awaiting", lastActivity: "Not confirmed yet" },
  { id: "pt-005", name: "Suresh Rao", age: 71, dischargeDate: "2026-02-07", carePlan: "Active", family: 2, upcoming: "Cardiology 25 Feb", status: "on-track", lastActivity: "Family updated" },
  { id: "pt-006", name: "Neha Gupta", age: 34, dischargeDate: "2026-02-06", carePlan: "Active", family: 3, upcoming: "USG 18 Feb", status: "on-track", lastActivity: "Refill soon" },
  { id: "pt-007", name: "Vikram Reddy", age: 59, dischargeDate: "2026-02-05", carePlan: "Active", family: 2, upcoming: "Ortho 26 Feb", status: "needs-attention", lastActivity: "Stock low" },
];

export const doctorMetrics = {
  discharged: 124,
  plansGenerated: 117,
  awaiting: 7,
  followupsUpcoming: 32,
  tasksAttention: 14,
  weekly: [
    { day: "Mon", discharged: 18, plans: 16 },
    { day: "Tue", discharged: 22, plans: 20 },
    { day: "Wed", discharged: 19, plans: 18 },
    { day: "Thu", discharged: 21, plans: 20 },
    { day: "Fri", discharged: 20, plans: 19 },
    { day: "Sat", discharged: 14, plans: 13 },
    { day: "Sun", discharged: 10, plans: 11 },
  ],
  adherence: [
    { name: "Confirmed", value: 68 },
    { name: "Pending", value: 20 },
    { name: "Needs attention", value: 12 },
  ],
};
