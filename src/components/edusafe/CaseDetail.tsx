import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useReports, useStudents, useAudit, useActas } from "@/lib/edusafe/store";
import type { Report, ChatMessage, Severity } from "@/lib/edusafe/types";
import { buildActa, downloadPDF } from "@/lib/edusafe/actas";
import { AlertTriangle, Send, FileText, X, ArrowLeft, MessageSquare, ListChecks } from "lucide-react";

const MEDIATOR_NAME = "Ana Ruiz";


const SEV_COLOR: Record<Severity, string> = {
  CRITICA: "bg-red-600 text-white",
  ALTA: "bg-orange-500 text-white",
  MEDIA: "bg-amber-300 text-amber-900",
  BAJA: "bg-green-500 text-white",
};

const STATUS_LABEL: Record<string, string> = {
  abierto: "Abierto", investigacion: "En investigación", resuelto: "Resuelto", cerrado_falsa: "Falsa alarma",
};

const ROLE_COLOR: Record<string, string> = {
  victima: "bg-blue-100 text-blue-700",
  agresor: "bg-red-100 text-red-700",
  testigo: "bg-gray-100 text-gray-600",
};

export function CaseDetailPage({ caseId }: { caseId: string }) {
  const [reports] = useReports();
  const report = reports.find(r => r.id === caseId);
  const navigate = useNavigate();

  if (!report) {
    return (
      <div className="p-6 max-w-md mx-auto text-center">
        <p className="text-gray-600 mb-3">Caso no encontrado</p>
        <Link to="/" className="text-[#0B3D91] underline text-sm">Volver al inbox</Link>
      </div>
    );
  }

  return <CaseDetail report={report} onBack={() => navigate({ to: "/" })} />;
}

