import React from "react";
import { useApp } from "@/contexts/AppContext";
import StatusBadge from "@/components/shared/StatusBadge";
import { Pill, Clock } from "lucide-react";

export default function Medicines() {
  const { medicines } = useApp();
  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs uppercase tracking-widest text-brand-700">Medicines</div>
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-brand-900">Your current medicines</h1>
        <p className="mt-1 text-muted-foreground">All confirmed medicines with schedule and stock overview.</p>
      </div>
      {medicines.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">No medicines yet. Confirm your care plan to see them here.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {medicines.map((m) => (
            <div key={m.id} className="rounded-2xl border bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-900"><Pill className="h-5 w-5" /></div>
                  <div>
                    <div className="font-heading text-lg font-semibold text-brand-900">{m.name} {m.strength}</div>
                    <div className="text-xs text-muted-foreground">{m.dose} · {m.frequency}</div>
                  </div>
                </div>
                <StatusBadge status={m.confirmed ? "confirmed" : "pending"} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {m.timing.join(" · ")}</span>
                <span>·</span><span>Duration: {m.duration}</span>
                <span>·</span><span>Stock: {m.stockRemaining} / {m.stockStart}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
