import { useMemo, useState } from "react";
import { useReports, useStaff, useStudents, useAudit, useActas } from "@/lib/edusafe/store";
import type { Report, ChatMessage, Severity } from "@/lib/edusafe/types";
import { generateActaPDF } from "@/lib/edusafe/pdf";
import { AlertTriangle, Send, Image as ImgIcon, FileText, X, Inbox } from "lucide-react";

const SEV_COLOR: Record<Severity, string> = {
  CRITICA: "bg-red-600 text-white",
  ALTA: "bg-orange-500 text-white",
  MEDIA: "bg-amber-300 text-amber-900",
  BAJA: "bg-gray-200 text-gray-700",
};

const STATUS_LABEL: Record<string, string> = {
  abierto: "Abierto", investigacion: "En investigación", resuelto: "Resuelto", cerrado_falsa: "Falsa alarma",
};

export function MediatorView() {
  const [reports] = useReports();
  const students = useStudents();
  const [selected, setSelected] = useState<string | null>(null);
  const sel = reports.find(r => r.id === selected) || null;

  // Recidivism alert
  const recidivism = useMemo(() => {
    const counts: Record<string, number> = {};
    reports.forEach(r => r.involved.filter(i => i.role === "agresor").forEach(i => { counts[i.studentId] = (counts[i.studentId]||0)+1; }));
    const top = Object.entries(counts).filter(([,n]) => n >= 2).sort((a,b)=>b[1]-a[1])[0];
    if (!top) return null;
    const s = students.find(x => x.id === top[0]);
    return s ? `${top[1]} reportes mencionan a ${s.name} (${s.curso}), revisar` : null;
  }, [reports, students]);

  return (
    <div className="min-h-screen bg-[#F3F4F6] font-sans">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#0B3D91] text-white flex items-center justify-center text-sm font-bold">E</div>
        <div>
          <div className="text-sm font-bold text-gray-800">EduSafe · Mediador</div>
          <div className="text-xs text-gray-500">CEIP San Agustín</div>
        </div>
      </header>

      {recidivism && (
        <div className="bg-amber-100 border-y border-amber-200 px-6 py-2.5 flex items-center gap-2 text-sm text-amber-900">
          <AlertTriangle size={16}/> Alerta de reincidencia: {recidivism}
        </div>
      )}

      {!sel ? <Inbox1 reports={reports} onOpen={setSelected}/> : <CaseDetail report={sel} onBack={() => setSelected(null)}/>}
    </div>
  );
}

