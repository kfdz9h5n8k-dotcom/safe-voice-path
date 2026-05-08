import type { Report, Student, Acta } from "./types";
import { generateActaPDF } from "./pdf";

const MAX_DATA_URL_BYTES = 1000000;

export function resolveActaPDF(acta: Acta, students: Student[]) {
  if (acta.pdfDataUrl) {
    const blob = dataUrlToBlob(acta.pdfDataUrl);
    return { dataUrl: acta.pdfDataUrl, blob, fileName: acta.fileName || "ACTA.pdf" };
  }
  if (!acta.caseSnapshot) {
    throw new Error("Acta sin snapshot");
  }
  const r = generateActaPDF(acta.caseSnapshot, students, { type: acta.type, verifyCode: acta.verifyCode });
  return { dataUrl: r.dataUrl, blob: r.blob, fileName: acta.fileName || r.fileName };
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(",");
  const m = /data:(.*?);base64/.exec(parts[0]);
  const mime = m ? m[1] : "application/pdf";
  const bin = atob(parts[1]);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return new Blob([buf], { type: mime });
}

export function downloadPDF(blob: Blob | null, dataUrl: string, fileName: string) {
  if (blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    return;
  }
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function sharePDF(blob: Blob, fileName: string, title?: string): Promise<boolean> {
  try {
    const file = new File([blob], fileName, { type: "application/pdf" });
    const nav = navigator as any;
    if (nav.canShare && nav.canShare({ files: [file] })) {
      await navigator.share({ title: title || "Acta", files: [file] });
      return true;
    }
  } catch (e) {}
  return false;
}

export function openPDFInNewTab(blob: Blob | null, dataUrl: string) {
  if (blob) {
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if (!w) window.location.href = url;
    return;
  }
  window.open(dataUrl, "_blank");
}

export function buildActa(report: Report, students: Student[], type: "borrador" | "final", generatedBy: string) {
  const r = generateActaPDF(report, students, { type });
  const tooBig = r.dataUrl.length > MAX_DATA_URL_BYTES;
  const prefix = type === "borrador" ? "B" : "F";
  const acta: Acta = {
    id: "ACTA-" + prefix + "-" + report.id + "-" + Date.now().toString(36),
    caseId: report.id,
    caseCode: report.id,
    type: type,
    createdAt: Date.now(),
    generatedBy: generatedBy,
    verifyCode: r.verifyCode,
    fileName: r.fileName,
    pdfDataUrl: tooBig ? undefined : r.dataUrl,
    caseSnapshot: report,
  };
  return { acta: acta, blob: r.blob, dataUrl: r.dataUrl, fileName: r.fileName };
}
