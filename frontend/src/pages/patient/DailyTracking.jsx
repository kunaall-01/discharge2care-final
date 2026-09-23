import React, { useCallback, useEffect, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pill, MessageSquare, ClipboardCheck, StickyNote, Check, X, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getAdherenceSchedule, getAdherenceSummary, recordDose, errorMessage } from "@/lib/api";

const STATUS_STYLE = {
  taken: "bg-success/10 text-success border-success/30",
  missed: "bg-critical/10 text-critical border-critical/30",
  skipped: "bg-muted text-muted-foreground border-border",
  upcoming: "bg-brand-50 text-brand-900 border-brand-500/25",
  overdue: "bg-amber-50 text-amber-700 border-amber-300",
};

export default function DailyTracking() {
  const { dailyLog, questions, update, patient } = useApp();
  const [note, setNote] = useState("");
  const [q, setQ] = useState("");
  const [schedule, setSchedule] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");

  const load = useCallback(async () => {
    if (!patient?.id) return;
    try {
      const [sched, summ] = await Promise.all([
        getAdherenceSchedule(patient.id),
        getAdherenceSummary(patient.id, { days: 7 }),
      ]);
      setSchedule(sched);
      setSummary(summ);
      setLoadError("");
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [patient?.id]);

  useEffect(() => { load(); }, [load]);

  const record = async (slot, status) => {
    const key = `${slot.time}-${status}`;
    setSavingKey(key);
    try {
      await recordDose({
        patientId: patient.id,
        medicineId: slot.medicine_id,
        medicineName: slot.medicine_name,
        date: slot.date,
        time: slot.time,
        status,
      });
      toast.success(status === "taken" ? `${slot.medicine_name} marked taken` : `${slot.medicine_name} marked ${status}`);
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSavingKey("");
    }
  };

  const addNote = () => {
    if (!note.trim()) return;
    update((s) => ({ ...s, dailyLog: [{ id: `d-${Date.now()}`, ts: Date.now(), kind: "note", text: note }, ...s.dailyLog] }));
    setNote(""); toast.success("Note added");
  };
  const addQ = () => {
    if (!q.trim()) return;
    update((s) => ({ ...s, questions: [{ id: `q-${Date.now()}`, text: q, askedAt: Date.now() }, ...s.questions] }));
    setQ(""); toast.success("Question saved for doctor");
  };
  const iconFor = (k) => ({ medicine: Pill, note: StickyNote, appointment: ClipboardCheck }[k] || StickyNote);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs uppercase tracking-widest text-brand-700">Daily tracking</div>
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-brand-900">Your recovery log</h1>
        <p className="mt-1 text-muted-foreground">A quick way to record how you feel and what you did today.</p>
      </div>

      <div className="rounded-3xl border border-brand-900/10 bg-white p-5 card-elev" data-testid="adherence-card">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 font-semibold text-brand-900"><Pill className="h-4 w-4" /> Today's medicines</div>
          {summary?.adherence_pct != null && (
            <div className="text-xs text-muted-foreground">7-day adherence <span className="font-semibold text-brand-900">{summary.adherence_pct}%</span></div>
          )}
        </div>

        {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading today's doses…</div>}

        {!loading && loadError && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800" data-testid="adherence-error">
            Could not load your dose schedule ({loadError}). Confirm a discharge summary to activate your care plan.
          </div>
        )}

        {!loading && !loadError && schedule && schedule.slots.length === 0 && (
          <div className="text-sm text-muted-foreground">No doses scheduled for today.</div>
        )}

        {!loading && !loadError && schedule && schedule.slots.length > 0 && (
          <ul className="space-y-2">
            {schedule.slots.map((slot) => {
              const key = `${slot.medicine_id}-${slot.time}`;
              return (
                <li key={key} data-testid={`dose-slot-${key}`} className="flex flex-wrap items-center gap-3 rounded-2xl border p-3">
                  <div className="flex items-center gap-2 w-20 shrink-0 font-mono text-sm text-brand-900">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" /> {slot.time}
                  </div>
                  <div className="flex-1 min-w-[120px]">
                    <div className="text-sm font-medium text-brand-900">{slot.medicine_name} {slot.strength}</div>
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[slot.status] || STATUS_STYLE.upcoming}`}>
                    {slot.status === "overdue" && <AlertTriangle className="mr-1 inline h-3 w-3" />}
                    {slot.status}
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={!!savingKey} onClick={() => record(slot, "taken")} data-testid={`dose-taken-${key}`} className="text-success border-success/40 hover:bg-success/5">
                      {savingKey === `${slot.time}-taken` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Taken
                    </Button>
                    <Button size="sm" variant="outline" disabled={!!savingKey} onClick={() => record(slot, "missed")} data-testid={`dose-missed-${key}`} className="text-critical border-critical/40 hover:bg-critical/5">
                      {savingKey === `${slot.time}-missed` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />} Missed
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {!loading && !loadError && schedule && schedule.overdue.length > 0 && (
          <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800" data-testid="adherence-overdue">
            {schedule.overdue.length} dose{schedule.overdue.length > 1 ? "s" : ""} overdue. Your care circle is shown these so they can remind you.
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border bg-white p-5 card-elev">
          <div className="flex items-center gap-2 mb-2 font-semibold text-brand-900"><StickyNote className="h-4 w-4" /> Add a note</div>
          <div className="flex gap-2">
            <Input placeholder="How are you feeling?" value={note} onChange={(e) => setNote(e.target.value)} data-testid="daily-note-input" />
            <Button onClick={addNote} className="bg-brand-900 hover:bg-brand-700" data-testid="daily-note-add">Add</Button>
          </div>
        </div>
        <div className="rounded-3xl border bg-white p-5 card-elev">
          <div className="flex items-center gap-2 mb-2 font-semibold text-brand-900"><MessageSquare className="h-4 w-4" /> Question for doctor</div>
          <div className="flex gap-2">
            <Input placeholder="Ask something for your next visit" value={q} onChange={(e) => setQ(e.target.value)} data-testid="daily-q-input" />
            <Button onClick={addQ} className="bg-brand-900 hover:bg-brand-700" data-testid="daily-q-add">Save</Button>
          </div>
          {questions.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              {questions.slice(0, 5).map((qq) => <li key={qq.id}>· {qq.text}</li>)}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-3xl border bg-white p-5 card-elev">
        <div className="text-xs font-semibold uppercase tracking-widest text-brand-700 mb-3">Timeline</div>
        <ol className="relative border-l border-border pl-6 space-y-4">
          {dailyLog.map((d) => {
            const Icon = iconFor(d.kind);
            return (
              <li key={d.id} className="relative">
                <span className="absolute -left-[29px] top-1 grid h-6 w-6 place-items-center rounded-full bg-brand-900 text-white"><Icon className="h-3 w-3" /></span>
                <div className="text-sm text-brand-900 font-medium">{d.text}</div>
                <div className="text-xs text-muted-foreground">{new Date(d.ts).toLocaleString()}</div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
