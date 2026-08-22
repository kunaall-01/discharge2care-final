import React from "react";
import { Link } from "react-router-dom";
import { doctorMetrics, doctorPatientList } from "@/data/mockData";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";
import { Activity, Users, ClipboardCheck, CalendarClock, AlertTriangle, TrendingUp, ArrowRight } from "lucide-react";

const COLORS = ["#2A9D8F", "#48CAE4", "#E63946"];

export default function DoctorDashboard() {
  const m = doctorMetrics;
  return (
    <div className="space-y-5">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Command Desk</div>
        <h1 className="font-doctor text-2xl md:text-3xl font-bold text-brand-900">Post-discharge continuity</h1>
        <p className="text-sm text-muted-foreground">Operational overview across your discharged patients.</p>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        <Metric icon={<Users />} label="Discharged today" value={m.discharged} />
        <Metric icon={<ClipboardCheck />} label="Care plans generated" value={m.plansGenerated} />
        <Metric icon={<Activity />} label="Awaiting confirmation" value={m.awaiting} tone="warn" />
        <Metric icon={<CalendarClock />} label="Follow-ups upcoming" value={m.followupsUpcoming} />
        <Metric icon={<AlertTriangle />} label="Tasks needing attention" value={m.tasksAttention} tone="danger" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 rounded-lg border bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="font-doctor text-sm font-semibold text-brand-900 flex items-center gap-1"><TrendingUp className="h-4 w-4" /> Weekly discharge & plans</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Last 7 days</div>
          </div>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={m.weekly}>
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} />
                <Tooltip />
                <Bar dataKey="discharged" fill="#0F4C5C" radius={[4,4,0,0]} />
                <Bar dataKey="plans" fill="#48CAE4" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="font-doctor text-sm font-semibold text-brand-900 mb-2">Adherence mix</div>
          <div className="h-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={m.adherence} innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={2}>
                  {m.adherence.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-white">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="font-doctor text-sm font-semibold">Recent patients</div>
          <Link to="/doctor/patients" className="text-xs font-semibold text-brand-900 inline-flex items-center gap-1">View all <ArrowRight className="h-3 w-3" /></Link>
        </div>
        <div className="divide-y">
          {doctorPatientList.slice(0, 5).map((p) => (
            <Link to={`/doctor/patients/${p.id}`} key={p.id} className="flex items-center justify-between px-3 py-2.5 text-sm hover:bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-brand-50 text-brand-900 font-mono text-[11px] font-bold">{p.name.split(" ").map(n=>n[0]).slice(0,2).join("")}</div>
                <div>
                  <div className="font-medium text-brand-900">{p.name} <span className="text-muted-foreground font-normal">· {p.age}</span></div>
                  <div className="text-[11px] text-muted-foreground">Discharged {p.dischargeDate} · {p.lastActivity}</div>
                </div>
              </div>
              <StatusPill s={p.status} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

const Metric = ({ icon, label, value, tone = "brand" }) => {
  const tint = tone === "warn" ? "text-warm" : tone === "danger" ? "text-critical" : "text-brand-900";
  return (
    <div className="rounded-lg border bg-white p-3">
      <div className={`inline-grid h-8 w-8 place-items-center rounded-md bg-slate-100 ${tint}`}>{icon}</div>
      <div className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-doctor text-2xl font-bold text-brand-900">{value}</div>
    </div>
  );
};

const StatusPill = ({ s }) => {
  const map = { "on-track": ["bg-success/10 text-success", "On track"], "needs-attention": ["bg-critical/10 text-critical", "Needs attention"], awaiting: ["bg-warm/10 text-warm", "Awaiting"] };
  const [cls, label] = map[s] || map["on-track"];
  return <span className={`rounded px-2 py-0.5 text-[10px] font-mono ${cls}`}>{label}</span>;
};
