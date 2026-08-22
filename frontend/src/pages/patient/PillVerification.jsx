import React, { useRef, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { pillDatabase } from "@/data/mockData";
import { Upload, CheckCircle2, AlertTriangle, HelpCircle, Loader2, PillBottle } from "lucide-react";
import { toast } from "sonner";

export default function PillVerification() {
  const { pillHistory, update, medicines } = useApp();
  const [form, setForm] = useState({ name: "", strength: "", manufacturer: "", batch: "" });
  const [state, setState] = useState({ status: "idle", result: null }); // idle | processing | match | mismatch | unknown
  const [file, setFile] = useState(null);
  const inputRef = useRef(null);

  const run = () => {
    if (!form.name && !file) { toast.error("Enter medicine name or upload a photo"); return; }
    setState({ status: "processing", result: null });
    setTimeout(() => {
      const name = form.name.trim().toLowerCase();
      const documented = medicines.find((m) => m.name.toLowerCase() === name);
      const known = pillDatabase.find((p) => p.name.toLowerCase() === name);
      let status = "unknown"; let result = null;
      if (documented && (!form.strength || form.strength.toLowerCase().includes(documented.strength.split(" ")[0].toLowerCase()))) {
        status = "match";
        result = { entered: `${form.name} ${form.strength}`.trim(), documented: `${documented.name} ${documented.strength}` };
      } else if (documented) {
        status = "mismatch"; result = { entered: `${form.name} ${form.strength}`.trim(), documented: `${documented.name} ${documented.strength}` };
      } else if (known) {
        status = "mismatch"; result = { entered: `${form.name} ${form.strength}`.trim(), documented: "Not in your active plan" };
      }
      setState({ status, result });
      update((s) => ({ ...s, pillHistory: [{ id: `p-${Date.now()}`, ts: Date.now(), form, status }, ...s.pillHistory].slice(0, 20) }));
    }, 1600);
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs uppercase tracking-widest text-brand-700">Chemist safety</div>
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-brand-900">Chemist Pill Verification</h1>
        <p className="mt-1 text-muted-foreground">Check the medicine you received against your documented plan. This is a support tool, not a prescription.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border bg-white p-5 card-elev space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-brand-900"><PillBottle className="h-4 w-4" /> Enter medicine details</div>
          <Input placeholder="Medicine name (e.g., Paracetamol)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="pill-name" />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Strength (500 mg)" value={form.strength} onChange={(e) => setForm({ ...form, strength: e.target.value })} data-testid="pill-strength" />
            <Input placeholder="Manufacturer" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} />
          </div>
          <Input placeholder="Batch (optional)" value={form.batch} onChange={(e) => setForm({ ...form, batch: e.target.value })} />
          <div className="rounded-xl border-2 border-dashed p-4 text-center text-sm">
            <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => setFile(e.target.files?.[0])} />
            <div className="text-muted-foreground">Or upload a photo of the pill/packaging</div>
            <Button variant="outline" onClick={() => inputRef.current?.click()} className="mt-2"><Upload className="h-3.5 w-3.5 mr-1" /> {file ? file.name : "Choose photo"}</Button>
          </div>
          <Button className="w-full btn-primary" onClick={run} data-testid="pill-verify-run">Verify medicine</Button>
        </div>

        <div className="rounded-3xl border bg-white p-5 card-elev min-h-[300px]">
          {state.status === "idle" && <div className="text-sm text-muted-foreground">Result will appear here.</div>}
          {state.status === "processing" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full py-10">
              <Loader2 className="h-10 w-10 text-brand-900 animate-spin" />
              <div className="mt-3 font-medium text-brand-900">Checking medicine details…</div>
            </motion.div>
          )}
          {state.status === "match" && (
            <ResultCard tone="success" icon={<CheckCircle2 className="h-6 w-6" />} title="Match found" body={`Information matches your documented plan.`} details={state.result} />
          )}
          {state.status === "mismatch" && (
            <ResultCard tone="warning" icon={<AlertTriangle className="h-6 w-6" />} title="Details need verification"
              body="The information does not clearly match your documented medicine. Please confirm with your pharmacist/doctor before taking the medicine." details={state.result} />
          )}
          {state.status === "unknown" && (
            <ResultCard tone="muted" icon={<HelpCircle className="h-6 w-6" />} title="Unable to verify" body="Please consult a qualified pharmacist." />
          )}
        </div>
      </div>

      <div className="rounded-3xl border bg-white p-5 card-elev">
        <div className="text-xs font-semibold uppercase tracking-widest text-brand-700 mb-2">Recent checks</div>
        {pillHistory.length === 0 ? <div className="text-sm text-muted-foreground">No verifications yet.</div> : (
          <div className="space-y-2">
            {pillHistory.slice(0, 6).map((h) => (
              <div key={h.id} className="flex items-center justify-between rounded-xl border p-3 text-sm">
                <div className="font-medium">{h.form.name} {h.form.strength}</div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">{h.status}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const toneMap = {
  success: "border-success/30 bg-success/5 text-success",
  warning: "border-warm/30 bg-warm/10 text-warm",
  muted: "border-border bg-muted text-muted-foreground",
};
const ResultCard = ({ tone, icon, title, body, details }) => (
  <div className="h-full flex flex-col">
    <div className={`inline-flex self-start items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${toneMap[tone]}`}>{icon}{title}</div>
    <p className="mt-3 text-sm">{body}</p>
    {details && (
      <div className="mt-3 rounded-xl border p-3 text-sm space-y-1">
        <div><span className="text-muted-foreground">You entered:</span> <span className="font-medium">{details.entered}</span></div>
        <div><span className="text-muted-foreground">Documented:</span> <span className="font-medium">{details.documented}</span></div>
      </div>
    )}
    <div className="mt-auto text-[11px] text-muted-foreground pt-3">This is a support tool. Not a medical clearance.</div>
  </div>
);
