import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import StatusBadge from "@/components/shared/StatusBadge";
import { Pill, FlaskConical, CalendarDays, ClipboardList, Edit3, Flag, Check, Eye, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export default function ExtractionReview() {
  const { extractionDraft, update } = useApp();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(null); // {section, idx}
  const draft = extractionDraft;

  if (!draft) {
    return (
      <div className="rounded-3xl border bg-white p-8 text-center card-elev">
        <p className="text-muted-foreground">No extraction yet. Upload a discharge summary first.</p>
        <Button onClick={() => navigate("/patient/discharge")} className="mt-3 btn-primary">Upload discharge</Button>
      </div>
    );
  }

  const updateItem = (section, idx, patch) => {
    update((s) => ({ ...s, extractionDraft: { ...s.extractionDraft, [section]: s.extractionDraft[section].map((it, i) => i === idx ? { ...it, ...patch } : it) } }));
  };
  const toggleConfirm = (idx) => {
    const cur = draft.medicines[idx];
    updateItem("medicines", idx, { confirmed: !cur.confirmed });
  };

  const allConfirmed = draft.medicines.every((m) => m.confirmed);
  const proceed = () => { if (!allConfirmed) { toast.warning("Please confirm all medicines first."); return; } navigate("/patient/care-plan"); };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-brand-700">AI Extraction</div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-brand-900">Review your extracted information</h1>
          <p className="mt-1 text-muted-foreground">Please verify these details before creating your recovery plan.</p>
        </div>
        <div className="rounded-2xl border border-warm/30 bg-warm/10 p-3 text-sm flex items-start gap-2 max-w-md">
          <ShieldAlert className="h-4 w-4 text-warm mt-0.5" />
          <div>Nothing is activated yet. You control what becomes part of your plan.</div>
        </div>
      </div>

      <Group title="Medicines" icon={<Pill className="h-4 w-4" />} count={draft.medicines.length}>
        {draft.medicines.map((m, i) => (
          <div key={m.id} data-testid={`extract-med-${i}`} className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl border p-4 bg-white">
            <div className="flex-1">
              <div className="font-heading text-lg font-semibold text-brand-900">{m.name} <span className="text-brand-700/70">{m.strength}</span></div>
              <div className="text-sm text-muted-foreground">{m.dose} · {m.frequency} · {m.duration}</div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={m.confirmed ? "confirmed" : "pending"} />
              <Button variant="outline" size="sm" onClick={() => setEditing({ section: "medicines", idx: i })} data-testid={`edit-med-${i}`}><Edit3 className="h-3.5 w-3.5 mr-1" /> Edit</Button>
              <Button variant="outline" size="sm" onClick={() => toast.info("Flagged for verification")}><Flag className="h-3.5 w-3.5 mr-1" /> Flag</Button>
              <Button variant="outline" size="sm"><Eye className="h-3.5 w-3.5 mr-1" /> Source</Button>
              <Button size="sm" onClick={() => toggleConfirm(i)} data-testid={`confirm-med-${i}`}
                className={m.confirmed ? "bg-success hover:brightness-95" : "bg-brand-900 hover:bg-brand-700"}>
                <Check className="h-3.5 w-3.5 mr-1" /> {m.confirmed ? "Confirmed" : "Confirm"}
              </Button>
            </div>
          </div>
        ))}
      </Group>

      <Group title="Tests" icon={<FlaskConical className="h-4 w-4" />} count={draft.tests.length}>
        {draft.tests.map((t, i) => (
          <div key={t.id} className="flex items-center justify-between rounded-2xl border p-4 bg-white">
            <div>
              <div className="font-heading text-lg font-semibold text-brand-900">{t.name}</div>
              <div className="text-sm text-muted-foreground">{t.date} · {t.location}</div>
            </div>
            <StatusBadge status="upcoming" />
          </div>
        ))}
      </Group>

      <Group title="Appointments" icon={<CalendarDays className="h-4 w-4" />} count={draft.appointments.length}>
        {draft.appointments.map((a) => (
          <div key={a.id} className="flex items-center justify-between rounded-2xl border p-4 bg-white">
            <div>
              <div className="font-heading text-lg font-semibold text-brand-900">{a.title}</div>
              <div className="text-sm text-muted-foreground">{a.date} · {a.time} · {a.doctor}</div>
            </div>
            <StatusBadge status="upcoming" />
          </div>
        ))}
      </Group>

      <Group title="Care instructions" icon={<ClipboardList className="h-4 w-4" />} count={draft.careTasks.length}>
        {draft.careTasks.map((c) => (
          <div key={c.id} className="rounded-2xl border p-4 bg-white">
            <div className="font-heading text-lg font-semibold text-brand-900">{c.title}</div>
            <div className="text-sm text-muted-foreground">{c.schedule}</div>
            {c.note && <div className="mt-1 text-xs text-muted-foreground">Note: {c.note}</div>}
          </div>
        ))}
      </Group>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button variant="outline" onClick={() => navigate("/patient/discharge")} data-testid="reupload-btn">Re-upload document</Button>
        <Button data-testid="proceed-careplan-btn" onClick={proceed} className="btn-primary">
          Proceed to activate care plan
        </Button>
      </div>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit item</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              {["name", "strength", "dose", "frequency", "duration"].map((k) => (
                <div key={k}>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{k}</label>
                  <Input value={draft.medicines[editing.idx][k] || ""}
                    onChange={(e) => updateItem("medicines", editing.idx, { [k]: e.target.value })} />
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setEditing(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const Group = ({ title, icon, count, children }) => (
  <section className="rounded-3xl border border-brand-900/10 bg-white p-4 md:p-5 card-elev">
    <div className="mb-3 flex items-center justify-between">
      <h3 className="font-heading text-sm font-semibold uppercase tracking-widest text-brand-700 flex items-center gap-1.5">{icon}{title}</h3>
      <span className="text-xs text-muted-foreground">{count} items</span>
    </div>
    <div className="space-y-3">{children}</div>
  </section>
);