function Inbox1({ reports, onOpen }: { reports: Report[]; onOpen: (id:string)=>void }) {
  const [filter, setFilter] = useState<"todos"|"abiertos"|"criticos">("todos");
  const list = reports.filter(r => {
    if (filter === "abiertos") return r.status === "abierto" || r.status === "investigacion";
    if (filter === "criticos") return r.severity === "CRITICA";
    return true;
  });
  const staff = useStaff();
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Inbox size={20}/> Bandeja de casos</h1>
        <div className="flex gap-1 bg-white rounded-lg border border-gray-200 p-1">
          {[["todos","Todos"],["abiertos","Abiertos"],["criticos","Críticos"]].map(([k,l]) => (
            <button key={k} onClick={() => setFilter(k as any)}
              className={`px-3 py-1 text-xs rounded-md ${filter===k ? "bg-[#0B3D91] text-white" : "text-gray-600 hover:bg-gray-50"}`}>{l}</button>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="text-left px-4 py-2.5">ID</th>
              <th className="text-left px-4 py-2.5">Prioridad</th>
              <th className="text-left px-4 py-2.5">Estado</th>
              <th className="text-left px-4 py-2.5">Tipo</th>
              <th className="text-left px-4 py-2.5">Última actividad</th>
              <th className="text-left px-4 py-2.5">Asignado</th>
              <th className="text-right px-4 py-2.5">Acción</th>
            </tr>
          </thead>
          <tbody>
            {list.map(r => {
              const s = staff.find(x => x.id === r.assignedTo);
              const blink = r.severity === "CRITICA" && (r.status === "abierto" || r.status === "investigacion");
              return (
                <tr key={r.id} className={`border-t border-gray-100 hover:bg-gray-50 ${blink ? "animate-pulse" : ""}`}>
                  <td className="px-4 py-3 font-mono font-bold text-[#0B3D91]">{r.id}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${SEV_COLOR[r.severity]}`}>{r.severity}</span></td>
                  <td className="px-4 py-3 text-gray-600">{STATUS_LABEL[r.status]}</td>
                  <td className="px-4 py-3 text-gray-600">{r.tipo}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(r.updatedAt).toLocaleString("es-ES")}</td>
                  <td className="px-4 py-3 text-gray-600">{s?.name || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => onOpen(r.id)} className="text-[#0B3D91] hover:underline text-sm font-semibold">Abrir</button>
                  </td>
                </tr>
              );
            })}
            {list.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">Sin casos</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CaseDetail({ report, onBack }: { report: Report; onBack: () => void }) {
  const students = useStudents();
  const [reports, setReports] = useReports();
  const [, addAudit] = useAudit();
  const [, addActa] = useActas();
  const [showClose, setShowClose] = useState(false);
  const [text, setText] = useState("");

  function update(patch: Partial<Report>) {
    setReports(reports.map(r => r.id === report.id ? { ...r, ...patch, updatedAt: Date.now() } : r));
  }

  function send() {
    if (!text.trim()) return;
    const m: ChatMessage = { id: "m"+Date.now(), from: "mediador", text: text.trim(), ts: Date.now() };
    update({ chat: [...report.chat, m], status: report.status === "abierto" ? "investigacion" : report.status });
    addAudit({ id: "a"+Date.now(), ts: Date.now(), actor: "Ana Ruiz", action: "Mensaje enviado", caseId: report.id });
    setText("");
  }

  function toggleCheck(key: string) {
    const cl = report.checklist.map(c => c.key === key ? { ...c, done: !c.done, date: !c.done ? new Date().toISOString().slice(0,10) : c.date } : c);
    update({ checklist: cl });
    addAudit({ id: "a"+Date.now(), ts: Date.now(), actor: "Ana Ruiz", action: "Checklist actualizado", caseId: report.id });
  }

  function generateDraft() {
    const { dataUrl, verifyCode } = generateActaPDF(report, students);
    const a = document.createElement("a");
    a.href = dataUrl; a.download = `acta-borrador-${report.id}.pdf`; a.click();
    addAudit({ id: "a"+Date.now(), ts: Date.now(), actor: "Ana Ruiz", action: "Borrador acta generado", caseId: report.id });
    void verifyCode;
  }

  return (
    <div className="p-6">
      <button onClick={onBack} className="text-sm text-gray-500 mb-3 hover:underline">← Volver a bandeja</button>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-xs text-gray-400 uppercase">Caso</div>
                <div className="font-mono text-lg font-bold text-[#0B3D91]">{report.id}</div>
              </div>
              <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${SEV_COLOR[report.severity]}`}>{report.severity}</span>
            </div>
            <dl className="text-sm space-y-1.5">
              <Row k="Fecha" v={new Date(report.createdAt).toLocaleString("es-ES")}/>
              <Row k="Tipo" v={report.tipo}/>
              <Row k="Zona" v={report.zona}/>
              <Row k="Cuándo" v={report.cuando}/>
              <Row k="Estado" v={STATUS_LABEL[report.status]}/>
            </dl>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-bold text-gray-700 mb-2">Implicados</h3>
            <div className="space-y-1.5 text-sm">
              {report.involved.map((i, idx) => {
                const s = students.find(x => x.id === i.studentId);
                return s ? (
                  <div key={idx} className="flex justify-between border-b border-gray-50 pb-1">
                    <span className="text-gray-700">{s.name} <span className="text-gray-400">· {s.curso}</span></span>
                    <span className="text-xs uppercase text-gray-500">{i.role}</span>
                  </div>
                ) : null;
              })}
              {report.involved.length === 0 && <div className="text-xs text-gray-400">Sin implicados especificados</div>}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-bold text-gray-700 mb-2">Descripción inicial</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{report.description}</p>
          </div>

          {report.evidences.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-bold text-gray-700 mb-2">Evidencias</h3>
              <div className="grid grid-cols-3 gap-2">
                {report.evidences.map((u,i) => <img key={i} src={u} className="aspect-square object-cover rounded-lg"/>)}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: chat + checklist */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 flex flex-col h-[55vh]">
            <div className="px-4 py-2.5 border-b border-gray-100 text-sm font-semibold text-gray-700">
              Canal con denunciante anónimo
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {report.chat.length === 0 && <div className="text-center text-xs text-gray-400 my-4">Sin mensajes todavía</div>}
              {report.chat.map(m => (
                <div key={m.id} className={`flex ${m.from === "mediador" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] px-3.5 py-2 rounded-2xl text-sm ${
                    m.from === "mediador" ? "bg-[#0B3D91] text-white rounded-br-md" : "bg-gray-100 text-gray-700 rounded-bl-md"
                  }`}>
                    {m.image ? <img src={m.image} className="rounded-lg max-w-[200px]"/> : m.text}
                    <div className="text-[10px] opacity-60 mt-0.5">{new Date(m.ts).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"})}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 p-2 flex gap-2">
              <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}
                placeholder="Escribir respuesta…"
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0B3D91]"/>
              <button onClick={send} className="px-4 rounded-lg bg-[#0B3D91] text-white text-sm font-semibold flex items-center gap-1"><Send size={14}/> Enviar</button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Checklist legal</h3>
            <div className="space-y-2">
              {report.checklist.map(c => (
                <div key={c.key} className="flex items-center gap-3 text-sm">
                  <input type="checkbox" checked={c.done} onChange={() => toggleCheck(c.key)} className="w-4 h-4 accent-[#0B3D91]"/>
                  <span className={c.done ? "text-gray-700" : "text-gray-500"}>{c.label}</span>
                  {c.date && <span className="ml-auto text-xs text-gray-400">{c.date}</span>}
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={generateDraft} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-white border border-gray-300 text-sm font-semibold hover:bg-gray-50">
                <FileText size={14}/> Generar borrador acta
              </button>
              {report.status !== "resuelto" && report.status !== "cerrado_falsa" && (
                <button onClick={() => setShowClose(true)} className="px-4 py-2 rounded-lg bg-[#C8102E] text-white text-sm font-semibold hover:bg-red-700">
                  Cerrar caso
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showClose && <CloseModal report={report} onClose={() => setShowClose(false)} onConfirm={(closure) => {
        const { dataUrl, verifyCode } = generateActaPDF({ ...report, closure: { ...closure, closedAt: Date.now() } } as Report, students);
        const newStatus = closure.estadoFinal === "Falsa alarma" ? "cerrado_falsa" : "resuelto";
        const acta = { id: "ACTA-"+report.id, caseId: report.id, createdAt: Date.now(), verifyCode, pdfDataUrl: dataUrl };
        update({ status: newStatus, closure: { ...closure, closedAt: Date.now(), actaId: acta.id } });
        addActa(acta);
        addAudit({ id: "a"+Date.now(), ts: Date.now(), actor: "Ana Ruiz", action: "Caso cerrado", caseId: report.id });
        const a = document.createElement("a"); a.href = dataUrl; a.download = `acta-${report.id}.pdf`; a.click();
        setShowClose(false);
      }}/>}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-2"><dt className="text-gray-400">{k}</dt><dd className="text-gray-700 text-right">{v}</dd></div>;
}

const MEDIDAS_OPTS = [
  "Entrevista realizada con familias",
  "Cambio de aula/grupo",
  "Notificación a Fiscalía de Menores",
  "Mediación entre partes",
  "Plan de seguimiento",
  "Otra",
];

function CloseModal({ report, onClose, onConfirm }: {
  report: Report; onClose: () => void;
  onConfirm: (c: { medidas: string[]; valoracion: string; estadoFinal: "Resuelto"|"Derivado"|"Falsa alarma" }) => void;
}) {
  const [medidas, setMedidas] = useState<string[]>([]);
  const [val, setVal] = useState("");
  const [estado, setEstado] = useState<"Resuelto"|"Derivado"|"Falsa alarma">("Resuelto");
  const [err, setErr] = useState("");

  const requiresStrict = report.severity === "CRITICA" || report.severity === "ALTA";
  const familiasNotificadas = report.checklist.find(c => c.key === "notificacion_familias")?.done;

  function submit() {
    if (requiresStrict) {
      if (medidas.length === 0) return setErr("Debes marcar al menos una medida cautelar");
      if (val.length < 50) return setErr("La valoración debe tener al menos 50 caracteres");
      if (!familiasNotificadas) return setErr("Debes marcar 'Notificación a familias' en el checklist antes de cerrar");
    }
    onConfirm({ medidas, valoracion: val, estadoFinal: estado });
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800">Cerrar caso {report.id}</h3>
          <button onClick={onClose} className="text-gray-400"><X size={18}/></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Medidas cautelares</h4>
            <div className="space-y-1.5">
              {MEDIDAS_OPTS.map(m => (
                <label key={m} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={medidas.includes(m)} onChange={e =>
                    setMedidas(e.target.checked ? [...medidas, m] : medidas.filter(x => x !== m))
                  } className="accent-[#0B3D91]"/>
                  {m}
                </label>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-1">Valoración pedagógica <span className="text-xs text-gray-400">(mín. 50 car.)</span></h4>
            <textarea value={val} onChange={e=>setVal(e.target.value)} rows={5}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0B3D91]"/>
            <div className="text-xs text-gray-400 text-right">{val.length}/50</div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Estado final</h4>
            <div className="flex gap-2">
              {(["Resuelto","Derivado","Falsa alarma"] as const).map(e => (
                <label key={e} className={`flex-1 text-center px-3 py-2 rounded-lg border text-sm cursor-pointer ${estado===e?"border-[#0B3D91] bg-blue-50 text-[#0B3D91]":"border-gray-200 text-gray-600"}`}>
                  <input type="radio" className="hidden" checked={estado===e} onChange={()=>setEstado(e)}/>
                  {e}
                </label>
              ))}
            </div>
          </div>
          {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</div>}
        </div>
        <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-sm">Cancelar</button>
          <button onClick={submit} className="px-4 py-2 rounded-lg bg-[#C8102E] text-white text-sm font-semibold">Cerrar y generar acta</button>
        </div>
      </div>
    </div>
  );
}
