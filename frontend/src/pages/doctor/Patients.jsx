import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { doctorPatientList } from "@/data/mockData";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function DoctorPatients() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");

  const rows = useMemo(() => doctorPatientList
    .filter((p) => (filter === "all" ? true : p.status === filter))
    .filter((p) => p.name.toLowerCase().includes(q.toLowerCase())), [q, filter]);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Patients</div>
        <h1 className="font-doctor text-2xl font-bold text-brand-900">Discharged patients</h1>
      </div>
      <div className="flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} data-testid="doc-search-input" />
        </div>
        <div className="flex gap-1">
          {[["all", "All"], ["on-track", "On track"], ["needs-attention", "Attention"], ["awaiting", "Awaiting"]].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)} data-testid={`doc-filter-${v}`}
              className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${filter === v ? "bg-brand-900 text-white border-brand-900" : "bg-white hover:bg-slate-50"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2 font-semibold">Patient</th>
              <th className="text-left px-3 py-2 font-semibold">Discharge</th>
              <th className="text-left px-3 py-2 font-semibold">Care plan</th>
              <th className="text-left px-3 py-2 font-semibold">Family</th>
              <th className="text-left px-3 py-2 font-semibold">Upcoming</th>
              <th className="text-left px-3 py-2 font-semibold">Status</th>
              <th className="text-left px-3 py-2 font-semibold">Recent</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-3 py-2">
                  <Link to={`/doctor/patients/${p.id}`} className="font-medium text-brand-900" data-testid={`doc-row-${p.id}`}>{p.name}</Link>
                  <div className="text-[10px] text-muted-foreground">Age {p.age}</div>
                </td>
                <td className="px-3 py-2">{p.dischargeDate}</td>
                <td className="px-3 py-2">{p.carePlan}</td>
                <td className="px-3 py-2 font-mono">{p.family}</td>
                <td className="px-3 py-2">{p.upcoming}</td>
                <td className="px-3 py-2"><StatusPill s={p.status} /></td>
                <td className="px-3 py-2 text-muted-foreground">{p.lastActivity}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No patients match.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
const StatusPill = ({ s }) => {
  const map = { "on-track": ["bg-success/10 text-success", "On track"], "needs-attention": ["bg-critical/10 text-critical", "Attention"], awaiting: ["bg-warm/10 text-warm", "Awaiting"] };
  const [cls, label] = map[s] || map["on-track"];
  return <span className={`rounded px-2 py-0.5 text-[10px] font-mono ${cls}`}>{label}</span>;
};
