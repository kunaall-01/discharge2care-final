import React, { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Pill, FlaskConical, CalendarDays, MessageSquare, Sparkles, Share2 } from "lucide-react";
import { toast } from "sonner";
import { IDS } from "@/constants/testIds";

export default function WhatChanged() {
  const { medicines, tests, appointments, dailyLog, questions } = useApp();
  const [dialog, setDialog] = useState(false);
  const [share, setShare] = useState({ meds: true, tests: true, appts: true, notes: true, questions: true });

  const cards = [
    { icon: Pill, label: "Medication plan", value: `${medicines.length} medicines`, tone: "brand" },
    { icon: FlaskConical, label: "Investigations", value: `${tests.filter(t=>t.status==="done").length} completed`, tone: "success" },
    { icon: CalendarDays, label: "Appointments", value: `${appointments.filter(a=>a.completed).length} completed`, tone: "brand" },
    { icon: MessageSquare, label: "Patient notes", value: `${dailyLog.filter(d=>d.kind==="note").length}`, tone: "warm" },
    { icon: Sparkles, label: "Questions for doctor", value: `${questions.length}`, tone: "brand" },
  ];

  const doShare = () => {
    setDialog(false);
    toast.success("Continuity summary shared with Dr. Verma");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-brand-700">Continuity</div>
          <h1 className="font-heading text-3xl md:text-5xl font-bold text-brand-900">What changed since your last visit?</h1>
          <p className="mt-2 text-muted-foreground">A summary of what happened during your recovery. You control what is shared.</p>
        </div>
        <Button data-testid={IDS.shareDoctor} onClick={() => setDialog(true)} className="btn-primary self-start"><Share2 className="h-4 w-4 mr-2" /> Share with Doctor</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c, i) => (
          <div key={i} className="rounded-2xl border bg-white p-4 card-elev">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-900 mb-2"><c.icon className="h-4 w-4" /></div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">{c.label}</div>
            <div className="font-heading text-xl font-bold text-brand-900">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border bg-white p-5 card-elev">
        <div className="text-xs font-semibold uppercase tracking-widest text-brand-700 mb-3">Timeline</div>
        <ol className="relative border-l border-border pl-6 space-y-4">
          {[
            ...dailyLog.map((d) => ({ id: d.id, ts: d.ts, kind: d.kind, text: d.text })),
            ...tests.filter((t) => t.status === "done").map((t) => ({ id: t.id, ts: Date.now() - 1e6, kind: "test", text: `${t.name} report uploaded` })),
            ...appointments.filter((a) => a.completed).map((a) => ({ id: a.id, ts: Date.now() - 5e6, kind: "appt", text: `Attended ${a.title}` })),
          ].sort((a,b) => b.ts - a.ts).slice(0, 12).map((e) => (
            <li key={e.id} className="relative">
              <span className="absolute -left-[29px] top-1 grid h-6 w-6 place-items-center rounded-full bg-brand-900 text-white text-[10px]">•</span>
              <div className="text-sm text-brand-900 font-medium">{e.text}</div>
              <div className="text-xs text-muted-foreground">{new Date(e.ts).toLocaleString()}</div>
            </li>
          ))}
        </ol>
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Share with your doctor</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">You control what is shared with your doctor. Choose the sections to include.</p>
          <div className="space-y-2 mt-2">
            {[
              ["meds", "Medication plan"],
              ["tests", "Investigations & reports"],
              ["appts", "Appointments"],
              ["notes", "Patient notes"],
              ["questions", "Questions for doctor"],
            ].map(([k, label]) => (
              <label key={k} className="flex items-center gap-2 rounded-xl border p-3 text-sm cursor-pointer">
                <Checkbox checked={share[k]} onCheckedChange={(v) => setShare({ ...share, [k]: !!v })} data-testid={`share-${k}`} />
                {label}
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={doShare} className="bg-brand-900 hover:bg-brand-700" data-testid="share-confirm">Share summary</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
