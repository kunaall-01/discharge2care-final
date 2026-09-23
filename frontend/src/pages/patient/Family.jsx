import React, { useCallback, useEffect, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { UserPlus, ShieldCheck, Trash2, Phone, Eye, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { IDS } from "@/constants/testIds";
import {
  listCaregivers, linkCaregiver, updateCaregiver, removeCaregiver,
  getCaregiverDashboard, errorMessage,
} from "@/lib/api";

const permKeys = [
  { key: "medication", label: "Medication schedule" },
  { key: "appointments", label: "Appointments" },
  { key: "tests", label: "Tests" },
  { key: "dischargeSummary", label: "Discharge summary" },
  { key: "labReports", label: "Lab reports" },
  { key: "fullHistory", label: "Full medical history" },
];

const initials = (name) => name.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();

// Backend caregiver -> the shape this page has always rendered.
const toMember = (c) => ({
  id: c.caregiver_id,
  name: c.name,
  relation: c.relation,
  phone: c.phone || "",
  email: c.email || "",
  permissions: { ...c.permissions },
  responsibilities: permKeys.filter((p) => c.permissions?.[p.key]).map((p) => p.label),
  avatar: initials(c.name),
});

export default function Family() {
  const { family, update, addAudit, patient } = useApp();
  const [members, setMembers] = useState(family);
  const [source, setSource] = useState("local");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [invite, setInvite] = useState({ open: false, name: "", relation: "", phone: "" });

  const load = useCallback(async () => {
    if (!patient?.id) { setLoading(false); return; }
    try {
      const caregivers = await listCaregivers(patient.id);
      setMembers(caregivers.map(toMember));
      setSource("api");
    } catch {
      // Backend unreachable (or no plan yet): keep the page usable offline.
      setMembers(family);
      setSource("local");
    } finally {
      setLoading(false);
    }
  }, [patient?.id, family]);

  useEffect(() => { load(); }, [load]);

  const setPerms = (id, key, v) => {
    setMembers((list) => list.map((f) => f.id === id ? { ...f, permissions: { ...f.permissions, [key]: v } } : f));
  };

  const save = async (id) => {
    const member = members.find((f) => f.id === id);
    if (source === "api") {
      try {
        await updateCaregiver(id, { permissions: member.permissions });
        toast.success("Permissions saved");
      } catch (err) { toast.error(errorMessage(err)); return; }
    } else {
      update((s) => ({ ...s, family: s.family.map((f) => f.id === id ? { ...f, permissions: member.permissions } : f) }));
      toast.success("Permissions saved");
    }
    addAudit(`Permissions updated for ${member?.name}`);
  };

  const revoke = async (id) => {
    const member = members.find((f) => f.id === id);
    if (source === "api") {
      try {
        await removeCaregiver(id);
      } catch (err) { toast.error(errorMessage(err)); return; }
    } else {
      update((s) => ({ ...s, family: s.family.filter((f) => f.id !== id) }));
    }
    setMembers((list) => list.filter((f) => f.id !== id));
    addAudit("Family member removed");
    toast.success("Access revoked");
    setSelected(null);
  };

  const sendInvite = async () => {
    if (!invite.name || !invite.relation) { toast.error("Name and relation required"); return; }
    if (source === "api") {
      try {
        await linkCaregiver({ patientId: patient.id, name: invite.name, relation: invite.relation, phone: invite.phone });
        await load();
      } catch (err) { toast.error(errorMessage(err)); return; }
    } else {
      const id = `f-${Date.now()}`;
      const created = {
        id, name: invite.name, relation: invite.relation, phone: invite.phone, responsibilities: [],
        permissions: { medication: false, appointments: false, tests: false, dischargeSummary: false, labReports: false, fullHistory: false },
        avatar: initials(invite.name),
      };
      setMembers((list) => [...list, created]);
      update((s) => ({ ...s, family: [...s.family, created] }));
    }
    addAudit(`Invited ${invite.name} (${invite.relation})`);
    setInvite({ open: false, name: "", relation: "", phone: "" });
    toast.success("Added to your Care Circle");
  };

  const openPreview = async (id) => {
    setPreviewLoading(true);
    setPreview(null);
    try {
      setPreview({ id, data: await getCaregiverDashboard(id) });
    } catch (err) {
      setPreview({ id, error: errorMessage(err) });
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-brand-700">Care Circle</div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-brand-900">Your Care Circle</h1>
          <p className="mt-1 text-muted-foreground">Trusted people helping you recover. Access is controlled by you.</p>
        </div>
        <Button data-testid={IDS.inviteFamily} onClick={() => setInvite({ ...invite, open: true })} className="btn-primary self-start">
          <UserPlus className="h-4 w-4 mr-2" /> Invite Family Member
        </Button>
      </div>

      {source === "local" && !loading && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800" data-testid="family-offline">
          Showing saved contacts only — the care-circle server could not be reached, so changes stay on this device.
        </div>
      )}

      {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading your Care Circle…</div>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((f) => (
          <div key={f.id} data-testid={`family-card-${f.id}`} className="rounded-3xl border border-brand-900/10 bg-white p-5 card-elev">
            <div className="flex items-center gap-3">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-900 text-white font-heading text-lg font-bold">{f.avatar}</div>
              <div className="flex-1 min-w-0">
                <div className="font-heading text-lg font-semibold text-brand-900 truncate">{f.name}</div>
                <div className="text-xs text-muted-foreground">{f.relation}</div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {f.responsibilities.length === 0 && <span className="text-[11px] text-muted-foreground">No access granted yet</span>}
              {f.responsibilities.map((r) => (
                <span key={r} className="rounded-full bg-brand-50 border border-brand-500/25 px-2 py-0.5 text-[11px] font-medium text-brand-900">{r}</span>
              ))}
            </div>
            {f.phone && <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> {f.phone}</div>}
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setSelected(f.id)} data-testid={`edit-perms-${f.id}`}>Edit permissions</Button>
              <Button size="sm" variant="outline" onClick={() => openPreview(f.id)} data-testid={`preview-${f.id}`}>
                <Eye className="h-3.5 w-3.5" /> Their view
              </Button>
              <Button size="sm" variant="outline" onClick={() => revoke(f.id)} className="text-critical border-critical/30 hover:bg-critical/5" data-testid={`revoke-${f.id}`}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-success/25 bg-success/5 p-4 text-sm flex items-start gap-2">
        <ShieldCheck className="h-4 w-4 text-success mt-0.5" /> <span>Access is controlled by you. Family members don't automatically see anything until you grant it.</span>
      </div>

      {/* Permissions dialog */}
      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Permissions</DialogTitle></DialogHeader>
          {selected && (() => {
            const f = members.find((x) => x.id === selected);
            if (!f) return null;
            return (
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">Choose what <span className="font-medium text-brand-900">{f.name}</span> can see.</div>
                {permKeys.map((p) => (
                  <div key={p.key} className="flex items-center justify-between rounded-xl border p-3">
                    <div className="text-sm">{p.label}</div>
                    <Switch data-testid={`perm-${f.id}-${p.key}`} checked={!!f.permissions[p.key]} onCheckedChange={(v) => setPerms(f.id, p.key, v)} />
                  </div>
                ))}
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
            <Button data-testid="save-perms-btn" onClick={() => { save(selected); setSelected(null); }} className="bg-brand-900 hover:bg-brand-700">Save Permissions</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* What this caregiver actually sees, server-side gated */}
      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>What they can see</DialogTitle></DialogHeader>
          {previewLoading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>}
          {preview?.error && <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">{preview.error}</div>}
          {preview?.data && (() => {
            const d = preview.data;
            if (!d.has_medication_access) {
              return (
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2"><AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                    <span><span className="font-medium text-brand-900">{d.caregiver.name}</span> has no medication access, so their dashboard is empty. Grant "Medication schedule" to share doses and reminders.</span>
                  </div>
                </div>
              );
            }
            return (
              <div className="space-y-3 text-sm">
                <div className="text-muted-foreground">Live view for <span className="font-medium text-brand-900">{d.caregiver.name}</span>:</div>
                {d.adherence?.adherence_pct != null && (
                  <div>7-day adherence: <span className="font-semibold text-brand-900">{d.adherence.adherence_pct}%</span>
                    <span className="text-muted-foreground"> · taken {d.adherence.taken} · missed {d.adherence.missed}</span>
                  </div>
                )}
                <div>
                  <div className="font-medium text-brand-900 mb-1">Today's doses</div>
                  {d.today.length === 0 && <div className="text-muted-foreground">Nothing scheduled today.</div>}
                  <ul className="space-y-1">
                    {d.today.map((s) => (
                      <li key={`${s.medicine_id}-${s.time}`} className="flex justify-between rounded-lg border px-2 py-1">
                        <span>{s.time} · {s.medicine_name}</span>
                        <span className={s.status === "overdue" ? "text-amber-700 font-medium" : "text-muted-foreground"}>{s.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {d.overdue.length > 0 && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-800">
                    {d.overdue.length} overdue dose{d.overdue.length > 1 ? "s" : ""} — this is what triggers a reminder to them.
                  </div>
                )}
              </div>
            );
          })()}
          <DialogFooter><Button variant="outline" onClick={() => setPreview(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite dialog */}
      <Dialog open={invite.open} onOpenChange={(v) => setInvite((i) => ({ ...i, open: v }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>Invite family member</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Full name" value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} data-testid="invite-name" />
            <Input placeholder="Relation (Son, Daughter, Wife…)" value={invite.relation} onChange={(e) => setInvite({ ...invite, relation: e.target.value })} data-testid="invite-relation" />
            <Input placeholder="Mobile (optional)" value={invite.phone} onChange={(e) => setInvite({ ...invite, phone: e.target.value })} data-testid="invite-phone" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvite({ ...invite, open: false })}>Cancel</Button>
            <Button onClick={sendInvite} className="bg-brand-900 hover:bg-brand-700" data-testid="invite-send-btn">Send invite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
