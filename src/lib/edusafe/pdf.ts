import jsPDF from "jspdf";
import type { Report, Student } from "./types";
import { genVerifyCode } from "./store";

export function generateActaPDF(report: Report, students: Student[], opts?: { type?: "borrador" | "final"; verifyCode?: string }): { dataUrl: string; blob: Blob; verifyCode: string; fileName: string } {
  const doc = new jsPDF();
  const code = opts?.verifyCode || genVerifyCode();
  const tipo = opts?.type === "borrador" ? "BORRADOR" : "ACTA";
  const ymd = new Date().toISOString().slice(0,10).replace(/-/g,"");
  const fileName = `${tipo === "BORRADOR" ? "BORRADOR" : "ACTA"}_${report.id}_${ymd}.pdf`;
  const W = 210;
  let y = 18;

  doc.setFillColor(11, 61, 145);
  doc.rect(0, 0, W, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("ACTA DE RESOLUCIÓN DE CONFLICTOS - CEIP San Agustín", 12, 14);
  doc.setTextColor(40, 40, 40);
  y = 32;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Nº expediente: ${report.id}`, 12, y);
  doc.setFont("helvetica", "normal");
  doc.text(`Fecha apertura: ${new Date(report.createdAt).toLocaleDateString("es-ES")}`, 110, y);
  y += 6;
  doc.text(`Fecha cierre: ${new Date(report.closure?.closedAt || Date.now()).toLocaleDateString("es-ES")}`, 12, y);
  doc.text(`Tipo: ${report.tipo}    Severidad: ${report.severity}`, 110, y);
  y += 6;
  doc.text(`Zona: ${report.zona}    Cuándo: ${report.cuando}`, 12, y);
  y += 10;

  doc.setFont("helvetica", "bold"); doc.text("Cronología", 12, y); y += 6;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  const events: { t: number; label: string }[] = [
    { t: report.createdAt, label: "Apertura del caso" },
    ...report.checklist.filter(c => c.done && c.date).map(c => ({ t: new Date(c.date!).getTime(), label: c.label })),
  ];
  if (report.closure) events.push({ t: report.closure.closedAt, label: `Cierre: ${report.closure.estadoFinal}` });
  events.sort((a,b) => a.t - b.t);
  for (const e of events) {
    doc.text(`• ${new Date(e.t).toLocaleString("es-ES")} — ${e.label}`, 14, y); y += 5;
  }
  y += 4;

  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text("Implicados (denunciante anónimo)", 12, y); y += 6;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  for (const inv of report.involved) {
    const s = students.find(x => x.id === inv.studentId);
    if (!s) continue;
    doc.text(`• ${inv.role.toUpperCase()}: ${s.name} (${s.curso})`, 14, y); y += 5;
  }
  y += 4;

  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text("Medidas adoptadas", 12, y); y += 6;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  for (const m of (report.closure?.medidas || [])) { doc.text(`• ${m}`, 14, y); y += 5; }
  y += 3;

  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text("Valoración del mediador", 12, y); y += 6;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  const lines = doc.splitTextToSize(report.closure?.valoracion || "", 186);
  doc.text(lines, 12, y); y += lines.length * 5 + 6;

  if (y > 250) { doc.addPage(); y = 20; }
  doc.setDrawColor(200);
  doc.line(12, y, 198, y); y += 7;
  doc.setFontSize(8); doc.setTextColor(100);
  doc.text(`Código de verificación: ${code}`, 12, y); y += 4;
  doc.text(`Verifique este documento en edusafe.app/verificar/${code}`, 12, y);

  return { dataUrl: doc.output("dataurlstring"), verifyCode: code };
}
