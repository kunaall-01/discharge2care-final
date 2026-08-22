import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import {
  demoPatient, demoDoctor, initialMedicines, initialTests, initialAppointments,
  initialFamily, initialTasks, initialCareTasks, initialNotifications,
} from "@/data/mockData";
import { t as tr } from "@/data/translations";

const STORAGE_KEY = "d2c.state.v1";

const defaultState = {
  role: null, // "patient" | "doctor" | null
  patient: demoPatient,
  doctor: demoDoctor,
  language: "en",
  a11y: {
    scale: 1, highContrast: false, reduceMotion: false,
    dyslexia: false, largeButtons: false, simple: false,
  },
  carePlanActive: false,
  extractionDraft: null,
  medicines: [],
  tests: [],
  appointments: [],
  family: initialFamily,
  tasks: initialTasks,
  careTasks: initialCareTasks,
  notifications: initialNotifications,
  pillHistory: [],
  otcHistory: [],
  audit: [
    { id: "au1", ts: Date.now() - 86400000, text: "Discharge summary uploaded" },
    { id: "au2", ts: Date.now() - 86000000, text: "Care plan confirmed by patient" },
    { id: "au3", ts: Date.now() - 60000000, text: "Son (Aarav) invited to Care Circle" },
    { id: "au4", ts: Date.now() - 40000000, text: "Medication permission granted to Wife" },
  ],
  dailyLog: [
    { id: "d1", ts: Date.now() - 3600000, kind: "medicine", text: "Pantoprazole confirmed" },
    { id: "d2", ts: Date.now() - 1800000, kind: "note", text: "Feeling better in the morning" },
  ],
  questions: [
    { id: "q1", text: "Can I resume walking longer distances?", askedAt: Date.now() - 7200000 },
    { id: "q2", text: "Any dietary restriction next week?", askedAt: Date.now() - 3600000 },
  ],
};

const AppContext = createContext(null);

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);
    return { ...defaultState, ...parsed, a11y: { ...defaultState.a11y, ...(parsed.a11y || {}) } };
  } catch { return defaultState; }
}

export function AppProvider({ children }) {
  const [state, setState] = useState(loadState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Apply a11y classes to <html>
  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle("a11y-high-contrast", !!state.a11y.highContrast);
    html.classList.toggle("a11y-reduce-motion", !!state.a11y.reduceMotion);
    html.classList.toggle("a11y-dyslexia", !!state.a11y.dyslexia);
    html.classList.toggle("a11y-large-buttons", !!state.a11y.largeButtons);
    html.style.setProperty("--scale", String(state.a11y.scale || 1));
    html.setAttribute("lang", state.language);
  }, [state.a11y, state.language]);

  const update = useCallback((patch) => {
    setState((s) => (typeof patch === "function" ? patch(s) : { ...s, ...patch }));
  }, []);

  const t = useCallback((path) => tr(state.language, path), [state.language]);

  const addAudit = useCallback((text) => {
    setState((s) => ({ ...s, audit: [{ id: `au-${Date.now()}`, ts: Date.now(), text }, ...s.audit].slice(0, 60) }));
  }, []);

  const addNotification = useCallback((n) => {
    setState((s) => ({
      ...s,
      notifications: [{ id: `n-${Date.now()}`, read: false, time: "just now", severity: "info", ...n }, ...s.notifications],
    }));
  }, []);

  const activateCarePlan = useCallback(() => {
    setState((s) => ({
      ...s,
      carePlanActive: true,
      medicines: s.medicines.length ? s.medicines : initialMedicines,
      tests: s.tests.length ? s.tests : initialTests,
      appointments: s.appointments.length ? s.appointments : initialAppointments,
      careTasks: s.careTasks.length ? s.careTasks : initialCareTasks,
      audit: [{ id: `au-${Date.now()}`, ts: Date.now(), text: "Care plan activated" }, ...s.audit],
    }));
  }, []);

  const resetDemo = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState(defaultState);
  }, []);

  const value = useMemo(() => ({
    ...state, update, t, addAudit, addNotification, activateCarePlan, resetDemo, setState,
  }), [state, update, t, addAudit, addNotification, activateCarePlan, resetDemo]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};
