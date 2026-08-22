import React from "react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/shared/StatusBadge";
import { Bell, Pill, CalendarDays, FlaskConical, Users, Package, AlertTriangle } from "lucide-react";

const iconFor = (type) => ({ medicine: Pill, appointment: CalendarDays, test: FlaskConical, family: Users, stock: Package }[type] || Bell);

export default function Notifications() {
  const { notifications, update } = useApp();
  const markAll = () => update((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
  const toggle = (id) => update((s) => ({ ...s, notifications: s.notifications.map((n) => n.id === id ? { ...n, read: !n.read } : n) }));

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-brand-700">Alerts</div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-brand-900">Notifications</h1>
        </div>
        <Button variant="outline" size="sm" onClick={markAll} data-testid="mark-all-read">Mark all as read</Button>
      </div>
      <div className="grid gap-2">
        {notifications.map((n) => {
          const Icon = iconFor(n.type);
          return (
            <button key={n.id} onClick={() => toggle(n.id)} data-testid={`notif-${n.id}`}
              className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${n.read ? "bg-white" : "bg-brand-50/50 border-brand-500/25"}`}>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-900"><Icon className="h-5 w-5" /></div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-brand-900">{n.title}</div>
                  {n.severity === "warning" && <StatusBadge status="warning" label="Attention" />}
                </div>
                <div className="text-sm text-muted-foreground">{n.body}</div>
              </div>
              <div className="text-xs text-muted-foreground shrink-0">{n.time}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
