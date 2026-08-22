import React from "react";
import { Link } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import StatusBadge from "@/components/shared/StatusBadge";
import { motion } from "framer-motion";
import { Pill, FlaskConical, CalendarDays, Users, Upload, ClipboardCheck, TrendingUp, ArrowRight, Sun } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export default function RecoveryHub() {
  const { patient, medicines, tests, appointments, family, carePlanActive, t, update } = useApp();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Build NOW / NEXT lists from medicines timing
  const now = new Date();
  const toMin = (hm) => { const [h, m] = hm.split(":").map(Number); return h * 60 + m; };
  const curMin = now.getHours() * 60 + now.getMinutes();

  const scheduled = medicines.flatMap((m) => m.timing.map((tm) => ({ ...m, time: tm, min: toMin(tm) })));
  scheduled.sort((a, b) => a.min - b.min);
  const nowItems = scheduled.filter((x) => Math.abs(x.min - curMin) <= 60).slice(0, 2);
  const nextItems = scheduled.filter((x) => x.min > curMin && !nowItems.find(n => n.id === x.id && n.time === x.time)).slice(0, 2);

  const totalDoses = scheduled.length;
  const completed = medicines.reduce((s, m) => s + Math.max(0, m.stockStart - m.stockRemaining), 0);
  const scheduledTotal = medicines.reduce((s, m) => s + m.stockStart, 0);
  const progress = scheduledTotal ? Math.round((completed / scheduledTotal) * 100) : 0;

  const markDone = (id) => {
    update((s) => ({
      ...s,
      medicines: s.medicines.map((m) => m.id === id ? { ...m, stockRemaining: Math.max(0, m.stockRemaining - 1) } : m),
      dailyLog: [{ id: `d-${Date.now()}`, ts: Date.now(), kind: "medicine", text: `${medicines.find(m=>m.id===id)?.name} confirmed` }, ...s.dailyLog],
    }));
    toast.success("Medicine marked as taken");
  };

  if (!carePlanActive) {
    return (
      <div className="space-y-5">
        <HeroGreeting greeting={greeting} name={patient.name.split(" ")[0]} subtitle="Let's set up your recovery plan." />
        <div className="rounded-3xl border border-brand-900/10 bg-white p-6 md:p-8 card-elev">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-900"><Upload className="h-6 w-6" /></div>
            <div className="flex-1">
              <h2 className="font-heading text-2xl font-bold text-brand-900">Start with your discharge summary</h2>
              <p className="text-sm text-muted-foreground mt-1">Upload the document your hospital gave you. We'll turn it into a plan you can review and confirm.</p>
              <Link to="/patient/discharge" className="mt-4 btn-primary inline-flex items-center gap-2" data-testid="cta-start-upload">
                Upload discharge summary <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="patient-dashboard">
      <HeroGreeting greeting={greeting} name={patient.name.split(" ")[0]} subtitle={t("hub.today")} progress={progress} />

      <div className="grid gap-4 md:gap-6 md:grid-cols-12">
        <Section title={t("hub.now")} icon={<Sun className="h-4 w-4" />} tone="now" className="md:col-span-8">
          {nowItems.length === 0 ? (
            <Empty text="Nothing due right now. Great job." />
          ) : nowItems.map((m) => (
            <MedNowCard key={`${m.id}-${m.time}`} m={m} onDone={() => markDone(m.id)} />
          ))}
        </Section>

        <Section title="Care Circle" className="md:col-span-4">
          <div className="flex flex-wrap gap-2">
            {family.slice(0, 4).map((f) => (
              <div key={f.id} className="flex items-center gap-2 rounded-full border border-brand-900/10 bg-brand-50 px-3 py-1.5 text-xs">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-900 text-white text-[10px] font-bold">{f.avatar}</span>
                <span className="font-medium text-brand-900">{f.name.split(" ")[0]}</span>
                <span className="text-muted-foreground">· {f.relation}</span>
              </div>
            ))}
          </div>
          <Link to="/patient/family" data-testid="hub-goto-family" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-900">
            Manage Care Circle <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Section>

        <Section title={t("hub.next")} className="md:col-span-6">
          {nextItems.length === 0 ? <Empty text="All medicines done for today." />
            : nextItems.map((m) => (
              <div key={`${m.id}-${m.time}`} className="flex items-center justify-between rounded-2xl border border-border bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-900"><Pill className="h-5 w-5" /></div>
                  <div>
                    <div className="font-heading text-base font-semibold text-brand-900">{m.name} {m.strength}</div>
                    <div className="text-xs text-muted-foreground">{m.time} · {m.dose}</div>
                  </div>
                </div>
                <StatusBadge status="upcoming" />
              </div>
            ))}
        </Section>

        <Section title={t("hub.upcoming")} className="md:col-span-6">
          {[
            ...tests.filter(x => x.status !== "done").map(x => ({ id: `t-${x.id}`, icon: FlaskConical, label: x.name, date: x.date, kind: "Test" })),
            ...appointments.filter(x => !x.completed).map(x => ({ id: `a-${x.id}`, icon: CalendarDays, label: x.title, date: `${x.date} · ${x.time}`, kind: "Appointment" })),
          ].slice(0, 4).map((x) => (
            <div key={x.id} className="flex items-center justify-between rounded-2xl border border-border bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-900"><x.icon className="h-5 w-5" /></div>
                <div>
                  <div className="font-heading text-base font-semibold text-brand-900">{x.label}</div>
                  <div className="text-xs text-muted-foreground">{x.kind} · {x.date}</div>
                </div>
              </div>
              <StatusBadge status="upcoming" />
            </div>
          ))}
        </Section>

        <Section title="Medicine progress" icon={<TrendingUp className="h-4 w-4" />} className="md:col-span-8">
          <div className="space-y-3">
            {medicines.map((m) => {
              const pct = Math.round(((m.stockStart - m.stockRemaining) / m.stockStart) * 100);
              return (
                <div key={m.id} className="rounded-2xl border bg-white p-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="font-medium text-brand-900">{m.name} {m.strength}</div>
                    <div className="text-muted-foreground">{m.stockRemaining} / {m.stockStart} left</div>
                  </div>
                  <Progress value={100 - pct} className="mt-2 h-2" />
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="Quick actions" className="md:col-span-4">
          <div className="grid grid-cols-2 gap-3">
            <QuickAction to="/patient/pill-verification" label="Pill verify" icon={<ClipboardCheck className="h-5 w-5" />} />
            <QuickAction to="/patient/otc-safety" label="OTC safety" icon={<Pill className="h-5 w-5" />} />
            <QuickAction to="/patient/what-changed" label="What Changed?" icon={<TrendingUp className="h-5 w-5" />} />
            <QuickAction to="/patient/family" label="Family" icon={<Users className="h-5 w-5" />} />
          </div>
        </Section>
      </div>
    </div>
  );
}

const HeroGreeting = ({ greeting, name, subtitle, progress }) => (
  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
    className="relative overflow-hidden rounded-3xl border border-brand-900/10 bg-gradient-to-br from-brand-900 to-brand-700 text-white p-6 md:p-8 card-elev">
    <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
      <div>
        <div className="text-brand-300 text-xs uppercase tracking-widest">Recovery Hub</div>
        <h1 className="font-heading text-3xl sm:text-4xl font-bold mt-1">{greeting}, {name}</h1>
        <p className="mt-1 text-white/85">{subtitle}</p>
      </div>
      {typeof progress === "number" && (
        <div className="rounded-2xl bg-white/10 backdrop-blur px-4 py-3 min-w-[220px]">
          <div className="text-xs uppercase tracking-widest text-brand-300">Overall progress</div>
          <div className="mt-1 flex items-center gap-3">
            <div className="text-3xl font-heading font-bold">{progress}%</div>
            <div className="flex-1 h-2 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full bg-brand-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      )}
    </div>
    <div className="pointer-events-none absolute -right-20 -bottom-20 h-56 w-56 rounded-full bg-brand-500/20 blur-2xl" />
  </motion.div>
);

const Section = ({ title, children, className = "", icon, tone }) => (
  <section className={`rounded-3xl border border-brand-900/10 bg-white p-4 md:p-5 card-elev ${className}`}>
    <div className="mb-3 flex items-center justify-between">
      <h3 className="font-heading text-sm font-semibold uppercase tracking-widest text-brand-700 flex items-center gap-1.5">
        {icon}{title}
      </h3>
    </div>
    <div className="space-y-3">{children}</div>
  </section>
);

const Empty = ({ text }) => <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{text}</div>;

const MedNowCard = ({ m, onDone }) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-brand-900/10 bg-brand-50 p-4">
    <div className="flex items-center gap-4">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-900 text-white shadow-md"><Pill className="h-6 w-6" /></div>
      <div>
        <div className="font-heading text-xl font-bold text-brand-900">{m.name} {m.strength}</div>
        <div className="text-sm text-brand-900/70">{m.time} · {m.dose} · {m.frequency}</div>
      </div>
    </div>
    <button data-testid={`mark-done-${m.id}`} onClick={onDone}
      className="btn-primary inline-flex items-center justify-center gap-2 md:min-w-[180px]">
      Mark as Done
    </button>
  </div>
);

const QuickAction = ({ to, label, icon }) => (
  <Link to={to} className="rounded-2xl border border-brand-900/10 bg-white p-3 hover:bg-brand-50 transition-colors text-brand-900">
    <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-900 mb-2">{icon}</div>
    <div className="text-sm font-semibold">{label}</div>
  </Link>
);
