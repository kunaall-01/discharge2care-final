import React, { useRef, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { pillDatabase } from "@/data/mockData";
import { verifyPill, errorMessage } from "@/lib/api";
import ChemistVerificationCard from "@/components/chemist/ChemistVerificationCard";
import { Upload, CheckCircle2, AlertTriangle, HelpCircle, Loader2, PillBottle, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function PillVerification() {
  const { pillHistory, update, medicines, patient } = useApp();
  const [form, setForm] = useState({ name: "", strength: "", manufacturer: "", batch: "" });
  const [state, setState] = useState({ status: "idle", result: null, source: null });
  const [file, setFile] = useState(null);
  const inputRef = useRef(null);

  const recordHistory = (label, sublabel, status) => {
    update((s) => ({
      ...s,
      pillHistory: [
        { id: `p-${Date.now()}`, ts: Date.now(), form: { name: label, strength: sublabel }, status },
        ...s.pillHistory,
      ].slice(0, 20),
    }));
  };

  // Photo path — real backend call: OCR -> drug identification -> prescription check.
  const runPhotoCheck = async () => {
    setState({ status: "processing", result: null, source: "api" });
    try {
      const res = await verifyPill(file, { patientId: patient?.id });
      const check = res.prescription_check;

      let status;
      if (!res.identified) status = "unknown";
      else if (check) status = check.is_match ? "match" : "mismatch";
      else status = "identified";

      setState({ status, result: res, source: "api" });
      recordHistory(
        res.drug_info?.salt_composition || file.name,
        res.drug_info?.strength || "",
        status
      );
      if (status === "mismatch") toast.error("Medicine does not match the prescription");
      if (status === "unknown" && res.warning) toast.warning(res.warning);
    } catch (err) {
      const message = errorMessage(err);
      setState({ status: "error", result: { message }, source: "api" });
      toast.error(message);
    }
  };

  // Text path — offline check against the locally documented plan.
  const runLocalCheck = () => {
    setState({ status: "processing", result: null, source: "local" });
    setTimeout(() => {
      const name = form.name.trim().toLowerCase();
      const documented = medicines.find((m) => m.name.toLowerCase() === name);
      const known = pillDatabase.find((p) => p.name.toLowerCase() === name);
      const entered = `${form.name} ${form.strength}`.trim();
      let status = "unknown";
      let result = null;
      if (documented && (!form.strength || form.strength.toLowerCase().includes(documented.strength.split(" ")[0].toLowerCase()))) {
        status = "match";
        result = { entered, documented: `${documented.name} ${documented.strength}` };
      } else if (documented) {
        status = "mismatch";
        result = { entered, documented: `${documented.name} ${documented.strength}` };
      } else if (known) {
        status = "mismatch";
        result = { entered, documented: "Not in your active plan" };
      }
      setState({ status, result, source: "local" });
      recordHistory(form.name, form.strength, status);
    }, 800);
  };

  const run = () => {
    if (file) { runPhotoCheck(); return; }
    if (!form.name.trim()) { toast.error("Enter medicine name or upload a photo"); return; }
    runLocalCheck();
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
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <div className="text-muted-foreground">
              Or upload a photo of the pill/packaging
              {file ? <div className="mt-1 text-xs">Photo verification runs OCR on the backend.</div> : null}
            </div>
            <Button variant="outline" onClick={() => inputRef.current?.click()} className="mt-2"><Upload className="h-3.5 w-3.5 mr-1" /> {file ? file.name : "Choose photo"}</Button>
            {file && (
              <Button variant="ghost" size="sm" className="mt-1" onClick={() => { setFile(null); if (inputRef.current) inputRef.current.value = ""; }}>Remove photo</Button>
            )}
          </div>
          <Button className="w-full btn-primary" onClick={run} disabled={state.status === "processing"} data-testid="pill-verify-run">
            {state.status === "processing" ? "Verifying…" : "Verify medicine"}
          </Button>
        </div>

        <div className="rounded-3xl border bg-white p-5 card-elev min-h-[300px]">
          {state.status === "idle" && <div className="text-sm text-muted-foreground">Result will appear here.</div>}
          {state.status === "processing" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full py-10">
              <Loader2 className="h-10 w-10 text-brand-900 animate-spin" />
              <div className="mt-3 font-medium text-brand-900">
                {state.source === "api" ? "Reading the wrapper photo…" : "Checking medicine details…"}
              </div>
            </motion.div>
          )}
          {state.source === "api" && state.status === "error" && (
            <ResultCard tone="danger" icon={<XCircle className="h-6 w-6" />} title="Backend request failed" body={state.result?.message} />
          )}
          {state.source === "api" && state.status !== "error" && state.status !== "processing" && (
            <ApiResultCard status={state.status} result={state.result} />
          )}
          {state.source === "local" && state.status === "match" && (
            <ResultCard tone="success" icon={<CheckCircle2 className="h-6 w-6" />} title="Match found" body={`Information matches your documented plan.`} details={state.result} />
          )}
          {state.source === "local" && state.status === "mismatch" && (
            <ResultCard tone="warning" icon={<AlertTriangle className="h-6 w-6" />} title="Details need verification"
              body="The information does not clearly match your documented medicine. Please confirm with your pharmacist/doctor before taking the medicine." details={state.result} />
          )}
          {state.source === "local" && state.status === "unknown" && (
            <ResultCard tone="muted" icon={<HelpCircle className="h-6 w-6" />} title="Unable to verify" body="Please consult a qualified pharmacist." />
          )}
        </div>
      </div>

      <ChemistVerificationCard />

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
  danger: "border-destructive/30 bg-destructive/5 text-destructive",
  muted: "border-border bg-muted text-muted-foreground",
};

const ResultCard = ({ tone, icon, title, body, details, children }) => (
  <div className="h-full flex flex-col">
    <div className={`inline-flex self-start items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${toneMap[tone]}`}>{icon}{title}</div>
    {body && <p className="mt-3 text-sm">{body}</p>}
    {details && (
      <div className="mt-3 rounded-xl border p-3 text-sm space-y-1">
        <div><span className="text-muted-foreground">You entered:</span> <span className="font-medium">{details.entered}</span></div>
        <div><span className="text-muted-foreground">Documented:</span> <span className="font-medium">{details.documented}</span></div>
      </div>
    )}
    {children}
    <div className="mt-auto text-[11px] text-muted-foreground pt-3">This is a support tool. Not a medical clearance.</div>
  </div>
);

const ApiResultCard = ({ status, result }) => {
  if (status === "unknown" || !result?.identified) {
    return (
      <ResultCard
        tone="muted"
        icon={<HelpCircle className="h-6 w-6" />}
        title="Unable to identify"
        body={result?.warning || "Please consult a qualified pharmacist."}
      >
        {result?.ocr_extracted_text && (
          <div className="mt-3 rounded-xl border p-3 text-xs">
            <div className="font-semibold text-muted-foreground mb-1">Text read from the photo</div>
            <div className="break-words">{result.ocr_extracted_text || "(nothing detected)"}</div>
          </div>
        )}
      </ResultCard>
    );
  }

  const drug = result.drug_info;
  const check = result.prescription_check;
  const tone = check ? (check.is_match ? "success" : "warning") : "muted";
  const icon = check ? (check.is_match ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />) : <PillBottle className="h-6 w-6" />;
  const title = check ? (check.is_match ? "Matches your prescription" : "Not on your prescription") : "Medicine identified";

  return (
    <ResultCard tone={tone} icon={icon} title={title} body={check?.message || result.warning || "Identified from the wrapper photo. No prescription check was run."}>
      <div className="mt-3 space-y-2 text-sm">
        <div className="rounded-xl border p-3 space-y-1">
          <div className="font-semibold">{drug.salt_composition} {drug.strength}</div>
          {drug.brand_names?.length > 0 && (
            <div className="text-xs text-muted-foreground">Also sold as: {drug.brand_names.join(", ")}</div>
          )}
          <div className="text-xs text-muted-foreground">
            {drug.category} · typical dose {drug.common_dosage}
          </div>
          <div className="text-xs">
            <span className="text-muted-foreground">Detection confidence:</span>{" "}
            <span className="font-medium">{Math.round((result.confidence || 0) * 100)}%</span>
          </div>
        </div>
        {drug.uses?.length > 0 && (
          <div className="rounded-xl border p-3">
            <div className="text-xs font-semibold text-muted-foreground mb-1">Used for</div>
            <ul className="list-disc pl-4 text-xs space-y-0.5">{drug.uses.map((u) => <li key={u}>{u}</li>)}</ul>
          </div>
        )}
        {drug.side_effects?.length > 0 && (
          <div className="rounded-xl border p-3">
            <div className="text-xs font-semibold text-muted-foreground mb-1">Possible side effects</div>
            <ul className="list-disc pl-4 text-xs space-y-0.5">{drug.side_effects.map((u) => <li key={u}>{u}</li>)}</ul>
          </div>
        )}
      </div>
    </ResultCard>
  );
};
