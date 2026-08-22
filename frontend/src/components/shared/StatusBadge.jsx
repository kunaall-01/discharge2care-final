import React from "react";
import { CheckCircle2, AlertTriangle, Circle, Clock, Info } from "lucide-react";

const map = {
  confirmed: { label: "Confirmed", icon: CheckCircle2, cls: "text-success bg-success/10 border-success/25" },
  done: { label: "Done", icon: CheckCircle2, cls: "text-success bg-success/10 border-success/25" },
  needsAttention: { label: "Needs attention", icon: AlertTriangle, cls: "text-critical bg-critical/10 border-critical/25" },
  warning: { label: "Refill soon", icon: AlertTriangle, cls: "text-warm bg-warm/10 border-warm/30" },
  upcoming: { label: "Upcoming", icon: Circle, cls: "text-brand-700 bg-brand-50 border-brand-300/40" },
  pending: { label: "Pending", icon: Clock, cls: "text-muted-foreground bg-muted border-border" },
  inProgress: { label: "In progress", icon: Clock, cls: "text-brand-700 bg-brand-50 border-brand-300/40" },
  info: { label: "Info", icon: Info, cls: "text-brand-700 bg-brand-50 border-brand-300/40" },
};

export default function StatusBadge({ status = "pending", label, testid }) {
  const cfg = map[status] || map.pending;
  const Icon = cfg.icon;
  return (
    <span data-testid={testid} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${cfg.cls}`}>
      <Icon className="h-3.5 w-3.5" />
      {label || cfg.label}
    </span>
  );
}
