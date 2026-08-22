import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Stethoscope, ArrowLeft, Mail, Lock } from "lucide-react";
import { toast } from "sonner";
import { IDS } from "@/constants/testIds";

export default function DoctorLogin() {
  const { update } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = () => {
    if (!email || !pw) { toast.error("Enter your credentials"); return; }
    setLoading(true);
    setTimeout(() => { update({ role: "doctor" }); toast.success("Welcome, Dr. Verma"); navigate("/doctor"); }, 500);
  };
  const demo = () => {
    update({ role: "doctor" });
    toast.success("Signed in to demo hospital account");
    navigate("/doctor");
  };

  return (
    <div className="doctor-surface min-h-screen bg-background">
      <div className="mx-auto max-w-md px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-brand-900 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="mt-6 rounded-xl border bg-white p-6 md:p-8 card-elev">
          <div className="flex items-center gap-2 mb-1">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-brand-900 text-white"><Stethoscope className="h-4 w-4" /></div>
            <div className="font-doctor text-sm font-bold text-brand-900 tracking-tight">Discharge2Care · Command Desk</div>
          </div>
          <h1 className="font-doctor text-2xl font-bold text-brand-900 mt-3">Doctor / Hospital login</h1>
          <p className="mt-1 text-xs text-muted-foreground">Access continuity dashboards for your discharged patients.</p>

          <div className="mt-6 space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hospital ID / Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input data-testid="doctor-email-input" type="email" placeholder="dr.verma@sunrise.hosp"
                value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9 h-11" />
            </div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input data-testid="doctor-pw-input" type="password" placeholder="••••••••"
                value={pw} onChange={(e) => setPw(e.target.value)} className="pl-9 h-11" />
            </div>
            <Button data-testid={IDS.doctorLoginSubmit} onClick={submit} disabled={loading}
              className="w-full h-11 mt-3 rounded-md text-sm font-semibold bg-brand-900 hover:bg-brand-700">
              {loading ? "Signing in…" : "Login to Doctor Command Desk"}
            </Button>
            <button data-testid={IDS.doctorDemoLogin} onClick={demo}
              className="mt-1 w-full inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-semibold text-brand-900 hover:bg-slate-50">
              Use Demo Hospital Account — Dr. Anand Verma
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
