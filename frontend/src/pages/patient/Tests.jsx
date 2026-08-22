import React from "react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/shared/StatusBadge";
import { FlaskConical, Upload, Check, FileText } from "lucide-react";
import { toast } from "sonner";

export default function Tests() {
  const { tests, update } = useApp();
  const uploadReport = (id) => {
    update((s) => ({ ...s, tests: s.tests.map((t) => t.id === id ? { ...t, report: { name: `${t.name.replace(/\s+/g,"_")}_report.pdf`, uploadedAt: Date.now() }, status: "done" } : t) }));
    toast.success("Report uploaded and organized.");
  };
  const markDone = (id) => {
    update((s) => ({ ...s, tests: s.tests.map((t) => t.id === id ? { ...t, status: "done" } : t) }));
    toast.success("Test marked complete");
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs uppercase tracking-widest text-brand-700">Tests & investigations</div>
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-brand-900">Test tracker</h1>
        <p className="mt-1 text-muted-foreground">Store reports here. Clinical interpretation should be done by a qualified clinician.</p>
      </div>
      <div className="grid gap-3">
        {tests.map((t) => (
          <div key={t.id} data-testid={`test-${t.id}`} className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl border bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-900"><FlaskConical className="h-5 w-5" /></div>
              <div>
                <div className="font-heading text-lg font-semibold text-brand-900">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.date} · {t.location}</div>
                {t.report && (
                  <div className="mt-1 inline-flex items-center gap-1 text-xs text-success">
                    <FileText className="h-3 w-3" /> {t.report.name}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={t.status === "done" ? "done" : "upcoming"} />
              {t.status !== "done" ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => markDone(t.id)}><Check className="h-3.5 w-3.5 mr-1" /> Done</Button>
                  <Button size="sm" onClick={() => uploadReport(t.id)} data-testid={`upload-report-${t.id}`} className="bg-brand-900 hover:bg-brand-700"><Upload className="h-3.5 w-3.5 mr-1" /> Upload report</Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={() => uploadReport(t.id)}>Replace</Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
