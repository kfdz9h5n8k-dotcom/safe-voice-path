import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { initSeedIfNeeded, useActas, useStudents, useView } from "@/lib/edusafe/store";
import { ViewSwitcher } from "@/components/edusafe/ViewSwitcher";
import { MediatorHeader } from "@/components/edusafe/MediatorView";
import { downloadActa } from "@/lib/edusafe/actas";
import { Download, FileText } from "lucide-react";

export const Route = createFileRoute("/mediador/actas")({
  component: ActasRoute,
});

function ActasRoute() {
  const [ready, setReady] = useState(false);
  const [, setView] = useView();

  useEffect(() => {
    initSeedIfNeeded();
    setView("mediador");
    setReady(true);
  }, [setView]);

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-[#F3F4F6] font-sans">
      <ViewSwitcher />
      <MediatorHeader />
      <ActasArchive />
    </div>
  );
}

function ActasArchive() {
  const [actas] = useActas();
  const students = useStudents();
  const [tipo, setTipo] = useState<"todas" | "borrador" | "final">("todas");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    return actas.filter(a => {
      if (tipo !== "todas" && a.type !== tipo) return false;
      if (q && !a.caseCode.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [actas, tipo, q]);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-4">
        <FileText size={20} /> Archivo de actas
      </h1>

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex gap-1 bg-white rounded-lg border border-gray-200 p-1">
          {([["todas","Todas"],["borrador","Borradores"],["final","Finales"]] as const).map(([k,l]) => (
            <button key={k} onClick={() => setTipo(k)}
              className={`px-3 py-1 text-xs rounded-md ${tipo === k ? "bg-[#0B3D91] text-white" : "text-gray-600 hover:bg-gray-50"}`}>{l}</button>
          ))}
        </div>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por código de caso…"
          className="flex-1 min-w-[180px] max-w-xs px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0B3D91]" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[680px]">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="text-left px-4 py-2.5">Tipo</th>
              <th className="text-left px-4 py-2.5">Caso</th>
              <th className="text-left px-4 py-2.5">Generada el</th>
              <th className="text-left px-4 py-2.5">Generada por</th>
              <th className="text-left px-4 py-2.5">CSV code</th>
              <th className="text-left px-4 py-2.5">Acción</th>
            </tr>
          </thead>
          <tbody>
            {list.map(a => (
              <tr key={a.id} className="border-t border-gray-100">
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${
                    a.type === "final" ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-700"
                  }`}>{a.type === "final" ? "Final" : "Borrador"}</span>
                </td>
                <td className="px-4 py-3 font-mono font-bold text-[#0B3D91]">{a.caseCode}</td>
                <td className="px-4 py-3 text-gray-600">{new Date(a.createdAt).toLocaleString("es-ES")}</td>
                <td className="px-4 py-3 text-gray-600">{a.generatedBy}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{a.verifyCode}</td>
                <td className="px-4 py-3">
                  <button onClick={() => downloadActa(a, students)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B3D91] text-white text-xs font-semibold hover:bg-blue-900">
                    <Download size={14} /> Descargar
                  </button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">No hay actas que coincidan con los filtros.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
