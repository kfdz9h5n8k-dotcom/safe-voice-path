export type Severity = "CRITICA" | "ALTA" | "MEDIA" | "BAJA";
export type ReportStatus = "abierto" | "investigacion" | "resuelto" | "cerrado_falsa";
export type CaseRole = "victima" | "agresor" | "testigo";

export interface Student {
  id: string;
  name: string;
  curso: string; // e.g. "1ºA"
}

export interface Staff {
  id: string;
  name: string;
  role: "director" | "mediador";
}

export interface ChatMessage {
  id: string;
  from: "alumno" | "mediador" | "bot";
  text?: string;
  image?: string;
  ts: number;
}

export interface Involved {
  studentId: string;
  role: CaseRole;
}

export interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
  date?: string;
}

export interface Report {
  id: string; // e.g. "AZ-8842"
  emojiKey: string; // hash
  emojis: string[];
  deviceToken: string;
  createdAt: number;
  updatedAt: number;
  status: ReportStatus;
  severity: Severity;
  tipo: string; // Ciberbullying / Físico / Verbal / Social / Otro
  zona: string;
  cuando: string;
  description: string;
  victimaSelf: boolean;
  involved: Involved[];
  evidences: string[]; // dataUrls
  chat: ChatMessage[];
  assignedTo?: string;
  checklist: ChecklistItem[];
  closure?: {
    medidas: string[];
    valoracion: string;
    estadoFinal: "Resuelto" | "Derivado" | "Falsa alarma";
    closedAt: number;
    actaId?: string;
    rating?: number;
  };
}

export interface Acta {
  id: string;
  caseId: string;
  createdAt: number;
  verifyCode: string;
  pdfDataUrl?: string;
}

export interface AuditLog {
  id: string;
  ts: number;
  actor: string;
  action: string;
  caseId?: string;
}

export type ViewMode = "estudiante" | "mediador" | "director";
