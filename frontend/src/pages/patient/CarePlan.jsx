import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { CheckCircle2, ShieldCheck, Pill, FlaskConical, CalendarDays, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { IDS } from "@/constants/testIds";

export default function CarePlan() {
  const { extractionDraft, carePlanActive, activateCarePlan, medicines, tests, appointments, careTasks } = useApp();
  const navigate = useNavigate();
  const [confirmed, setConfirmed] = useState(false);
  const draft = extractionDraft || { medicines, tests, appointments, careTasks };

  const activate = () => {
    activateCarePlan();
    setConfirmed(true);
    toast.success("Care plan activated. Reminders are now on.");
    setTimeout(() => navigate("/patient"), 1400);
  };

  if (carePlanActive && !confirmed) {
    return (
      <div className="rounded-3xl border bg-white p-8 card-elev">
        <h2 className="font-heading text-2xl font-bold text-brand-900">Your care plan is active</h2>
        <p className="text-sm text-muted-foreground mt-1">Reminders and family coordination are on.</p>
        <Button onClick={() => navigate("/patient")} className="mt-4 btn-primary">Go to Recovery Hub</Button>
      </div>
    );
  }

  if (confirmed) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="rounded-3xl border bg-white p-10 text-center card-elev">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-success/10 text-success">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h2 className="mt-4 font-heading text-3xl font-bold text-brand-900">Care plan activated</h2>
        <p className="mt-2 text-muted-foreground">Reminders, tasks and family coordination are now on.</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs uppercase tracking-widest text-brand-700">Review complete</div>
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-brand-900">You're about to activate your recovery plan</h1>
        <p className="mt-2 text-muted-foreground">Please confirm to turn on reminders, family coordination, and stock tracking.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card icon={<Pill className="h-5 w-5" />} title="Medicines" count={draft.medicines.length} sub="Reminders will start today" />
        <Card icon={<FlaskConical className="h-5 w-5" />} title="Tests" count={draft.tests.length} sub="Upcoming will appear in your hub" />
        <Card icon={<CalendarDays className="h-5 w-5" />} title="Appointments" count={draft.appointments.length} sub="Checklist prepared for each visit" />
        <Card icon={<ClipboardList className="h-5 w-5" />} title="Care tasks" count={draft.careTasks.length} sub="Assign to family members" />
      </div>
      <div className="rounded-2xl border border-success/25 bg-success/5 p-4 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-success mt-0.5" />
        <div className="text-sm">
          <div className="font-semibold text-brand-900">You stay in control</div>
          <div className="text-muted-foreground">You can edit, pause, or share any part of your plan later. Family access is controlled by you.</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => navigate("/patient/extraction-review")}>Review Again</Button>
        <Button data-testid={IDS.confirmCarePlan} onClick={activate} className="btn-primary">Confirm & Activate Care Plan</Button>
      </div>
    </div>
  );
}

const Card = ({ icon, title, count, sub }) => (
  <div className="rounded-2xl border bg-white p-4 flex items-center gap-3">
    <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-900">{icon}</div>
    <div className="flex-1">
      <div className="font-heading text-lg font-semibold text-brand-900">{title} <span className="text-brand-700">· {count}</span></div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  </div>
);
