import React, { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/contexts/AppContext";
import { extractionResult } from "@/data/mockData";
import { Upload, FileText, Image as ImageIcon, X, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const STEPS = [
  "Document uploaded",
  "Reading document",
  "Extracting medicines",
  "Finding tests",
  "Finding appointments",
  "Finding care instructions",
  "Preparing review",
];

export default function DischargeUpload() {
  const { update, addAudit } = useApp();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [step, setStep] = useState(-1);
  const inputRef = useRef(null);

  const onSelect = useCallback((f) => {
    if (!f) return;
    const okType = /pdf|image\//.test(f.type) || /\.(pdf|png|jpg|jpeg|heic)$/i.test(f.name);
    if (!okType) { toast.error("Please upload a PDF or image file."); return; }
    setFile(f);
  }, []);

  const startProcess = () => {
    setStep(0);
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setStep(i);
      if (i >= STEPS.length - 1) {
        clearInterval(iv);
        setTimeout(() => {
          update({ extractionDraft: extractionResult });
          addAudit("Discharge summary processed by AI");
          navigate("/patient/extraction-review");
        }, 900);
      }
    }, 750);
  };

  const useDemoDoc = () => { setFile({ name: "Discharge_Ramesh_Sharma.pdf", type: "application/pdf", size: 214000 }); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-brand-900">Turn your discharge summary into a recovery plan.</h1>
        <p className="mt-2 text-muted-foreground">We'll read your document, extract the important details, and let you review before anything becomes active.</p>
      </div>

      {step === -1 && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2 rounded-3xl border border-brand-900/10 bg-white p-6 card-elev">
            <div
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); onSelect(e.dataTransfer.files?.[0]); }}
              className={`relative rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${drag ? "border-brand-500 bg-brand-50" : "border-border bg-brand-50/40"}`}>
              <input ref={inputRef} type="file" accept=".pdf,image/*" className="hidden"
                data-testid="upload-file-input" onChange={(e) => onSelect(e.target.files?.[0])} />
              <div className="grid h-14 w-14 mx-auto place-items-center rounded-2xl bg-white shadow"><Upload className="h-6 w-6 text-brand-900" /></div>
              <div className="mt-3 font-heading text-lg font-semibold text-brand-900">Drag & drop your file here</div>
              <div className="text-sm text-muted-foreground">PDF, PNG, JPG · up to 10 MB</div>
              <button data-testid="upload-browse-btn" onClick={() => inputRef.current?.click()}
                className="mt-4 rounded-full border border-brand-900/20 bg-white px-5 py-2 text-sm font-semibold text-brand-900 hover:bg-brand-100">Browse files</button>
              <div className="mt-4 text-xs text-muted-foreground">or</div>
              <button data-testid="upload-demo-doc" onClick={useDemoDoc}
                className="mt-2 text-sm font-semibold text-brand-700 underline underline-offset-2">Use sample discharge document</button>
            </div>

            {file && (
              <div className="mt-4 flex items-center justify-between rounded-2xl border bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-900">
                    {file.type?.includes("pdf") ? <FileText className="h-5 w-5" /> : <ImageIcon className="h-5 w-5" />}
                  </div>
                  <div>
                    <div className="font-medium text-brand-900">{file.name}</div>
                    <div className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB · {file.type || "document"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button aria-label="Remove file" className="grid h-8 w-8 place-items-center rounded-lg border hover:bg-muted" onClick={() => setFile(null)}><X className="h-4 w-4" /></button>
                  <button data-testid="upload-process-btn" onClick={startProcess} className="btn-primary">Process document</button>
                </div>
              </div>
            )}
          </div>
          <div className="rounded-3xl border border-brand-900/10 bg-white p-5 card-elev space-y-3">
            <h3 className="font-heading text-lg font-semibold text-brand-900">What we do</h3>
            <ul className="space-y-2 text-sm">
              {["Read the document (OCR)", "Identify medicines with dose & timing", "Find tests and appointments", "List care instructions", "Wait for your confirmation"].map((s, i) => (
                <li key={i} className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-success mt-0.5" /> {s}</li>
              ))}
            </ul>
            <div className="rounded-xl border border-brand-500/25 bg-brand-50 p-3 text-xs text-brand-900">
              Nothing gets activated until you review and confirm.
            </div>
          </div>
        </div>
      )}

      {step >= 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="relative overflow-hidden rounded-3xl border border-brand-900/10 bg-white p-6 card-elev min-h-[400px]">
            <div className="text-xs uppercase tracking-widest text-brand-700">Processing</div>
            <div className="mt-2 font-heading text-xl font-bold text-brand-900">{file?.name}</div>
            <div className="relative mt-6 h-64 rounded-2xl bg-brand-50 overflow-hidden border">
              <div className="scan-line" />
              <div className="p-4 space-y-2">
                {[80, 60, 90, 50, 70, 65, 85].map((w, i) => (
                  <div key={i} className="h-3 rounded-full bg-brand-900/10" style={{ width: `${w}%` }} />
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-brand-900/10 bg-white p-6 card-elev">
            <div className="text-xs uppercase tracking-widest text-brand-700">Progress</div>
            <ol className="mt-4 space-y-3">
              <AnimatePresence>
                {STEPS.map((s, i) => (
                  <motion.li key={s} initial={{ opacity: 0, x: -6 }} animate={{ opacity: i <= step ? 1 : 0.4, x: 0 }}
                    className="flex items-center gap-3">
                    <div className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${i < step ? "bg-success text-white" : i === step ? "bg-brand-900 text-white" : "bg-muted text-muted-foreground"}`}>
                      {i < step ? <CheckCircle2 className="h-4 w-4" /> : i === step ? <Loader2 className="h-4 w-4 animate-spin" /> : i + 1}
                    </div>
                    <div className={`text-sm ${i <= step ? "text-brand-900 font-medium" : "text-muted-foreground"}`}>{s}</div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
