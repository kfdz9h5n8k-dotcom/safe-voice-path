import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useReports, useStaff, useStudents } from "@/lib/edusafe/store";
import type { Report, Severity } from "@/lib/edusafe/types";
import { AlertTriangle, Inbox, FileText } from "lucide-react";

const SEV_COLOR: Record<Severity, string> = {
  CRITICA: "bg-red-600 text-white",
  ALTA: "bg-orange-500 text-white",
  MEDIA: "bg-amber-300 text-amber-900",
  BAJA: "bg-green-500 text-white",
};

const STATUS_LABEL: Record<string, string> = {
  abierto: "Abierto", investigacion: "En investigación", resuelto: "Resuelto", cerrado_falsa: "Falsa alarma",
};

export function MediatorHeader() {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-[#0B3D91] text-white flex items-center justify-center text-sm font-bold">E</div>
      <div className="flex-1">
        <div className="text-sm font-bold text-gray-800">EduSafe · Mediador</div>
        <div className="text-xs text-gray-500">CEIP San Agustín</div>
      </div>
      <nav className="flex items-center gap-1 text-sm">
        <Link to="/" className="px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100 flex items-center gap-1.5">
          <Inbox size={14} /> Bandeja
        </Link>
        <Link to="/mediador/actas" className="px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100 flex items-center gap-1.5">
          <FileText size={14} /> Actas
        </Link>
      </nav>
    </header>
  );
}

export function MediatorView() {
  const [reports] = useReports();
  const students = useStudents();

  const recidivism = useMemo(() => {
    const counts: Record<string, number> = {};
    reports.forEach(r => r.involved.filter(i => i.role === "agresor").forEach(i => { counts[i.studentId] = (counts[i.studentId] || 0) + 1; }));
    const top = Object.entries(counts).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1])[0];
    if (!top) return null;
    const s = students.find(x => x.id === top[0]);
    return s ? `${top[1]} reportes mencionan a ${s.name} (${s.curso}), revisar` : null;
  }, [reports, students]);

  return (
    <div className="min-h-screen bg-[#F3F4F6] font-sans">
      <MediatorHeader />
      {recidivism && (
        <div className="bg-amber-100 border-y border-amber-200 px-6 py-2.5 flex items-center gap-2 text-sm text-amber-900">
          <AlertTriangle size={16} /> Alerta de reincidencia: {recidivism}
        </div>
      )}
      <InboxList reports={reports} />
    </div>
  );
}

function hasUnread(r: Report) {
  if (r.chat.length === 0) return false;
  const last = r.chat[r.chat.length - 1];
  return last.from === "alumno";
}

function InboxList({ reports }: { reports: Report[] }) {
  const [filter, setFilter] = useState<"todos" | "abiertos" | "criticos">("todos");
  const list = reports.filter(r => {
    if (filter === "abiertos") return r.status === "abierto" || r.status === "investigacion";
    if (filter === "criticos") return r.severity === "CRITICA";
    return true;
  });
  const staff = useStaff();
  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Inbox size={20} /> Bandeja de casos</h1>
        <div className="flex gap-1 bg-white rounded-lg border border-gray-200 p-1">
          {[["todos", "Todos"], ["abiertos", "Abiertos"], ["criticos", "Críticos"]].map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k as any)}
              className={`px-3 py-1 text-xs rounded-md ${filter === k ? "bg-[#0B3D91] text-white" : "text-gray-600 hover:bg-gray-50"}`}>{l}</button>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="text-left px-4 py-2.5 w-6"></th>
              <th className="text-left px-4 py-2.5">ID</th>
              <th className="text-left px-4 py-2.5">Prioridad</th>
              <th className="text-left px-4 py-2.5">Estado</th>
              <th className="text-left px-4 py-2.5">Tipo</th>
              <th className="text-left px-4 py-2.5">Última actividad</th>
              <th className="text-left px-4 py-2.5">Asignado</th>
            </tr>
          </thead>
          <tbody>
            {list.map(r => {
              const s = staff.find(x => x.id === r.assignedTo);
              const blink = r.severity === "CRITICA" && (r.status === "abierto" || r.status === "investigacion");
              const unread = hasUnread(r);
              return (
                <tr key={r.id} className={`border-t border-gray-100 hover:bg-blue-50/40 cursor-pointer transition ${blink ? "animate-pulse" : ""}`}>
                  <td className="px-4 py-3">
                    <Link to="/mediador/caso/$caseId" params={{ caseId: r.id }} className="block">
                      {unread ? <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" title="Mensaje nuevo del denunciante"></span> : <span className="w-2.5 h-2.5 inline-block"></span>}
                    </Link>
                  </td>
                  <td className="px-0 py-0"><Link to="/mediador/caso/$caseId" params={{ caseId: r.id }} className="block px-4 py-3 font-mono font-bold text-[#0B3D91]">{r.id}</Link></td>
                  <td className="px-0 py-0"><Link to="/mediador/caso/$caseId" params={{ caseId: r.id }} className="block px-4 py-3"><span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${SEV_COLOR[r.severity]}`}>{r.severity}</span></Link></td>
                  <td className="px-0 py-0"><Link to="/mediador/caso/$caseId" params={{ caseId: r.id }} className="block px-4 py-3 text-gray-600">{STATUS_LABEL[r.status]}</Link></td>
                  <td className="px-0 py-0"><Link to="/mediador/caso/$caseId" params={{ caseId: r.id }} className="block px-4 py-3 text-gray-600">{r.tipo}</Link></td>
                  <td className="px-0 py-0"><Link to="/mediador/caso/$caseId" params={{ caseId: r.id }} className="block px-4 py-3 text-gray-500 text-xs">{new Date(r.updatedAt).toLocaleString("es-ES")}</Link></td>
                  <td className="px-0 py-0"><Link to="/mediador/caso/$caseId" params={{ caseId: r.id }} className="block px-4 py-3 text-gray-600">{s?.name || "—"}</Link></td>
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
