import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useApp } from "@/contexts/AppContext";
import AccessibilityPanel from "@/components/shared/AccessibilityPanel";
import EmergencySOS from "@/components/shared/EmergencySOS";
import { HeartPulse, Users, Stethoscope, ArrowRight, ShieldCheck, Play, Lock } from "lucide-react";
import { IDS } from "@/constants/testIds";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function RoleSelection() {
  const { t, language, update, resetDemo } = useApp();
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);

  const startDemo = () => {
    setStarting(true);
    resetDemo();
    setTimeout(() => {
      update({ role: "patient" });
      toast.success("SIH Demo started. Logged in as Ramesh Sharma.");
      navigate("/patient/discharge");
    }, 700);
  };

  return (
    <div className="relative min-h-screen bg-background grid-bg overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: "radial-gradient(hsl(var(--brand-900)) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
      }} />
      <header className="relative z-10 mx-auto flex max-w-[1400px] items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-900 text-white shadow-lg">
            <HeartPulse className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="font-heading text-xl font-bold text-brand-900">{t("appName")}</div>
            <div className="text-[11px] text-muted-foreground tracking-wide">SIH 2026 · Demo prototype</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={language} onValueChange={(v) => update({ language: v })}>
            <SelectTrigger className="h-10 w-[128px] bg-white" data-testid={IDS.langSwitcher}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="hi">हिन्दी</SelectItem>
            </SelectContent>
          </Select>
          <AccessibilityPanel />
          <EmergencySOS compact />
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1400px] px-6 pb-16">
        <section className="grid gap-10 md:grid-cols-12 items-center pt-8 md:pt-14">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="md:col-span-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-900/15 bg-white/70 px-3 py-1 text-xs font-medium text-brand-900 backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5" /> Patient-controlled · Family-aware · Doctor-connected
            </span>
            <h1 className="mt-4 font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-brand-900 leading-[1.05]">
              {t("appName")}
              <span className="block text-brand-700/80 text-2xl sm:text-3xl mt-2 font-semibold">{t("tagline")}</span>
            </h1>
            <p className="mt-5 max-w-xl text-base md:text-lg text-foreground/75">
              {t("subTagline")}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button data-testid={IDS.startDemo} onClick={startDemo} disabled={starting}
                className="btn-primary inline-flex items-center gap-2">
                <Play className="h-4 w-4" /> {starting ? "Starting…" : t("cta.demo")}
              </button>
              <Link to="/patient/login" className="inline-flex items-center gap-2 rounded-full border border-brand-900/20 bg-white px-5 py-3 text-sm font-semibold text-brand-900 hover:bg-brand-50 transition-colors">
                I'm a patient <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/doctor/login" className="inline-flex items-center gap-2 rounded-full border border-brand-900/20 bg-white px-5 py-3 text-sm font-semibold text-brand-900 hover:bg-brand-50 transition-colors">
                I'm a doctor <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" /> {t("disclaimer")}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.15 }}
            className="md:col-span-5 space-y-4">
            <RoleCard
              testid={IDS.rolePatient} onClick={() => navigate("/patient/login")}
              title={t("role.patient")} desc={t("roleDesc.patient")} tone="patient"
              icon={<Users className="h-7 w-7" />}
            />
            <RoleCard
              testid={IDS.roleDoctor} onClick={() => navigate("/doctor/login")}
              title={t("role.doctor")} desc={t("roleDesc.doctor")} tone="doctor"
              icon={<Stethoscope className="h-7 w-7" />}
            />
            <div className="rounded-2xl border border-brand-900/10 bg-white p-4 text-xs text-muted-foreground flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 mt-0.5 text-success shrink-0" />
              <p>{t("privacy")}</p>
            </div>
          </motion.div>
        </section>

        <section className="mt-20 grid gap-4 sm:grid-cols-3">
          {[
            ["From discharge to daily care", "Convert a paper discharge summary into a confirmed daily plan the patient controls."],
            ["Family, on the same page", "Invite family with granular permissions and shared responsibilities."],
            ["Doctor continuity, at a glance", '"What Changed?" summaries make follow-ups faster and safer.'],
          ].map(([h, p], i) => (
            <div key={i} className="rounded-2xl border border-brand-900/10 bg-white p-5 card-elev">
              <div className="font-heading text-lg font-semibold text-brand-900">{h}</div>
              <p className="mt-2 text-sm text-foreground/70 leading-relaxed">{p}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

function RoleCard({ title, desc, icon, onClick, testid, tone }) {
  return (
    <button data-testid={testid} onClick={onClick}
      className={`group relative w-full text-left rounded-3xl border p-5 md:p-6 transition-all overflow-hidden
      ${tone === "patient"
        ? "bg-brand-900 text-white border-brand-900 hover:shadow-2xl"
        : "bg-white text-brand-900 border-brand-900/20 hover:shadow-2xl"} card-elev`}>
      <div className="flex items-start gap-4">
        <div className={`grid h-14 w-14 place-items-center rounded-2xl ${tone === "patient" ? "bg-brand-500/20 text-white" : "bg-brand-50 text-brand-900"}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-heading text-xl font-bold">{title}</div>
          <p className={`mt-1 text-sm ${tone === "patient" ? "text-white/80" : "text-foreground/70"}`}>{desc}</p>
          <div className={`mt-3 inline-flex items-center gap-1 text-sm font-semibold ${tone === "patient" ? "text-brand-300" : "text-brand-700"}`}>
            Continue <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </button>
  );
}
