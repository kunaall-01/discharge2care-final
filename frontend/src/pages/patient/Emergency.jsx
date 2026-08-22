import React, { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { QrCode, Share2, ShieldCheck, Copy } from "lucide-react";
import { toast } from "sonner";

export default function Emergency() {
  const { patient, medicines, update } = useApp();
  const [info, setInfo] = useState({
    allergies: patient.allergies.join(", "),
    conditions: patient.diagnosis,
    contact: `${patient.emergencyContact.name} · ${patient.emergencyContact.phone}`,
  });
  const [shared, setShared] = useState(false);

  const save = () => { toast.success("Emergency card updated"); };
  const copy = async () => {
    const text = `EMERGENCY CARD — ${patient.name}\nAllergies: ${info.allergies}\nCondition: ${info.conditions}\nContact: ${info.contact}\nActive medicines: ${medicines.map(m => `${m.name} ${m.strength}`).join(", ")}`;
    try { await navigator.clipboard.writeText(text); toast.success("Copied to clipboard"); } catch { toast.error("Copy failed"); }
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs uppercase tracking-widest text-brand-700">Emergency</div>
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-brand-900">Emergency information card</h1>
        <p className="mt-1 text-muted-foreground">Patient-controlled. Not exposed publicly.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 rounded-3xl border bg-white p-5 card-elev space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-muted-foreground">Name</div>
              <div className="font-heading text-lg font-semibold text-brand-900">{patient.name}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Blood group</div>
              <div className="font-heading text-lg font-semibold text-brand-900">{patient.bloodGroup}</div>
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Emergency contact</div>
            <Input value={info.contact} onChange={(e) => setInfo({ ...info, contact: e.target.value })} data-testid="emg-contact" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Allergies</div>
            <Input value={info.allergies} onChange={(e) => setInfo({ ...info, allergies: e.target.value })} data-testid="emg-allergies" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Current condition / important info</div>
            <Textarea value={info.conditions} onChange={(e) => setInfo({ ...info, conditions: e.target.value })} />
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Approved current medicines</div>
            <div className="flex flex-wrap gap-1.5">
              {medicines.map((m) => (
                <span key={m.id} className="rounded-full bg-brand-50 border border-brand-500/25 px-2 py-0.5 text-[11px] font-medium text-brand-900">{m.name} {m.strength}</span>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button onClick={save} className="bg-brand-900 hover:bg-brand-700">Save</Button>
            <Button variant="outline" onClick={copy}><Copy className="h-3.5 w-3.5 mr-1" /> Copy card</Button>
            <Button variant="outline" onClick={() => { setShared(true); toast.success("Emergency card shared (demo)"); }} data-testid="emg-share">
              <Share2 className="h-3.5 w-3.5 mr-1" /> Share
            </Button>
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-5 card-elev flex flex-col items-center justify-center text-center">
          <div className="text-xs font-semibold uppercase tracking-widest text-brand-700">Emergency QR</div>
          <div className="mt-3 grid h-40 w-40 place-items-center rounded-2xl border bg-white">
            <QrCode className="h-24 w-24 text-brand-900" />
          </div>
          <div className="mt-3 text-xs text-muted-foreground">Simulated QR · demo only</div>
          {shared && <div className="mt-2 inline-flex items-center gap-1 text-xs text-success"><ShieldCheck className="h-3 w-3" /> Access token issued (demo)</div>}
        </div>
      </div>
      <div className="rounded-2xl border border-success/25 bg-success/5 p-4 text-sm flex items-start gap-2">
        <ShieldCheck className="h-4 w-4 text-success mt-0.5" /> <span>Documents are not publicly accessible. Access can be revoked.</span>
      </div>
    </div>
  );
}
