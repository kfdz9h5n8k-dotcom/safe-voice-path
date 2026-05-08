import type { Report, Student, Acta } from "./types";
import { generateActaPDF } from "./pdf";

const MAX_DATA_URL_BYTES = 1_000_000; // 1 MB

export function downloadPDF(blob: Blob | null, dataUrl: string, fileName: string) {
  try {
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      return;
    }
  } catch {
    // fallthrough to dataUrl
  }
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // iOS Safari fallback
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua) && /safari/.test(ua) && !/chrome|crios|fxios/.test(ua)) {
    setTimeout(() => window.open(dataUrl, "_blank"), 200);
  }
}

export function downloadActa(acta: Acta, students: Student[]) {
  const fallbackName = acta.fileName || `ACTA_${acta.caseId}.pdf`;
  if (acta.pdfDataUrl) {
    downloadPDF(null, acta.pdfDataUrl, fallbackName);
    return;
  }
  if (!acta.caseSnapshot) return;
  const { dataUrl, blob, fileName } = generateActaPDF(acta.caseSnapshot, students, {
    type: acta.type,
    verifyCode: acta.verifyCode,
  });
  downloadPDF(blob, dataUrl, acta.fileName || fileName);
}

export function buildActa(report: Report, students: Student[], type: "borrador" | "final", generatedBy: string): { acta: Acta; blob: Blob; dataUrl: string; fileName: string } {
  const { dataUrl, blob, verifyCode, fileName } = generateActaPDF(report, students, { type });
  const tooBig = dataUrl.length > MAX_DATA_URL_BYTES;
  const acta: Acta = {
    id: `ACTA-${type === "borrador" ? "B" : "F"}-${report.id}-${Date.now().toString(36)}`,
    caseId: report.id,
    caseCode: report.id,
    type,
    createdAt: Date.now(),
    generatedBy,
    verifyCode,
    fileName,
    pdfDataUrl: tooBig ? undefined : dataUrl,
    caseSnapshot: report,
  };
  return { acta, blob, dataUrl, fileName };
}
