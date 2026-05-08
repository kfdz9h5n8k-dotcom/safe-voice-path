import { useEffect, useState, useCallback } from "react";
import type { Report, Student, Staff, AuditLog, Acta, ViewMode, Severity } from "./types";
import { generateMockStudents, MOCK_STAFF, generateMockReports, generateMockAuditLog } from "./mock";

const KEYS = {
  students: "edusafe.students",
  staff: "edusafe.staff",
  reports: "edusafe.reports",
  audit: "edusafe.audit",
  actas: "edusafe.actas",
  view: "edusafe.view",
  device: "edusafe.deviceToken",
  init: "edusafe.initialized",
};

function read<T>(k: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(k: string, v: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(k, JSON.stringify(v));
}

export function initSeedIfNeeded() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(KEYS.init)) return;
  const students = generateMockStudents();
  write(KEYS.students, students);
  write(KEYS.staff, MOCK_STAFF);
  write(KEYS.reports, generateMockReports(students));
  write(KEYS.audit, generateMockAuditLog());
  write(KEYS.actas, []);
  if (!localStorage.getItem(KEYS.device)) {
    localStorage.setItem(KEYS.device, "tok-" + Math.random().toString(36).slice(2, 10));
  }
  localStorage.setItem(KEYS.init, "1");
}

export function getDeviceToken() {
  if (typeof window === "undefined") return "tok-server";
  let t = localStorage.getItem(KEYS.device);
  if (!t) {
    t = "tok-" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(KEYS.device, t);
  }
  return t;
}

// Pub/sub for cross-component updates
const listeners = new Set<() => void>();
function emit() { listeners.forEach(l => l()); }

export function useStudents(): Student[] {
  const [v, setV] = useState<Student[]>(() => read(KEYS.students, []));
  useEffect(() => { const l = () => setV(read(KEYS.students, [])); listeners.add(l); return () => { listeners.delete(l); }; }, []);
  return v;
}
export function useStaff(): Staff[] {
  const [v, setV] = useState<Staff[]>(() => read(KEYS.staff, []));
  useEffect(() => { const l = () => setV(read(KEYS.staff, [])); listeners.add(l); return () => { listeners.delete(l); }; }, []);
  return v;
}
export function useReports(): [Report[], (r: Report[]) => void] {
  const [v, setV] = useState<Report[]>(() => read(KEYS.reports, []));
  useEffect(() => { const l = () => setV(read(KEYS.reports, [])); listeners.add(l); return () => { listeners.delete(l); }; }, []);
  const setter = useCallback((r: Report[]) => { write(KEYS.reports, r); setV(r); emit(); }, []);
  return [v, setter];
}
export function useAudit(): [AuditLog[], (a: AuditLog) => void] {
  const [v, setV] = useState<AuditLog[]>(() => read(KEYS.audit, []));
  useEffect(() => { const l = () => setV(read(KEYS.audit, [])); listeners.add(l); return () => { listeners.delete(l); }; }, []);
  const add = useCallback((a: AuditLog) => {
    const cur = read<AuditLog[]>(KEYS.audit, []);
    const next = [a, ...cur].slice(0, 200);
    write(KEYS.audit, next);
    setV(next);
    emit();
  }, []);
  return [v, add];
}
export function useActas(): [Acta[], (a: Acta) => void] {
  const [v, setV] = useState<Acta[]>(() => read(KEYS.actas, []));
  useEffect(() => { const l = () => setV(read(KEYS.actas, [])); listeners.add(l); return () => { listeners.delete(l); }; }, []);
  const add = useCallback((a: Acta) => {
    const cur = read<Acta[]>(KEYS.actas, []);
    const next = [a, ...cur];
    write(KEYS.actas, next);
    setV(next);
    emit();
  }, []);
  return [v, add];
}

export function useView(): [ViewMode, (v: ViewMode) => void] {
  const [v, setV] = useState<ViewMode>(() => read<ViewMode>(KEYS.view, "estudiante"));
  useEffect(() => { const l = () => setV(read<ViewMode>(KEYS.view, "estudiante")); listeners.add(l); return () => { listeners.delete(l); }; }, []);
  const setter = useCallback((nv: ViewMode) => { write(KEYS.view, nv); setV(nv); emit(); }, []);
  return [v, setter];
}

// Triage IA simulado
const RED_WORDS = ["arma","cuchillo","golpe","paliza","suicid","viol","amenaz","mat","cortar","sangre","palo","escalera","ahorcar","tirar"];
export function triageSeverity(text: string): Severity {
  const t = text.toLowerCase();
  let count = 0;
  for (const w of RED_WORDS) if (t.includes(w)) count++;
  if (count >= 2) return "CRITICA";
  if (count >= 1) return "ALTA";
  if (t.includes("todos los días") || t.includes("siempre")) return "ALTA";
  return "MEDIA";
}

export function generateCaseId(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const a = letters[Math.floor(Math.random()*letters.length)] + letters[Math.floor(Math.random()*letters.length)];
  const n = Math.floor(1000 + Math.random() * 9000);
  return `${a}-${n}`;
}

export function hashEmojis(emojis: string[]): string {
  // simple deterministic hash
  let h = 0;
  const s = emojis.join("|");
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return "h" + Math.abs(h).toString(36);
}

export function genVerifyCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
  const grp = () => Array.from({length:4}, () => chars[Math.floor(Math.random()*chars.length)]).join("");
  return `${grp()}-${grp()}-${grp()}-${grp()}`;
}
