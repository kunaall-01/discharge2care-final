import React from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import AccessibilityPanel from "@/components/shared/AccessibilityPanel";
import EmergencySOS from "@/components/shared/EmergencySOS";
import { IDS } from "@/constants/testIds";
import {
  Home, FileText, Pill, FlaskConical, CalendarDays, Users, Package,
  ShieldCheck, PillBottle, ClipboardList, Sparkles, LifeBuoy, Settings,
  Bell, LogOut, HeartPulse, Menu, X,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const items = (t) => [
  { to: "/patient", label: t("nav.recovery"), icon: Home, end: true },
  { to: "/patient/discharge", label: t("nav.discharge"), icon: FileText },
  { to: "/patient/medicines", label: t("nav.medicines"), icon: Pill },
  { to: "/patient/tests", label: t("nav.tests"), icon: FlaskConical },
  { to: "/patient/appointments", label: t("nav.appointments"), icon: CalendarDays },
  { to: "/patient/family", label: t("nav.family"), icon: Users },
  { to: "/patient/medicine-stock", label: t("nav.stock"), icon: Package },
  { to: "/patient/pill-verification", label: t("nav.pill"), icon: PillBottle },
  { to: "/patient/otc-safety", label: t("nav.otc"), icon: ShieldCheck },
  { to: "/patient/daily-tracking", label: t("nav.tracking"), icon: ClipboardList },
  { to: "/patient/what-changed", label: t("nav.changed"), icon: Sparkles },
  { to: "/patient/emergency", label: t("nav.emergency"), icon: LifeBuoy },
  { to: "/settings", label: t("nav.settings"), icon: Settings },
];

function SideNav({ onNav }) {
  const { t } = useApp();
  return (
    <nav className="flex flex-col gap-1">
      {items(t).map((it) => (
        <NavLink key={it.to} to={it.to} end={it.end} onClick={onNav}
          data-testid={`nav-${it.to.split("/").pop() || "home"}`}
          className={({ isActive }) =>
            `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px]
             ${isActive ? "bg-brand-900 text-white shadow-md" : "text-brand-900/80 hover:bg-brand-50"}`
          }>
          <it.icon className="h-5 w-5 shrink-0" />
          <span className="truncate">{it.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default function PatientLayout() {
  const { t, patient, notifications, update } = useApp();
  const navigate = useNavigate();
  const unread = notifications.filter((n) => !n.read).length;

  const logout = () => { update({ role: null }); navigate("/"); };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <button className="md:hidden inline-flex items-center justify-center rounded-lg border p-2" aria-label="Menu">
                  <Menu className="h-5 w-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-4">
                <div className="flex items-center gap-2 mb-4">
                  <HeartPulse className="h-6 w-6 text-brand-900" />
                  <span className="font-heading text-lg font-bold text-brand-900">Discharge2Care</span>
                </div>
                <SideNav />
              </SheetContent>
            </Sheet>
            <Link to="/patient" className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-900 text-white shadow-md">
                <HeartPulse className="h-5 w-5" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-heading text-lg font-bold text-brand-900">Discharge2Care</span>
                <span className="hidden sm:block text-[11px] text-muted-foreground">Patient view · {patient.name}</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <AccessibilityPanel />
            <Link to="/patient/notifications" data-testid="nav-notifications"
              className="relative inline-flex items-center gap-2 rounded-full border border-brand-900/15 bg-white px-3 py-2 text-sm font-medium text-brand-900 hover:bg-brand-50">
              <Bell className="h-4 w-4" />
              {unread > 0 && <span className="absolute -top-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-critical text-[10px] font-bold text-white">{unread}</span>}
            </Link>
            <EmergencySOS compact />
            <button data-testid={IDS.logout} onClick={logout}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-brand-900/15 bg-white px-3 py-2 text-sm font-medium text-brand-900 hover:bg-brand-50">
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto flex max-w-[1400px] gap-6 px-4 py-6 md:px-6">
        <aside className="hidden md:block w-64 shrink-0">
          <div className="sticky top-[76px] rounded-2xl border border-border bg-white p-3 card-elev">
            <SideNav />
          </div>
        </aside>
        <main className="min-w-0 flex-1 pb-24 md:pb-6" data-testid="patient-main">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom demo bar (quick access) */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t bg-white/95 backdrop-blur px-2 py-2">
        <div className="grid grid-cols-4 gap-1 text-xs">
          {[
            { to: "/patient", label: "Home", icon: Home },
            { to: "/patient/medicines", label: "Meds", icon: Pill },
            { to: "/patient/family", label: "Family", icon: Users },
            { to: "/patient/what-changed", label: "Changed", icon: Sparkles },
          ].map((it) => (
            <NavLink key={it.to} to={it.to} className={({ isActive }) =>
              `flex flex-col items-center gap-1 rounded-lg py-2 ${isActive ? "text-brand-900" : "text-muted-foreground"}`}>
              <it.icon className="h-5 w-5" /> {it.label}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}
