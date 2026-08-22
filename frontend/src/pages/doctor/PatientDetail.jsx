import React from "react";
import { Link, useParams } from "react-router-dom";
import { doctorPatientList } from "@/data/mockData";
import { useApp } from "@/contexts/AppContext";
import { ArrowLeft, Pill, FlaskConical, CalendarDays, Users, Sparkles, FileText, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function DoctorPatientDetail() {
  const { id } = useParams();
  const p = doctorPatientList.find((x) => x.id === id) || doctorPatientList[0];
  const app = useApp();
  const isRamesh = p.id === "pt-001";
  const meds = isRamesh ? app.medicines : [];
  const tests = isRamesh ? app.tests : [];
  const appts = isRamesh ? app.appointments : [];
  const family = isRamesh ? app.family : [];
  const questions = isRamesh ? app.questions : [];

  return (
    <div className="space-y-4">
      <Link to="/doctor/patients" className="inline-flex items-center gap-1 text-xs text-brand-900 font-semibold"><ArrowLeft className="h-3 w-3" /> Back to patients</Link>
      <div className="rounded-lg border bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Patient profile</div>
            <h1 className="font-doctor text-2xl font-bold text-brand-900">{p.name} <span className="font-normal text-muted-foreground">· Age {p.age}</span></h1>
            <div className="text-xs text-muted-foreground">Discharged {p.dischargeDate} · {p.carePlan} plan</div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm"><FileText className="h-3.5 w-3.5 mr-1" /> Documents</Button>
            <Button size="sm" onClick={() => toast.success("Follow-up note added")} className="bg-brand-900 hover:bg-brand-700"><MessageSquare className="h-3.5 w-3.5 mr-1" /> Add follow-up note</Button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <MetricCard icon={<Pill />} label="Medication plan" value={`${meds.length} medicines`} />
        <MetricCard icon={<FlaskConical />} label="Investigations" value={`${tests.filter(t=>t.status==="done").length} completed`} />
        <MetricCard icon={<CalendarDays />} label="Appointments" value={`${appts.filter(a=>a.completed).length} completed`} />
        <MetricCard icon={<Sparkles />} label="Patient notes" value={isRamesh ? app.dailyLog.filter(d=>d.kind==="note").length : 0} />
        <MetricCard icon={<MessageSquare />} label="Questions" value={questions.length} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Medication list">
          {meds.length === 0 ? <Empty /> : meds.map((m) => (
            <Row key={m.id} left={`${m.name} ${m.strength}`} right={`${m.frequency} · ${m.duration}`} />
          ))}
        </Card>
        <Card title="Upcoming tests">
          {tests.filter(t=>t.status!=="done").length === 0 ? <Empty /> : tests.filter(t=>t.status!=="done").map((t) => (
            <Row key={t.id} left={t.name} right={t.date} />
          ))}
        </Card>
        <Card title="Appointments">
          {appts.length === 0 ? <Empty /> : appts.map((a) => (
            <Row key={a.id} left={a.title} right={`${a.date} · ${a.time}`} />
          ))}
        </Card>
        <Card title="Care circle">
          {family.length === 0 ? <Empty /> : family.map((f) => (
            <Row key={f.id} left={`${f.name} · ${f.relation}`} right={f.responsibilities.join(", ")} />
          ))}
        </Card>
        <Card title="Questions from patient">
          {questions.length === 0 ? <Empty /> : questions.map((q) => (
            <Row key={q.id} left={q.text} right={new Date(q.askedAt).toLocaleDateString()} />
          ))}
        </Card>
        <Card title="Alerts">
          <Row left={p.status === "needs-attention" ? "Task unconfirmed" : "No active alerts"} right="—" />
        </Card>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <div className="font-doctor text-sm font-semibold text-brand-900 mb-2">Continuity summary — since last visit</div>
        <ol className="relative border-l border-border pl-5 space-y-2 text-sm">
          <li><span className="absolute -left-[7px] top-2 h-1.5 w-1.5 rounded-full bg-brand-900" /> Care plan activated by patient</li>
          <li><span className="absolute -left-[7px] top-2 h-1.5 w-1.5 rounded-full bg-brand-900" /> Family circle set up (3 members)</li>
          <li><span className="absolute -left-[7px] top-2 h-1.5 w-1.5 rounded-full bg-brand-900" /> Medicine adherence: on schedule</li>
          <li><span className="absolute -left-[7px] top-2 h-1.5 w-1.5 rounded-full bg-brand-900" /> "What Changed?" summary shared</li>
        </ol>
      </div>
    </div>
  );
}
const Card = ({ title, children }) => (
  <div className="rounded-lg border bg-white p-3">
    <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">{title}</div>
    <div className="space-y-1.5">{children}</div>
  </div>
);
const Row = ({ left, right }) => (
  <div className="flex items-center justify-between text-sm">
    <div className="text-brand-900 truncate">{left}</div>
    <div className="text-muted-foreground shrink-0 text-xs">{right}</div>
  </div>
);
const Empty = () => <div className="text-xs text-muted-foreground">No data shared for this section.</div>;
const MetricCard = ({ icon, label, value }) => (
  <div className="rounded-lg border bg-white p-3">
    <div className="inline-grid h-7 w-7 place-items-center rounded-md bg-slate-100 text-brand-900">{icon}</div>
    <div className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
    <div className="font-doctor text-xl font-bold text-brand-900">{value}</div>
  </div>
);
