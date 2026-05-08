import type { Student, Staff, Report, AuditLog } from "./types";

export const ZONAS = [
  "Patio", "Comedor", "Aula", "Baños PB", "Baños P1",
  "Pasillo", "Gimnasio", "Vestuarios", "Camino al cole", "Online/RRSS", "Otra",
];

export const TIPOS = ["Ciberbullying", "Físico", "Verbal", "Social", "Otro"];

export const EMOJI_PALETTE = ["🌟","🌈","🎈","🎮","⚽","🐶","🐱","🦊","🐼","🦁","🍕","🍦","🌺","🌻","🚀","🎵","📚","⚡","🌙","☀️"];

const NOMBRES = [
  "Lucía García","Mateo Fernández","Sofía Martínez","Hugo Rodríguez","Martina López",
  "Daniel Sánchez","Valeria Pérez","Leo Gómez","Emma Ruiz","Pablo Díaz",
  "Carla Hernández","Adrián Moreno","Noa Jiménez","Álvaro Álvarez","Olivia Romero",
  "Marco Navarro","Julia Torres","Diego Domínguez","Aitana Vázquez","Bruno Ramos",
  "Vega Gil","Izan Serrano","Chloe Blanco","Marcos Molina","Triana Suárez",
  "Iker Castro","Daniela Ortega","Enzo Delgado","Alma Rubio","Gael Marín",
];

export function generateMockStudents(): Student[] {
  const cursos = ["1ºA","1ºB","2ºA","2ºB","3ºA","3ºB","4ºA","4ºB"];
  return NOMBRES.map((name, i) => ({
    id: `s${i + 1}`,
    name,
    curso: cursos[i % cursos.length],
  }));
}

export const MOCK_STAFF: Staff[] = [
  { id: "u1", name: "Carmen López", role: "director" },
  { id: "u2", name: "Ana Ruiz", role: "mediador" },
  { id: "u3", name: "Marc Soler", role: "mediador" },
];

function defaultChecklist() {
  return [
    { key: "recepcion", label: "Recepción del caso", done: false },
    { key: "entrevista_victima", label: "Entrevista con víctima", done: false },
    { key: "entrevista_agresor", label: "Entrevista con presunto agresor", done: false },
    { key: "notificacion_familias", label: "Notificación a familias", done: false },
    { key: "comunicacion_inspeccion", label: "Comunicación a inspección", done: false },
    { key: "resolucion", label: "Resolución", done: false },
  ];
}

