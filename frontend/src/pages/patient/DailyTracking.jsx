import React, { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pill, MessageSquare, ClipboardCheck, StickyNote } from "lucide-react";
import { toast } from "sonner";

export default function DailyTracking() {
  const { dailyLog, questions, update } = useApp();
  const [note, setNote] = useState("");
  const [q, setQ] = useState("");

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
