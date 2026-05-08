import { useMemo } from "react";
import { useReports, useStudents, useAudit, useActas } from "@/lib/edusafe/store";
import { downloadActa } from "@/lib/edusafe/actas";
import { BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { Download } from "lucide-react";
import type { Severity } from "@/lib/edusafe/types";

const SEV_WEIGHT: Record<Severity, number> = { CRITICA: 4, ALTA: 3, MEDIA: 2, BAJA: 1 };

export function DirectorView() {
  const [reports] = useReports();
  const students = useStudents();
  const [audit] = useAudit();
  const [actas] = useActas();

  const stats = useMemo(() => {
    const now = Date.now();
    const month = 30 * 86400000;
    const inMonth = reports.filter(r => now - r.createdAt < month);
    const prevMonth = reports.filter(r => now - r.createdAt >= month && now - r.createdAt < month*2);
    const open = reports.filter(r => r.status === "abierto" || r.status === "investigacion");
    const critical = open.filter(r => r.severity === "CRITICA");

    // tiempo medio respuesta: createdAt → primer mensaje del mediador
    const responses = reports.map(r => {
      const first = r.chat.find(m => m.from === "mediador");
      return first ? (first.ts - r.createdAt) / 3600000 : null;
    }).filter((x): x is number => x !== null);
    const avgResp = responses.length ? responses.reduce((a,b)=>a+b,0)/responses.length : 0;

    // termómetro
    const totalWeight = reports.reduce((a,r) => a + SEV_WEIGHT[r.severity], 0);
    const therm = Math.max(0, Math.min(100, 100 - (totalWeight * 100 / Math.max(1, reports.length * 4))));

    // tipologías
    const tipos: Record<string, number> = {};
    reports.forEach(r => { tipos[r.tipo] = (tipos[r.tipo]||0)+1; });
    const tipoData = Object.entries(tipos).map(([name, value]) => ({ name, value }));

    // mapa de calor por zona
    const zoneCounts: Record<string, number> = {};
    reports.forEach(r => { zoneCounts[r.zona] = (zoneCounts[r.zona]||0)+1; });

    // reincidencia
    const aggressorCounts: Record<string, { count: number; lastDate: number; tokens: Set<string> }> = {};
    reports.forEach(r => r.involved.filter(i => i.role === "agresor").forEach(i => {
      if (!aggressorCounts[i.studentId]) aggressorCounts[i.studentId] = { count: 0, lastDate: 0, tokens: new Set() };
      aggressorCounts[i.studentId].count++;
      aggressorCounts[i.studentId].lastDate = Math.max(aggressorCounts[i.studentId].lastDate, r.createdAt);
      aggressorCounts[i.studentId].tokens.add(r.deviceToken);
    }));
    const recid = Object.entries(aggressorCounts)
      .filter(([,v]) => v.count >= 3 && v.tokens.size >= 1)
      .map(([id, v]) => {
        const s = students.find(x => x.id === id);
        return s ? { name: s.name, curso: s.curso, count: v.count, lastDate: v.lastDate } : null;
      }).filter(Boolean);

    // SLA línea: últimos 30 días
    const slaData: { day: string; hours: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      const dayStart = new Date(d).setHours(0,0,0,0);
      const dayEnd = dayStart + 86400000;
      const dayReports = reports.filter(r => r.createdAt >= dayStart && r.createdAt < dayEnd);
      const dayResp = dayReports.map(r => {
        const f = r.chat.find(m => m.from === "mediador");
        return f ? (f.ts - r.createdAt)/3600000 : null;
      }).filter((x): x is number => x !== null);
      slaData.push({
        day: d.getDate() + "/" + (d.getMonth()+1),
        hours: dayResp.length ? Math.round(dayResp.reduce((a,b)=>a+b,0)/dayResp.length * 10)/10 : 0,
      });
    }

    return {
      total: inMonth.length,
      delta: inMonth.length - prevMonth.length,
      open: open.length,
      critical: critical.length,
      avgResp: Math.round(avgResp * 10) / 10,
      therm: Math.round(therm),
      tipoData,
      zoneCounts,
      recid: recid as any[],
      slaData,
    };
  }, [reports, students]);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="text-sm font-bold text-gray-800">EduSafe · Dirección</div>
        <div className="text-xs text-gray-500">CEIP San Agustín · Carmen López</div>
      </header>

      <div className="p-6 grid grid-cols-12 gap-4">
        {/* D1 - 3 KPIs */}
        <Card className="col-span-12 md:col-span-4">
          <Kpi label="Reportes este mes" value={stats.total} delta={stats.delta} />
        </Card>
        <Card className="col-span-12 md:col-span-4">
          <Kpi label="Casos abiertos" value={stats.open} sub={`${stats.critical} críticos`} subColor={stats.critical>0?"text-red-600":""}/>
        </Card>
        <Card className="col-span-12 md:col-span-4">
          <Kpi label="Tiempo medio respuesta" value={`${stats.avgResp}h`} sub={`SLA objetivo: 4h`} subColor={stats.avgResp>4?"text-orange-500":"text-emerald-600"}/>
        </Card>

        {/* D2 termómetro */}
        <Card className="col-span-12 md:col-span-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Termómetro de convivencia</h3>
          <Gauge value={stats.therm}/>
        </Card>

        {/* D3 tipologías */}
        <Card className="col-span-12 md:col-span-8">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Tipologías de reportes</h3>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.tipoData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee"/>
                <XAxis dataKey="name" tick={{fontSize:11}}/>
                <YAxis tick={{fontSize:11}} allowDecimals={false}/>
                <Tooltip />
                <Bar dataKey="value" fill="#0B3D91" radius={[6,6,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* D4 mapa de calor */}
        <Card className="col-span-12 lg:col-span-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Mapa de calor del centro</h3>
          <SchoolHeatmap counts={stats.zoneCounts}/>
        </Card>

        {/* D6 SLA */}
        <Card className="col-span-12 lg:col-span-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Cumplimiento SLA (últimos 30 días)</h3>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.slaData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee"/>
                <XAxis dataKey="day" tick={{fontSize:10}} interval={4}/>
                <YAxis tick={{fontSize:11}}/>
                <Tooltip/>
                <ReferenceLine y={4} stroke="#ef4444" strokeDasharray="4 4" label={{value:"SLA 4h", fontSize:10, fill:"#ef4444"}}/>
                <Line type="monotone" dataKey="hours" stroke="#0B3D91" strokeWidth={2} dot={{r:2}}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* D5 reincidencia */}
        <Card className="col-span-12 md:col-span-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Reincidencia (3+ reportes / 90d)</h3>
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-400 uppercase">
              <tr><th className="text-left pb-2">Alumno</th><th>Curso</th><th>Reportes</th><th>Última</th></tr>
            </thead>
            <tbody>
              {stats.recid.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-xs text-gray-400">Sin alumnos reincidentes</td></tr>}
              {stats.recid.map((r:any,i:number) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="py-2 text-gray-700">{r.name}</td>
                  <td className="text-center text-gray-600">{r.curso}</td>
                  <td className="text-center font-semibold text-orange-600">{r.count}</td>
                  <td className="text-center text-gray-500 text-xs">{new Date(r.lastDate).toLocaleDateString("es-ES")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[10px] text-gray-400 mt-2">Solo metadatos. Sin acceso al contenido del chat.</p>
        </Card>

        {/* D7 audit */}
        <Card className="col-span-12 md:col-span-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Log de auditoría</h3>
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {audit.slice(0, 20).map(a => (
              <div key={a.id} className="flex justify-between text-xs border-b border-gray-50 pb-1">
                <div>
                  <div className="text-gray-700">{a.action} {a.caseId && <span className="font-mono text-[#0B3D91]">· {a.caseId}</span>}</div>
                  <div className="text-gray-400">{a.actor}</div>
                </div>
                <div className="text-gray-400">{new Date(a.ts).toLocaleString("es-ES")}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* D8 actas */}
        <Card className="col-span-12">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Archivo de actas finales</h3>
          <ActasFinales />
        </Card>
      </div>
    </div>
  );
}

function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`bg-white rounded-xl border border-gray-200 p-4 ${className}`}>{children}</div>;
}

function Kpi({ label, value, sub, delta, subColor = "" }: { label: string; value: any; sub?: string; delta?: number; subColor?: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500 uppercase">{label}</div>
      <div className="text-3xl font-bold text-gray-800 mt-1">{value}</div>
      {typeof delta === "number" && (
        <div className={`text-xs mt-1 ${delta >= 0 ? "text-emerald-600" : "text-red-600"}`}>
          {delta >= 0 ? "↑ +" : "↓ "}{delta} vs mes anterior
        </div>
      )}
      {sub && <div className={`text-xs mt-1 ${subColor || "text-gray-500"}`}>{sub}</div>}
    </div>
  );
}

function Gauge({ value }: { value: number }) {
  const radius = 60;
  const circ = Math.PI * radius;
  const offset = circ - (value / 100) * circ;
  const color = value > 70 ? "#10b981" : value > 40 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex flex-col items-center">
      <svg width="160" height="90" viewBox="0 0 160 90">
        <path d="M 20 80 A 60 60 0 0 1 140 80" fill="none" stroke="#e5e7eb" strokeWidth="14" strokeLinecap="round"/>
        <path d="M 20 80 A 60 60 0 0 1 140 80" fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 0.6s" }}/>
      </svg>
      <div className="text-3xl font-bold" style={{ color }}>{value}</div>
      <div className="text-xs text-gray-400">/ 100</div>
    </div>
  );
}

function SchoolHeatmap({ counts }: { counts: Record<string, number> }) {
  function color(zone: string) {
    const c = counts[zone] || 0;
    if (c === 0) return "#dcfce7";
    if (c <= 1) return "#bbf7d0";
    if (c <= 2) return "#fde68a";
    if (c <= 4) return "#fb923c";
    return "#dc2626";
  }
  function txt(zone: string) {
    return <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-gray-800 text-[10px] font-semibold">{zone} ({counts[zone]||0})</text>;
  }
  return (
    <svg viewBox="0 0 400 240" className="w-full h-auto">
      <rect width="400" height="240" fill="#f9fafb" rx="8"/>
      {/* Comedor */}
      <g><rect x="20" y="20" width="120" height="60" fill={color("Comedor")} rx="6"/>
        <text x="80" y="55" textAnchor="middle" className="text-[11px] font-semibold fill-gray-800">Comedor ({counts["Comedor"]||0})</text>
      </g>
      {/* Aulas A-D */}
      {["Aula A","Aula B","Aula C","Aula D"].map((a,i) => (
        <g key={a}><rect x={160 + (i%2)*60} y={20 + Math.floor(i/2)*32} width="50" height="26" fill={color("Aula")} rx="4"/>
          <text x={185 + (i%2)*60} y={37 + Math.floor(i/2)*32} textAnchor="middle" className="text-[9px] fill-gray-700">{a}</text>
        </g>
      ))}
      {/* Baños */}
      <g><rect x="290" y="20" width="90" height="40" fill={color("Baños PB")} rx="6"/>
        <text x="335" y="44" textAnchor="middle" className="text-[10px] font-semibold fill-gray-800">Baños ({(counts["Baños PB"]||0)+(counts["Baños P1"]||0)})</text>
      </g>
      {/* Pasillo */}
      <g><rect x="20" y="100" width="360" height="22" fill={color("Pasillo")} rx="4"/>
        <text x="200" y="115" textAnchor="middle" className="text-[10px] font-semibold fill-gray-800">Pasillo ({counts["Pasillo"]||0})</text>
      </g>
      {/* Patio */}
      <g><rect x="20" y="140" width="360" height="80" fill={color("Patio")} rx="6"/>
        <text x="200" y="184" textAnchor="middle" className="text-[12px] font-bold fill-gray-800">Patio ({counts["Patio"]||0})</text>
      </g>
    </svg>
  );
}

function ActasFinales() {
  const [actas] = useActas();
  const students = useStudents();
  const finales = actas.filter(a => a.type === "final");
  if (finales.length === 0) {
    return <p className="text-xs text-gray-400">No hay actas finales generadas este periodo.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[600px]">
        <thead className="text-xs text-gray-400 uppercase">
          <tr>
            <th className="text-left pb-2">Caso</th>
            <th className="text-left pb-2">Fecha cierre</th>
            <th className="text-left pb-2">Mediador</th>
            <th className="text-left pb-2">CSV code</th>
            <th className="text-left pb-2">Acción</th>
          </tr>
        </thead>
        <tbody>
          {finales.map(a => (
            <tr key={a.id} className="border-t border-gray-100">
              <td className="py-2 font-mono font-bold text-[#0B3D91]">{a.caseCode}</td>
              <td className="py-2 text-gray-600">{new Date(a.createdAt).toLocaleString("es-ES")}</td>
              <td className="py-2 text-gray-600">{a.generatedBy}</td>
              <td className="py-2 font-mono text-xs text-gray-500">{a.verifyCode}</td>
              <td className="py-2">
                <button onClick={() => downloadActa(a, students)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#0B3D91] text-white text-xs font-semibold hover:bg-blue-900">
                  <Download size={14} /> Descargar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