export function generateMockReports(students: Student[]): Report[] {
  const now = Date.now();
  const day = 86400000;
  return [
    {
      id: "AZ-1001",
      emojiKey: "h1",
      emojis: ["🌟","🚀","🐶"],
      deviceToken: "tok-demo-1",
      createdAt: now - day * 2,
      updatedAt: now - day * 0.5,
      status: "abierto",
      severity: "CRITICA",
      tipo: "Físico",
      zona: "Vestuarios",
      cuando: "Hoy",
      description: "Me han amenazado con un palo en los vestuarios y dicen que mañana habrá paliza. Pasa todos los días.",
      victimaSelf: true,
      involved: [
        { studentId: students[3].id, role: "agresor" },
        { studentId: students[5].id, role: "agresor" },
        { studentId: students[0].id, role: "victima" },
      ],
      evidences: [],
      chat: [
        { id: "m1", from: "alumno", text: "Tengo mucho miedo de ir mañana", ts: now - day },
        { id: "m2", from: "mediador", text: "Estamos contigo. Hoy hablaremos con jefatura y mañana no irás solo/a a vestuarios.", ts: now - day * 0.5 },
      ],
      assignedTo: "u2",
      checklist: defaultChecklist().map(c => c.key === "recepcion" ? { ...c, done: true, date: new Date(now - day * 2).toISOString().slice(0,10) } : c),
    },
    {
      id: "BX-2042",
      emojiKey: "h2",
      emojis: ["🐱","🍕","🌙"],
      deviceToken: "tok-demo-2",
      createdAt: now - day * 5,
      updatedAt: now - day * 1,
      status: "investigacion",
      severity: "ALTA",
      tipo: "Ciberbullying",
      zona: "Online/RRSS",
      cuando: "Esta semana",
      description: "Han creado un grupo para insultarme en redes y publican fotos mías editadas.",
      victimaSelf: true,
      involved: [
        { studentId: students[7].id, role: "agresor" },
        { studentId: students[2].id, role: "victima" },
      ],
      evidences: [],
      chat: [],
      assignedTo: "u3",
      checklist: defaultChecklist().map(c =>
        ["recepcion","entrevista_victima"].includes(c.key) ? { ...c, done: true, date: new Date(now - day * 4).toISOString().slice(0,10) } : c
      ),
    },
    {
      id: "CM-3310",
      emojiKey: "h3",
      emojis: ["⚽","🎵","🌻"],
      deviceToken: "tok-demo-3",
      createdAt: now - day * 20,
      updatedAt: now - day * 10,
      status: "resuelto",
      severity: "MEDIA",
      tipo: "Verbal",
      zona: "Patio",
      cuando: "Hace más tiempo",
      description: "Me ponen motes y se ríen en el patio.",
      victimaSelf: false,
      involved: [
        { studentId: students[10].id, role: "agresor" },
        { studentId: students[12].id, role: "victima" },
      ],
      evidences: [],
      chat: [],
      assignedTo: "u2",
      checklist: defaultChecklist().map(c => ({ ...c, done: true, date: new Date(now - day * 12).toISOString().slice(0,10) })),
      closure: {
        medidas: ["Entrevista realizada con familias", "Mediación entre partes"],
        valoracion: "Tras mediación entre las partes, se acuerda un plan de convivencia y seguimiento durante 4 semanas. Las familias colaboran activamente.",
        estadoFinal: "Resuelto",
        closedAt: now - day * 10,
        actaId: "ACTA-CM-3310",
      },
    },
    {
      id: "DK-4521",
      emojiKey: "h4",
      emojis: ["🦊","📚","🌈"],
      deviceToken: "tok-demo-4",
      createdAt: now - day * 30,
      updatedAt: now - day * 28,
      status: "cerrado_falsa",
      severity: "BAJA",
      tipo: "Social",
      zona: "Aula",
      cuando: "Esta semana",
      description: "Creo que me ignoran en clase.",
      victimaSelf: true,
      involved: [
        { studentId: students[15].id, role: "victima" },
      ],
      evidences: [],
      chat: [],
      assignedTo: "u3",
      checklist: defaultChecklist().map(c =>
        ["recepcion","entrevista_victima"].includes(c.key) ? { ...c, done: true } : c
      ),
      closure: {
        medidas: [],
        valoracion: "Tras entrevista, se confirma que se trataba de un malentendido puntual sin patrón de exclusión.",
        estadoFinal: "Falsa alarma",
        closedAt: now - day * 28,
      },
    },
  ];
}

export function generateMockAuditLog(): AuditLog[] {
  const now = Date.now();
  const h = 3600000;
  return [
    { id: "a1", ts: now - h * 1, actor: "Ana Ruiz", action: "Mensaje enviado", caseId: "AZ-1001" },
    { id: "a2", ts: now - h * 3, actor: "Marc Soler", action: "Estado actualizado", caseId: "BX-2042" },
    { id: "a3", ts: now - h * 5, actor: "Ana Ruiz", action: "Checklist actualizado", caseId: "AZ-1001" },
    { id: "a4", ts: now - h * 24, actor: "Ana Ruiz", action: "Caso cerrado", caseId: "CM-3310" },
    { id: "a5", ts: now - h * 26, actor: "Ana Ruiz", action: "Acta generada", caseId: "CM-3310" },
    { id: "a6", ts: now - h * 48, actor: "Marc Soler", action: "Caso cerrado", caseId: "DK-4521" },
  ];
}