function CaseDetail({ report, onBack }: { report: Report; onBack: () => void }) {
  const students = useStudents();
  const [reports, setReports] = useReports();
  const [, addAudit] = useAudit();
  const [, addActa] = useActas();
  const [showClose, setShowClose] = useState(false);
  const [text, setText] = useState("");
  const [tab, setTab] = useState<"chat" | "checklist">("chat");

  const antecedentes = useMemo(() => {
    const out: { name: string; count: number }[] = [];
    for (const inv of report.involved.filter(i => i.role === "agresor")) {
      const count = reports.filter(r => r.id !== report.id && r.involved.some(i => i.studentId === inv.studentId && i.role === "agresor")).length;
      if (count > 0) {
        const s = students.find(x => x.id === inv.studentId);
        if (s) out.push({ name: `${s.name} (${s.curso})`, count });
      }
    }
    return out;
  }, [report, reports, students]);

  function update(patch: Partial<Report>) {
    setReports(reports.map(r => r.id === report.id ? { ...r, ...patch, updatedAt: Date.now() } : r));
  }

  function send() {
    if (!text.trim()) return;
    const m: ChatMessage = { id: "m" + Date.now(), from: "mediador", text: text.trim(), ts: Date.now() };
    update({ chat: [...report.chat, m], status: report.status === "abierto" ? "investigacion" : report.status });
    addAudit({ id: "a" + Date.now(), ts: Date.now(), actor: "Ana Ruiz", action: "Mensaje enviado", caseId: report.id });
    setText("");
  }

  function attachImage() {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        const m: ChatMessage = { id: "m" + Date.now(), from: "mediador", image: reader.result as string, ts: Date.now() };
        update({ chat: [...report.chat, m] });
      };
      reader.readAsDataURL(f);
    };
    input.click();
  }

  function toggleCheck(key: string) {
    const cl = report.checklist.map(c => c.key === key
      ? { ...c, done: !c.done, date: !c.done ? new Date().toISOString().slice(0, 10) : c.date }
      : c);
    update({ checklist: cl });
    addAudit({ id: "a" + Date.now(), ts: Date.now(), actor: "Ana Ruiz", action: "Checklist actualizado", caseId: report.id });
  }

  function setCheckDate(key: string, date: string) {
    update({ checklist: report.checklist.map(c => c.key === key ? { ...c, date } : c) });
  }
  function setCheckNotes(key: string, notes: string) {
    update({ checklist: report.checklist.map(c => c.key === key ? { ...c, notes } : c) });
  }

  function generateDraft() {
    const { acta, blob, dataUrl, fileName } = buildActa(report, students, "borrador", MEDIATOR_NAME);
    addActa(acta);
    downloadPDF(blob, dataUrl, fileName);
    addAudit({ id: "a" + Date.now(), ts: Date.now(), actor: MEDIATOR_NAME, action: "Borrador acta generado", caseId: report.id });
    toast.success("Borrador descargado. Puedes seguir editando el caso.");
  }

  const isClosed = report.status === "resuelto" || report.status === "cerrado_falsa";

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-gray-600 mb-4 hover:text-[#0B3D91]">
        <ArrowLeft size={16} /> Volver al inbox
      </button>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between mb-3 gap-2">
              <div>
                <div className="text-xs text-gray-400 uppercase">Caso</div>
                <div className="font-mono text-lg font-bold text-[#0B3D91]">{report.id}</div>
              </div>
              <div className="flex flex-col gap-1 items-end">
                <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${SEV_COLOR[report.severity]}`}>{report.severity}</span>
                <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700">{STATUS_LABEL[report.status]}</span>
              </div>
            </div>
            <dl className="text-sm space-y-1.5">
              <Row k="Creado" v={new Date(report.createdAt).toLocaleString("es-ES")} />
              <Row k="Tipo" v={report.tipo} />
              <Row k="Zona" v={report.zona} />
              <Row k="Cuándo" v={report.cuando} />
            </dl>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-bold text-gray-700 mb-2">Descripción inicial</h3>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{report.description}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-bold text-gray-700 mb-2">Implicados</h3>
            <div className="space-y-1.5 text-sm">
              {report.involved.map((i, idx) => {
                const s = students.find(x => x.id === i.studentId);
                return s ? (
                  <div key={idx} className="flex items-center justify-between gap-2 border-b border-gray-50 pb-1.5 last:border-0">
                    <span className="text-gray-700">{s.name} <span className="text-gray-400 text-xs">· {s.curso}</span></span>
                    <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded ${ROLE_COLOR[i.role]}`}>{i.role}</span>
                  </div>
                ) : null;
              })}
              {report.involved.length === 0 && <div className="text-xs text-gray-400">Sin implicados</div>}
            </div>
          </div>

          {report.evidences.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-bold text-gray-700 mb-2">Evidencias</h3>
              <div className="grid grid-cols-3 gap-2">
                {report.evidences.map((u, i) => (
                  <a key={i} href={u} target="_blank" rel="noreferrer">
                    <img src={u} className="aspect-square object-cover rounded-lg hover:opacity-80 transition" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {antecedentes.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h3 className="text-sm font-bold text-amber-900 mb-2 flex items-center gap-1.5">
                <AlertTriangle size={14} /> Antecedentes
              </h3>
              <ul className="text-xs text-amber-900 space-y-1">
                {antecedentes.map((a, i) => (
                  <li key={i}>• {a.name} aparece como agresor en <strong>{a.count}</strong> caso(s) anterior(es)</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex border-b border-gray-100">
              <button onClick={() => setTab("chat")}
                className={`flex-1 px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 ${tab === "chat" ? "text-[#0B3D91] border-b-2 border-[#0B3D91]" : "text-gray-500"}`}>
                <MessageSquare size={15} /> Chat con denunciante
              </button>
              <button onClick={() => setTab("checklist")}
                className={`flex-1 px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 ${tab === "checklist" ? "text-[#0B3D91] border-b-2 border-[#0B3D91]" : "text-gray-500"}`}>
                <ListChecks size={15} /> Checklist legal
              </button>
            </div>

            {tab === "chat" ? (
              <div className="flex flex-col h-[60vh]">
                <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
                  {report.chat.length === 0 && <div className="text-center text-xs text-gray-400 my-4">Sin mensajes todavía</div>}
                  {report.chat.map(m => (
                    <div key={m.id} className={`flex ${m.from === "mediador" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm ${
                        m.from === "mediador" ? "bg-[#0B3D91] text-white rounded-br-md" : "bg-white border border-gray-200 text-gray-700 rounded-bl-md"
                      }`}>
                        {m.image ? <img src={m.image} className="rounded-lg max-w-[220px]" /> : <span className="whitespace-pre-wrap">{m.text}</span>}
                        <div className="text-[10px] opacity-60 mt-0.5">{new Date(m.ts).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-100 p-2 flex gap-2 bg-white">
                  <button onClick={attachImage} title="Adjuntar imagen" className="px-3 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">📎</button>
                  <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
                    placeholder="Escribir respuesta…"
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0B3D91]" />
                  <button onClick={send} className="px-4 rounded-lg bg-[#0B3D91] text-white text-sm font-semibold flex items-center gap-1">
                    <Send size={14} /> Enviar
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {report.checklist.map(c => (
                  <div key={c.key} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked={c.done} onChange={() => toggleCheck(c.key)} className="w-4 h-4 accent-[#0B3D91]" />
                      <span className={`flex-1 text-sm font-medium ${c.done ? "text-gray-800" : "text-gray-500"}`}>{c.label}</span>
                      <input type="date" value={c.date || ""} onChange={e => setCheckDate(c.key, e.target.value)}
                        className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600" />
                    </div>
                    <textarea value={c.notes || ""} onChange={e => setCheckNotes(c.key, e.target.value)}
                      rows={2} placeholder="Notas (opcional)…"
                      className="mt-2 w-full text-xs px-2 py-1.5 rounded border border-gray-100 bg-gray-50 focus:outline-none focus:border-[#0B3D91] resize-none" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            <button onClick={generateDraft} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-gray-300 text-sm font-semibold hover:bg-gray-50">
              <FileText size={14} /> Generar borrador de acta
            </button>
            {!isClosed && (
              <button onClick={() => setShowClose(true)} className="px-4 py-2 rounded-lg bg-[#C8102E] text-white text-sm font-semibold hover:bg-red-700">
                Cerrar caso
              </button>
            )}
          </div>
        </div>
      </div>

      {showClose && <CloseModal report={report} onClose={() => setShowClose(false)} onConfirm={(closure) => {
        const updated = { ...report, closure: { ...closure, closedAt: Date.now() } } as Report;
        const { dataUrl, verifyCode } = generateActaPDF(updated, students);
        const newStatus = closure.estadoFinal === "Falsa alarma" ? "cerrado_falsa" : "resuelto";
        const acta = { id: "ACTA-" + report.id, caseId: report.id, createdAt: Date.now(), verifyCode, pdfDataUrl: dataUrl };
        update({ status: newStatus, closure: { ...closure, closedAt: Date.now(), actaId: acta.id } });
        addActa(acta);
        addAudit({ id: "a" + Date.now(), ts: Date.now(), actor: "Ana Ruiz", action: "Caso cerrado", caseId: report.id });
        const a = document.createElement("a"); a.href = dataUrl; a.download = `acta-${report.id}.pdf`; a.click();
        setShowClose(false);
        setTimeout(() => onBack(), 400);
      }} />}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-2"><dt className="text-gray-400">{k}</dt><dd className="text-gray-700 text-right">{v}</dd></div>;
}

const MEDIDAS_OPTS = [
  "Entrevista realizada con familias",
  "Cambio de aula o grupo",
  "Notificación a Fiscalía de Menores",
  "Mediación entre las partes",
  "Plan de seguimiento establecido",
];

function CloseModal({ report, onClose, onConfirm }: {
  report: Report; onClose: () => void;
  onConfirm: (c: { medidas: string[]; valoracion: string; estadoFinal: "Resuelto" | "Derivado" | "Falsa alarma" }) => void;
}) {
  const [medidas, setMedidas] = useState<string[]>([]);
  const [otra, setOtra] = useState(false);
  const [otraText, setOtraText] = useState("");
  const [val, setVal] = useState("");
  const [estado, setEstado] = useState<"Resuelto" | "Derivado" | "Falsa alarma">("Resuelto");
  const [err, setErr] = useState("");

  const requiresStrict = report.severity === "CRITICA" || report.severity === "ALTA";
  const familiasNotificadas = report.checklist.find(c => c.key === "notificacion_familias")?.done;

  function submit() {
    const finalMedidas = [...medidas];
    if (otra && otraText.trim()) finalMedidas.push(`Otra: ${otraText.trim()}`);
    if (requiresStrict) {
      const errs: string[] = [];
      if (finalMedidas.length === 0) errs.push("marcar al menos una medida cautelar");
      if (val.length < 50) errs.push(`valoración con al menos 50 caracteres (actual: ${val.length})`);
      if (!familiasNotificadas) errs.push("marcar 'Notificación a familias' en el checklist legal");
      if (errs.length) { setErr("Para severidad " + report.severity + " debes: " + errs.join("; ") + "."); return; }
    }
    onConfirm({ medidas: finalMedidas, valoracion: val, estadoFinal: estado });
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800">Cerrar caso {report.id}</h3>
          <button onClick={onClose} className="text-gray-400"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Medidas cautelares aplicadas {requiresStrict && <span className="text-red-500">*</span>}
            </h4>
            <div className="space-y-1.5">
              {MEDIDAS_OPTS.map(m => (
                <label key={m} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={medidas.includes(m)} onChange={e =>
                    setMedidas(e.target.checked ? [...medidas, m] : medidas.filter(x => x !== m))
                  } className="accent-[#0B3D91]" />
                  {m}
                </label>
              ))}
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={otra} onChange={e => setOtra(e.target.checked)} className="accent-[#0B3D91]" />
                Otra medida
              </label>
              {otra && (
                <input value={otraText} onChange={e => setOtraText(e.target.value)} placeholder="Describe la medida…"
                  className="ml-6 w-[calc(100%-1.5rem)] px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0B3D91]" />
              )}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-1">
              Valoración pedagógica {requiresStrict && <span className="text-xs text-gray-400">(mín. 50 car.)</span>}
            </h4>
            <textarea value={val} onChange={e => setVal(e.target.value)} rows={5}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0B3D91]" />
            <div className={`text-xs text-right ${val.length < 50 && requiresStrict ? "text-red-500" : "text-gray-400"}`}>{val.length}{requiresStrict ? "/50" : ""}</div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Estado final</h4>
            <div className="flex gap-2">
              {(["Resuelto", "Derivado", "Falsa alarma"] as const).map(e => (
                <label key={e} className={`flex-1 text-center px-3 py-2 rounded-lg border text-sm cursor-pointer ${estado === e ? "border-[#0B3D91] bg-blue-50 text-[#0B3D91]" : "border-gray-200 text-gray-600"}`}>
                  <input type="radio" className="hidden" checked={estado === e} onChange={() => setEstado(e)} />
                  {e === "Derivado" ? "Derivado a inspección" : e}
                </label>
              ))}
            </div>
          </div>
          {err && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</div>}
        </div>
        <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-sm">Cancelar</button>
          <button onClick={submit} className="px-4 py-2 rounded-lg bg-[#C8102E] text-white text-sm font-semibold">Confirmar cierre y generar acta</button>
        </div>
      </div>
    </div>
  );
}
