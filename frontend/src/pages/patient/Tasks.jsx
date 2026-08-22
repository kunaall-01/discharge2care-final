import React from "react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "@/components/shared/StatusBadge";
import { Pill, FlaskConical, Car, Bandage, Check } from "lucide-react";
import { toast } from "sonner";

const iconFor = (type) => ({ medicine: Pill, test: FlaskConical, transport: Car, care: Bandage }[type] || Pill);

export default function Tasks() {
  const { tasks, family, update } = useApp();

  const setStatus = (id, status) => {
    update((s) => ({ ...s, tasks: s.tasks.map((t) => t.id === id ? { ...t, status } : t) }));
    toast.success(`Status updated to ${status}`);
  };
  const reassign = (id, assignee) => {
    update((s) => ({ ...s, tasks: s.tasks.map((t) => t.id === id ? { ...t, assignee } : t) }));
    toast.success("Task reassigned");
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs uppercase tracking-widest text-brand-700">Shared responsibilities</div>
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-brand-900">Family tasks</h1>
        <p className="mt-1 text-muted-foreground">Assign and track responsibilities across your Care Circle.</p>
      </div>
      <div className="grid gap-3">
        {tasks.map((t) => {
          const Icon = iconFor(t.type);
          const assigned = family.find((f) => f.id === t.assignee);
          const statusMap = { pending: "pending", "in-progress": "inProgress", done: "done" };
          return (
            <div key={t.id} data-testid={`task-${t.id}`} className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl border bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-900"><Icon className="h-5 w-5" /></div>
                <div>
                  <div className="font-heading text-lg font-semibold text-brand-900">{t.title}</div>
                  <div className="text-xs text-muted-foreground">Due {t.dueTime} · {t.note || "No note"}</div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={statusMap[t.status] || "pending"} />
                <Select value={t.assignee} onValueChange={(v) => reassign(t.id, v)}>
                  <SelectTrigger className="h-9 min-w-[160px]"><SelectValue placeholder="Assign to" /></SelectTrigger>
                  <SelectContent>
                    {family.map((f) => <SelectItem key={f.id} value={f.id}>{f.name} · {f.relation}</SelectItem>)}
                  </SelectContent>
                </Select>
                {t.status !== "done" ? (
                  <Button size="sm" onClick={() => setStatus(t.id, "done")} data-testid={`complete-${t.id}`} className="bg-success hover:brightness-95"><Check className="h-3.5 w-3.5 mr-1" /> Mark complete</Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setStatus(t.id, "pending")}>Reopen</Button>
                )}
              </div>
              {assigned && <div className="md:hidden text-xs text-muted-foreground">Assigned to {assigned.name}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
