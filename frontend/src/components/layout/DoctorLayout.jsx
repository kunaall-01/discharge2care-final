import React from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { LayoutDashboard, Users, Activity, Bell, LogOut, Stethoscope } from "lucide-react";
import { IDS } from "@/constants/testIds";

export default function DoctorLayout() {
  const { doctor, update } = useApp();
  const navigate = useNavigate();
  const logout = () => { update({ role: null }); navigate("/"); };

  const nav = [
    { to: "/doctor", label: "Command Desk", icon: LayoutDashboard, end: true },
    { to: "/doctor/patients", label: "Patients", icon: Users },
    { to: "/doctor/continuity", label: "Continuity", icon: Activity },
  ];

  return (
    <div className="doctor-surface min-h-screen bg-background" data-testid="doctor-layout">
      <header className="sticky top-0 z-40 border-b bg-white">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-2.5 md:px-6">
          <div className="flex items-center gap-6">
            <Link to="/doctor" className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-md bg-brand-900 text-white">
                <Stethoscope className="h-4 w-4" />
              </div>
              <div className="leading-tight">
                <div className="font-doctor text-sm font-bold text-brand-900 tracking-tight">Discharge2Care</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Doctor Command Desk</div>
              </div>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {nav.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end} data-testid={`docnav-${n.label.toLowerCase().replace(/\s/g,"-")}`}
                  className={({ isActive }) => `inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium border transition-colors
                  ${isActive ? "bg-brand-900 text-white border-brand-900" : "text-brand-900 border-transparent hover:bg-slate-100"}`}>
                  <n.icon className="h-4 w-4" />{n.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 rounded-md border bg-white px-2.5 py-1.5 text-xs">
              <div className="grid h-6 w-6 place-items-center rounded-full bg-brand-50 text-brand-900 font-mono">AV</div>
              <div className="leading-tight">
                <div className="font-semibold">{doctor.name}</div>
                <div className="text-[10px] text-muted-foreground">{doctor.hospital}</div>
              </div>
            </div>
            <button className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm hover:bg-slate-50" aria-label="Notifications">
              <Bell className="h-4 w-4" />
            </button>
            <button data-testid={IDS.logout} onClick={logout} className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm hover:bg-slate-50">
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] px-4 md:px-6 py-6" data-testid="doctor-main">
        <Outlet />
      </main>
    </div>
  );
}
