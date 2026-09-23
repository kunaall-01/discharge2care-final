import React, { useRef, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { errorMessage, verifySaltEquivalence, verifySaltEquivalenceFromPhoto } from "@/lib/api";
import {
  AlertTriangle, CheckCircle2, FlaskConical, HelpCircle, Loader2, Upload, XCircle,
} from "lucide-react";
import { toast } from "sonner";

const VERDICT_META = {
  EXACT_BRAND_MATCH: {
    label: "Exact brand match",
    tone: "border-success/30 bg-success/5 text-success",
    icon: CheckCircle2,
  },
  SAFE_GENERIC_SUBSTITUTE: {
    label: "Safe generic substitute",
    tone: "border-success/30 bg-success/5 text-success",
    icon: CheckCircle2,
  },
  DOSAGE_MISMATCH: {
    label: "Dosage mismatch",
    tone: "border-warm/30 bg-warm/10 text-warm",
    icon: AlertTriangle,
  },
  UNSAFE_INCOMPATIBLE: {
    label: "Unsafe — not interchangeable",
    tone: "border-destructive/30 bg-destructive/5 text-destructive",
    icon: XCircle,
  },
};

const UNREADABLE_META = {
  label: "Could not read the wrapper",
  tone: "border-border bg-muted text-muted-foreground",
  icon: HelpCircle,
};

const emptySide = { name: "", strength: "", manufacturer: "" };

export default function ChemistVerificationCard() {
  const { medicines } = useApp();
  const [prescribed, setPrescribed] = useState(emptySide);
  const [available, setAvailable] = useState(emptySide);
  const [photo, setPhoto] = useState(null);
  const photoRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const run = async () => {
    if (!prescribed.name.trim()) {
      toast.error("Enter the medicine your doctor prescribed");
      return;
    }
    if (!photo && !available.name.trim()) {
      toast.error("Enter the available medicine or upload a wrapper photo");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const verdict = photo
        ? await verifySaltEquivalenceFromPhoto(photo, prescribed)
        : await verifySaltEquivalence({ prescribed, available });
      setResult(verdict);
      if (!verdict.is_safe_to_use) toast.warning(verdict.patient_guidance);
    } catch (err) {
      setResult(null);
      setError(errorMessage(err));
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const meta = result ? (result.identified === false ? UNREADABLE_META : VERDICT_META[result.verdict_code]) : null;
  const VerdictIcon = meta?.icon;

  return (
    <div className="rounded-3xl border bg-white p-5 card-elev space-y-4">
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold text-brand-900">
          <FlaskConical className="h-4 w-4" /> Salt equivalence check
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          The chemist gave you a different brand? Compare it with what your doctor prescribed before you take it.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <SideInputs
          title="Prescribed by your doctor"
          value={prescribed}
          onChange={setPrescribed}
          testId="chemist-prescribed"
          namePlaceholder="e.g. Pantoprazole or Pantocid"
        />
        <div className="space-y-2">
          <SideInputs
            title="Available at the chemist"
            value={available}
            onChange={setAvailable}
            testId="chemist-available"
            namePlaceholder="e.g. Pantop 40"
          />
          <div className="rounded-2xl border-2 border-dashed p-3 text-center text-xs">
            <input
              ref={photoRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => setPhoto(e.target.files?.[0] || null)}
            />
            <div className="text-muted-foreground">
              or upload a photo of the wrapper — we read the salt and strength from it
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => photoRef.current?.click()}
              data-testid="chemist-photo-choose"
            >
              <Upload className="h-3.5 w-3.5 mr-1" /> {photo ? photo.name : "Choose photo"}
            </Button>
            {photo && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-1"
                onClick={() => { setPhoto(null); if (photoRef.current) photoRef.current.value = ""; }}
                data-testid="chemist-photo-remove"
              >
                Remove photo
              </Button>
            )}
          </div>
        </div>
      </div>

      {medicines.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground">From your plan</span>
          {medicines.slice(0, 5).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setPrescribed({ ...emptySide, name: m.name, strength: m.strength })}
              className="rounded-full border border-brand-500/25 bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-900 hover:bg-brand-100"
            >
              {m.name} {m.strength}
            </button>
          ))}
        </div>
      )}

      <Button
        className="w-full btn-primary"
        onClick={run}
        disabled={loading}
        data-testid="chemist-verify-btn"
      >
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FlaskConical className="h-4 w-4 mr-2" />}
        {loading ? (photo ? "Reading the wrapper photo…" : "Checking salt equivalence…") : "Verify Salt Equivalence"}
      </Button>

      {error && (
        <div
          data-testid="chemist-error"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {result && meta && (
        <div data-testid="chemist-result" className="space-y-3">
          <div
            data-testid="chemist-verdict-badge"
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${meta.tone}`}
          >
            <VerdictIcon className="h-4 w-4" /> {meta.label}
          </div>

          <p className="text-sm text-brand-900">{result.chemist_summary}</p>

          {result.identified === false ? (
            <>
              {result.warning && <p className="text-sm text-muted-foreground">{result.warning}</p>}
              {result.ocr_extracted_text && (
                <div className="rounded-xl border p-3 text-xs">
                  <div className="font-semibold text-muted-foreground mb-1">Text read from the photo</div>
                  <div className="break-words">{result.ocr_extracted_text}</div>
                </div>
              )}
            </>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 text-sm">
              <AnalysisRow
                title="Salt (active ingredient)"
                prescribed={result.salt_analysis.prescribed_salt}
                available={result.salt_analysis.available_salt}
                matches={result.salt_analysis.salts_match}
              />
              <AnalysisRow
                title="Strength"
                prescribed={result.strength_analysis.prescribed_strength}
                available={result.strength_analysis.available_strength}
                matches={result.strength_analysis.strengths_match}
              />
            </div>
          )}

          <div
            data-testid="chemist-guidance"
            className={`rounded-2xl border p-4 text-sm font-medium ${meta.tone}`}
          >
            <div className="flex items-start gap-2">
              <VerdictIcon className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{result.patient_guidance}</span>
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground">
            Support tool, not a medical clearance.{" "}
            {result.source === "llm" ? "Checked with our medicine assistant." : "Checked against our medicine reference."}
          </div>
        </div>
      )}
    </div>
  );
}

function SideInputs({ title, value, onChange, testId, namePlaceholder }) {
  return (
    <div className="rounded-2xl border p-3 space-y-2">
      <div className="text-xs font-semibold uppercase tracking-widest text-brand-700">{title}</div>
      <Input
        placeholder={namePlaceholder}
        value={value.name}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
        data-testid={`${testId}-name`}
      />
      <Input
        placeholder="Strength (40 mg)"
        value={value.strength}
        onChange={(e) => onChange({ ...value, strength: e.target.value })}
        data-testid={`${testId}-strength`}
      />
      <Input
        placeholder="Manufacturer (optional)"
        value={value.manufacturer}
        onChange={(e) => onChange({ ...value, manufacturer: e.target.value })}
        data-testid={`${testId}-manufacturer`}
      />
    </div>
  );
}

function AnalysisRow({ title, prescribed, available, matches }) {
  return (
    <div className="rounded-xl border p-3">
      <div className="text-xs font-semibold text-muted-foreground mb-1">
        {title} {matches ? "· matches" : "· differs"}
      </div>
      <div className="text-xs"><span className="text-muted-foreground">Prescribed:</span> <span className="font-medium">{prescribed || "—"}</span></div>
      <div className="text-xs"><span className="text-muted-foreground">Available:</span> <span className="font-medium">{available || "—"}</span></div>
    </div>
  );
}
