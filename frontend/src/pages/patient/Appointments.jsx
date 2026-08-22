import React, { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import StatusBadge from "@/components/shared/StatusBadge";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Appointments() {
  const { appointments, update } = useApp();
  const [dialog, setDialog] = useState(false);
  const [draft, setDraft] = useState({ title: "", doctor: "", department: "", date: "", time: "", location: "", notes: "" });

  const add = () => {
    if (!draft.title || !draft.date) { toast.error("Title and date required"); return; }
    const id = `a-${Date.now()}`;
    update((s) => ({ ...s, appointments: [...s.appointments, { id, ...draft, checklist: ["Carry ID", "Carry latest reports", "Arrange transport"], completed: false }] }));
    setDialog(false);
    setDraft({ title: "", doctor: "", department: "", date: "", time: "", location: "", notes: "" });
    toast.success("Appointment added");
  };
  const remove = (id) => update((s) => ({ ...s, appointments: s.appointments.filter((a) => a.id !== id) }));
  const toggleItem = (id, idx) => {
    update((s) => ({ ...s, appointments: s.appointments.map((a) => a.id === id ? { ...a, checklist: a.checklist.map((c, i) => i === idx ? (typeof c === "string" ? { text: c, done: true } : { ...c, done: !c.done }) : c) } : a) }));
  };
  const markDone = (id) => { update((s) => ({ ...s, appointments: s.appointments.map((a) => a.id === id ? { ...a, completed: true } : a) })); toast.success("Marked complete"); };

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-brand-700">Appointments</div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-brand-900">Follow-ups & visits</h1>
        </div>
        <Button className="btn-primary" onClick={() => setDialog(true)} data-testid="add-appointment-btn"><Plus className="h-4 w-4 mr-1" /> Add appointment</Button>
      </div>

      <div className="grid gap-3">
        {appointments.map((a) => (
          <div key={a.id} className="rounded-2xl border bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-900"><CalendarDays className="h-5 w-5" /></div>
                <div>
                  <div className="font-heading text-lg font-semibold text-brand-900">{a.title}</div>
                  <div className="text-xs text-muted-foreground">{a.date} · {a.time} · {a.doctor || "Doctor"}</div>
                  <div className="text-xs text-muted-foreground">{a.location}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={a.completed ? "done" : "upcoming"} />
                <Button size="sm" variant="outline" onClick={() => remove(a.id)} className="text-critical border-critical/30"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
            {!a.completed && (
              <div className="mt-3 rounded-xl border bg-brand-50/50 p-3">
                <div className="text-xs font-semibold uppercase tracking-widest text-brand-700 mb-2">Before visit checklist</div>
                <div className="space-y-1.5">
                  {a.checklist.map((c, i) => {
                    const item = typeof c === "string" ? { text: c, done: false } : c;
                    return (
                      <label key={i} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={item.done} onCheckedChange={() => toggleItem(a.id, i)} data-testid={`chk-${a.id}-${i}`} />
                        <span className={item.done ? "line-through text-muted-foreground" : ""}>{item.text}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => markDone(a.id)} className="bg-success hover:brightness-95">Mark completed</Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>New appointment</DialogTitle></DialogHeader>
          <div className="grid gap-2">
            <Input placeholder="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} data-testid="appt-title" />
            <Input placeholder="Doctor" value={draft.doctor} onChange={(e) => setDraft({ ...draft, doctor: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} data-testid="appt-date" />
              <Input type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} />
            </div>
            <Input placeholder="Location" value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
            <Textarea placeholder="Notes" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={add} className="bg-brand-900 hover:bg-brand-700" data-testid="save-appt-btn">Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
