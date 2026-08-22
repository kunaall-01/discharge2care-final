import React from "react";
import { useApp } from "@/contexts/AppContext";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import StatusBadge from "@/components/shared/StatusBadge";
import { Package } from "lucide-react";

export default function MedicineStock() {
  const { medicines, update } = useApp();

  const setField = (id, key, value) => {
    update((s) => ({ ...s, medicines: s.medicines.map((m) => m.id === id ? { ...m, [key]: value } : m) }));
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs uppercase tracking-widest text-brand-700">Inventory</div>
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-brand-900">Medicine stock & refill</h1>
        <p className="mt-1 text-muted-foreground">Estimated days remaining are calculated from your schedule.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {medicines.map((m) => {
          const daily = m.timing.length || 1;
          const days = Math.floor(m.stockRemaining / daily);
          const pct = Math.round(((m.stockStart - m.stockRemaining) / (m.stockStart || 1)) * 100);
          const status = days <= 3 ? "warning" : "confirmed";
          return (
            <div key={m.id} data-testid={`stock-${m.id}`} className="rounded-2xl border bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-900"><Package className="h-5 w-5" /></div>
                  <div>
                    <div className="font-heading text-lg font-semibold text-brand-900">{m.name} {m.strength}</div>
                    <div className="text-xs text-muted-foreground">{daily}/day · {m.dose}</div>
                  </div>
                </div>
                <StatusBadge status={status} label={days <= 3 ? "Refill soon" : `${days} days left`} />
              </div>
              <Progress value={100 - pct} className="mt-3 h-2" />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="text-xs">
                  <div className="text-muted-foreground">Starting quantity</div>
                  <Input type="number" min={0} value={m.stockStart}
                    onChange={(e) => setField(m.id, "stockStart", Math.max(0, Number(e.target.value)))} />
                </label>
                <label className="text-xs">
                  <div className="text-muted-foreground">Remaining</div>
                  <Input type="number" min={0} value={m.stockRemaining}
                    onChange={(e) => setField(m.id, "stockRemaining", Math.max(0, Number(e.target.value)))} />
                </label>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">Estimated remaining: <span className="font-medium text-brand-900">{days} days</span></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
