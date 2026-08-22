import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "@/App.css";
import { useApp } from "@/contexts/AppContext";
import RoleSelection from "@/pages/RoleSelection";
import PatientLogin from "@/pages/PatientLogin";
import DoctorLogin from "@/pages/DoctorLogin";
import PatientLayout from "@/components/layout/PatientLayout";
import DoctorLayout from "@/components/layout/DoctorLayout";
import RecoveryHub from "@/pages/patient/RecoveryHub";
import DischargeUpload from "@/pages/patient/DischargeUpload";
import ExtractionReview from "@/pages/patient/ExtractionReview";
import CarePlan from "@/pages/patient/CarePlan";
import Family from "@/pages/patient/Family";
import Tasks from "@/pages/patient/Tasks";
import Medicines from "@/pages/patient/Medicines";
import MedicineStock from "@/pages/patient/MedicineStock";
import Tests from "@/pages/patient/Tests";
import Appointments from "@/pages/patient/Appointments";
import PillVerification from "@/pages/patient/PillVerification";
import OTCSafety from "@/pages/patient/OTCSafety";
import Notifications from "@/pages/patient/Notifications";
import DailyTracking from "@/pages/patient/DailyTracking";
import WhatChanged from "@/pages/patient/WhatChanged";
import Emergency from "@/pages/patient/Emergency";
import Settings from "@/pages/Settings";
import DoctorDashboard from "@/pages/doctor/Dashboard";
import DoctorPatients from "@/pages/doctor/Patients";
import DoctorPatientDetail from "@/pages/doctor/PatientDetail";

const RequirePatient = ({ children }) => {
  const { role } = useApp();
  if (role !== "patient") return <Navigate to="/" replace />;
  return children;
};
const RequireDoctor = ({ children }) => {
  const { role } = useApp();
  if (role !== "doctor") return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RoleSelection />} />
          <Route path="/patient/login" element={<PatientLogin />} />
          <Route path="/doctor/login" element={<DoctorLogin />} />

          <Route element={<RequirePatient><PatientLayout /></RequirePatient>}>
            <Route path="/patient" element={<RecoveryHub />} />
            <Route path="/patient/discharge" element={<DischargeUpload />} />
            <Route path="/patient/extraction-review" element={<ExtractionReview />} />
            <Route path="/patient/care-plan" element={<CarePlan />} />
            <Route path="/patient/family" element={<Family />} />
            <Route path="/patient/tasks" element={<Tasks />} />
            <Route path="/patient/medicines" element={<Medicines />} />
            <Route path="/patient/medicine-stock" element={<MedicineStock />} />
            <Route path="/patient/tests" element={<Tests />} />
            <Route path="/patient/appointments" element={<Appointments />} />
            <Route path="/patient/pill-verification" element={<PillVerification />} />
            <Route path="/patient/otc-safety" element={<OTCSafety />} />
            <Route path="/patient/notifications" element={<Notifications />} />
            <Route path="/patient/daily-tracking" element={<DailyTracking />} />
            <Route path="/patient/what-changed" element={<WhatChanged />} />
            <Route path="/patient/emergency" element={<Emergency />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          <Route element={<RequireDoctor><DoctorLayout /></RequireDoctor>}>
            <Route path="/doctor" element={<DoctorDashboard />} />
            <Route path="/doctor/patients" element={<DoctorPatients />} />
            <Route path="/doctor/patients/:id" element={<DoctorPatientDetail />} />
            <Route path="/doctor/continuity" element={<DoctorDashboard />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}
