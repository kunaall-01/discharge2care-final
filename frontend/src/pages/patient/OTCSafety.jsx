import React, { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { otcDataset } from "@/data/mockData";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, ShieldCheck, HelpCircle, Loader2, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function OTCSafety() {
  const { medicines, otcHistory, update } = useApp();
  const [form, setForm] = useState({ name: "", ingredient: "", strength: "", form: "" });
  const [state, setState] = useState({ status: "idle", conflicts: [] });

  const run = () => {
    if (!form.name.trim()) { toast.error("Enter an OTC medicine name"); return; }
    setState({ status: "processing", conflicts: [] });
    setTimeout(() => {
      const entry = otcDataset.find((d) => d.name.toLowerCase() === form.name.trim().toLowerCase());
      let status = "review"; let conflicts = [];
      if (entry) {
        const conflictNames = entry.conflictsWith.filter((n) => medicines.some((m) => m.name.toLowerCase() === n.toLowerCase()));
        if (conflictNames.length) { status = "conflict"; conflicts = conflictNames.map((n) => ({ name: n, note: entry.note })); }
        else status = "safe";
      } else status = "review";
      setState({ status, conflicts });
      update((s) => ({ ...s, otcHistory: [{ id: `o-${Date.now()}`, ts: Date.now(), form, status, conflicts }, ...s.otcHistory].slice(0, 20) }));
    }, 1200);
  };

  const clear = () => { update({ otcHistory: [] }); toast.success("History cleared"); };

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs uppercase tracking-widest text-brand-700">OTC safety</div>
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-brand-900">OTC Drug Safety Check</h1>
        <p className="mt-1 text-muted-foreground">Check an over-the-counter medicine against your documented plan. Not a diagnostic or prescribing system.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border bg-white p-5 card-elev space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-brand-900"><ShieldCheck className="h-4 w-4" /> Enter OTC details</div>
          <Input placeholder="Medicine name (e.g., Ibuprofen)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="otc-name" />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Active ingredient" value={form.ingredient} onChange={(e) => setForm({ ...form, ingredient: e.target.value })} />
            <Input placeholder="Strength" value={form.strength} onChange={(e) => setForm({ ...form, strength: e.target.value })} />
          </div>
          <Input placeholder="Form (tablet, syrup)" value={form.form} onChange={(e) => setForm({ ...form, form: e.target.value })} />
          <Button className="w-full btn-primary" onClick={run} data-testid="otc-check-run">Run safety check</Button>
          <div className="text-[11px] text-muted-foreground">Try: Ibuprofen, Cetirizine, Antacid</div>
        </div>

        <div className="rounded-3xl border bg-white p-5 card-elev min-h-[280px]">
          {state.status === "idle" && <div className="text-sm text-muted-foreground">Results will show here.</div>}
          {state.status === "processing" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full py-10">
              <Loader2 className="h-10 w-10 text-brand-900 animate-spin" />
              <div className="mt-3 font-medium text-brand-900">Checking against your documented medicines…</div>
            </motion.div>
          )}
          {state.status === "safe" && (
            <Result tone="success" icon={<CheckCircle2 className="h-5 w-5" />} title="No known conflict in demo dataset"
              body="No conflict was found in the prototype's demo dataset. This is not a medical clearance or prescription." />
          )}
          {state.status === "review" && (
            <Result tone="muted" icon={<HelpCircle className="h-5 w-5" />} title="Review needed"
              body="This OTC medicine requires verification against your current medication plan. Please confirm with a qualified clinician or pharmacist." />
          )}
          {state.status === "conflict" && (
            <div className="space-y-3">
              <Result tone="critical" icon={<ShieldAlert className="h-5 w-5" />} title="Potential conflict flagged"
                body="A possible interaction/conflict was detected. Do not change your medication plan based on this result. Please confirm with a qualified clinician or pharmacist." />
              <div className="rounded-xl border p-3">
                <div className="text-xs font-semibold uppercase tracking-widest text-brand-700 mb-1">Documented medicines flagged</div>
                <ul className="text-sm space-y-1">
                  {state.conflicts.map((c) => (
                    <li key={c.name} className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-critical mt-0.5" /> <div><span className="font-medium">{c.name}</span>{c.note && <div className="text-xs text-muted-foreground">{c.note}</div>}</div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-3xl border bg-white p-5 card-elev">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold uppercase tracking-widest text-brand-700">Recent checks</div>
          {otcHistory.length > 0 && <Button size="sm" variant="outline" onClick={clear}><Trash2 className="h-3.5 w-3.5 mr-1" /> Clear history</Button>}
        </div>
        {otcHistory.length === 0 ? <div className="text-sm text-muted-foreground">No checks yet.</div> : (
          <div className="space-y-2">
            {otcHistory.slice(0, 8).map((h) => (
              <div key={h.id} className="flex items-center justify-between rounded-xl border p-3 text-sm">
                <div className="font-medium">{h.form.name}</div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">{h.status}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const toneClasses = {
  success: "border-success/30 bg-success/5 text-success",
  critical: "border-critical/30 bg-critical/5 text-critical",
  muted: "border-border bg-muted text-muted-foreground",
};
const Result = ({ tone, icon, title, body }) => (
  <div>
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${toneClasses[tone]}`}>{icon}{title}</div>
    <p className="mt-3 text-sm">{body}</p>
  </div>
);
