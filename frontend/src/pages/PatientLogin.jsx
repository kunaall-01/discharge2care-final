import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HeartPulse, ArrowLeft, Phone, KeyRound, User } from "lucide-react";
import { toast } from "sonner";
import { IDS } from "@/constants/testIds";
import { motion } from "framer-motion";

export default function PatientLogin() {
  const { update, t } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState("mobile"); // mobile | otp
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const sendOtp = () => {
    if (mobile.trim().length < 10) { toast.error("Enter a valid 10-digit mobile number."); return; }
    setLoading(true);
    setTimeout(() => { setLoading(false); setStep("otp"); toast.success("OTP sent (demo: 123456)"); }, 700);
  };

  const verify = () => {
    if (otp !== "123456") { toast.error("Enter demo OTP: 123456"); return; }
    setLoading(true);
    setTimeout(() => { update({ role: "patient" }); navigate("/patient"); }, 500);
  };

  const demoLogin = () => {
    update({ role: "patient" });
    toast.success("Welcome, Ramesh Sharma");
    navigate("/patient");
  };

  return (
    <div className="min-h-screen bg-background grid-bg">
      <div className="mx-auto max-w-md px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-brand-900 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="mt-6 rounded-3xl border border-brand-900/10 bg-white p-6 md:p-8 card-elev">
          <div className="flex items-center gap-2 mb-1">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-900 text-white"><HeartPulse className="h-5 w-5" /></div>
            <div className="font-heading text-lg font-bold text-brand-900">{t("appName")}</div>
          </div>
          <h1 className="font-heading text-3xl font-bold text-brand-900 mt-4">Patient / Caregiver login</h1>
          <p className="mt-1 text-sm text-muted-foreground">We use a one-time code to keep your account safe.</p>

          {step === "mobile" && (
            <div className="mt-6 space-y-4">
              <label className="block text-sm font-medium">Mobile number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input data-testid="patient-mobile-input" type="tel" inputMode="numeric" maxLength={10}
                  placeholder="98765 43210" value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                  className="pl-9 h-12 text-lg" />
              </div>
              <Button data-testid={IDS.patientLoginSubmit} onClick={sendOtp} disabled={loading}
                className="w-full h-12 rounded-full text-base font-semibold bg-brand-900 hover:bg-brand-700">
                {loading ? "Sending…" : "Send OTP"}
              </Button>
            </div>
          )}

          {step === "otp" && (
            <div className="mt-6 space-y-4">
              <div className="text-sm">OTP sent to <span className="font-medium">+91 {mobile}</span></div>
              <label className="block text-sm font-medium">Enter OTP</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input data-testid="patient-otp-input" type="tel" inputMode="numeric" maxLength={6}
                  placeholder="6-digit code" value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="pl-9 h-12 text-lg tracking-widest" />
              </div>
              <div className="text-xs text-muted-foreground">Demo OTP: 123456</div>
              <Button data-testid="patient-verify-otp" onClick={verify} disabled={loading}
                className="w-full h-12 rounded-full text-base font-semibold bg-brand-900 hover:bg-brand-700">
                {loading ? "Verifying…" : "Verify & Continue"}
              </Button>
            </div>
          )}

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <button data-testid={IDS.patientDemoLogin} onClick={demoLogin}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-brand-900/20 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-900 hover:bg-brand-100 transition-colors">
            <User className="h-4 w-4" /> {t("cta.demoPatient")} — Ramesh Sharma
          </button>
          <p className="mt-4 text-[11px] text-muted-foreground">{t("disclaimer")}</p>
        </motion.div>
      </div>
    </div>
  );
}
