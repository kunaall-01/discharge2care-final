import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PhoneCall, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { IDS } from "@/constants/testIds";

export default function EmergencySOS({ compact = false }) {
  const [open, setOpen] = useState(false);
  const [called, setCalled] = useState(false);

  const trigger = compact ? (
    <button data-testid={IDS.emergencySOS} aria-label="Emergency SOS"
      className="inline-flex items-center gap-2 rounded-full bg-critical/90 hover:bg-critical text-white px-3 py-2 text-sm font-semibold shadow-md transition-colors">
      <AlertTriangle className="h-4 w-4" /> SOS
    </button>
  ) : (
    <button data-testid={IDS.emergencySOS}
      className="inline-flex items-center gap-2 rounded-full bg-critical hover:brightness-95 text-white px-5 py-3 text-base font-semibold shadow-lg transition-transform hover:-translate-y-0.5">
      <AlertTriangle className="h-5 w-5" /> Emergency SOS
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setCalled(false); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl text-critical flex items-center gap-2">
            <AlertTriangle /> Emergency Assistance
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-base">Do you want to call emergency services (108) and notify your emergency contact?</p>
          <div className="rounded-xl bg-critical/5 border border-critical/20 p-3 text-sm">
            <div className="font-medium">Emergency contact</div>
            <div>Sita Sharma • +91 98765 43211</div>
          </div>
          {called && (
            <div data-testid="sos-called-state" className="rounded-xl bg-success/10 border border-success/25 p-3 text-sm text-foreground">
              <div className="font-medium text-success">Simulated call placed (demo mode)</div>
              <div>Contact notified. Location shared.</div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button data-testid="sos-cancel-btn" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button data-testid="sos-call-btn" className="bg-critical hover:brightness-95"
            onClick={() => { setCalled(true); toast.success("Simulated emergency call placed (demo)."); }}>
            <PhoneCall className="h-4 w-4 mr-2" /> Call 108
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
