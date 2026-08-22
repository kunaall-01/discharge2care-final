import React from "react";
import { useApp } from "@/contexts/AppContext";
import AccessibilityPanel from "@/components/shared/AccessibilityPanel";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Trash2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const { audit, resetDemo } = useApp();

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs uppercase tracking-widest text-brand-700">Settings</div>
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-brand-900">Settings & privacy</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border bg-white p-5 card-elev">
          <div className="font-semibold text-brand-900 mb-2">Accessibility & language</div>
          <p className="text-sm text-muted-foreground mb-3">Adjust text size, contrast, motion and language.</p>
          <AccessibilityPanel trigger={<Button variant="outline">Open accessibility</Button>} />
        </div>
        <div className="rounded-3xl border bg-white p-5 card-elev">
          <div className="font-semibold text-brand-900 mb-2">Demo controls</div>
          <p className="text-sm text-muted-foreground mb-3">Reset the demo to its initial state.</p>
          <Button variant="outline" onClick={() => { resetDemo(); toast.success("Demo reset"); }} data-testid="reset-demo">
            <RefreshCcw className="h-4 w-4 mr-1" /> Reset demo data
          </Button>
        </div>
      </div>
      <div className="rounded-3xl border bg-white p-5 card-elev">
        <div className="text-xs font-semibold uppercase tracking-widest text-brand-700 mb-3 flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Audit activity</div>
        <ol className="relative border-l border-border pl-5 space-y-3">
          {audit.map((a) => (
            <li key={a.id} className="relative">
              <span className="absolute -left-[9px] top-2 h-2 w-2 rounded-full bg-brand-900" />
              <div className="text-sm text-brand-900">{a.text}</div>
              <div className="text-xs text-muted-foreground">{new Date(a.ts).toLocaleString()}</div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
