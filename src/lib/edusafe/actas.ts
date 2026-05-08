import type { Report, Student, Acta } from "./types";
import { generateActaPDF } from "./pdf";

const MAX_DATA_URL_BYTES = 1000000;

export function resolveActaPDF(acta: Acta, students: Student[]): { dataUrl: string; blob: Blob; fileName: string } {
  if (acta.pdfDataUrl) {
    const blob = dataUrlToBlob(acta.pdfDataUrl);
    return { dataUrl: acta.pdfDataUrl, blob, fileName: acta.fileName || "ACTA_" + acta.caseId + ".pdf" };
  }
  if (!acta.caseSnapshot) {
    throw new Error("Acta sin snapshot ni dataUrl");
  }
  const result = generateActaPDF(acta.caseSnapshot, students, {
    type: acta.type,
    verifyCode: acta.verifyCode,
  });
  return { dataUrl: result.dataUrl, blob: result.blob, fileName: acta.fileName || result.fileName };
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(",");
  const meta = parts[0];
  const b64 = parts[1];
  const mimeMatch = /data:(.*?);base64/.exec(meta);
  const mime = mimeMatch ? mimeMatch[1] : "application/pdf";
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    buf[i] = bin.charCodeAt(i);
  }
  return new Blob([buf], { type: mime });
}

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
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      return;
    }
  } catch (e) {
    // fallthrough
  }
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function sharePDF(blob: Blob, fileName: string, title?: string): Promise<boolean> {
  const finalTitle = title || "Acta EduSafe";
  try {
    const file = new File([blob], fileName, { type: "application/pdf" });
    const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
    if (nav.canShare && nav.canShare({ files: [file] })) {
      await navigator.share({ title: finalTitle, files: [file] });
      return true;
    }
  } catch (e) {
    // user cancelled o no soportado
  }
  return false;
}

export function openPDFInNewTab(blob: Blob | null, dataUrl: string) {
  try {
    if (blob) {
      const url = URL.createObjectURL(blob);
      const w = window.open(url, "_blank");
      if (!w) {
        window.location.href = url;
      }
      return;
    }
  } catch (e) {
    // fallthrough
  }
  window.open(dataUrl, "_blank");
}

export function buildActa(report: Report, students: Student[], type: "borrador" | "final", generatedBy: string): { acta: Acta; blob: Blob; dataUrl: string; fileName: string } {
  const result = generateActaPDF(report, students, { type });
  const dataUrl = result.dataUrl;
  const blob = result.blob;
  const verifyCode = result.verifyCode;
  const fileName = result.fileName;
  const tooBig = dataUrl.length > MAX_DATA_URL_BYTES;
  const prefix = type === "borrador" ? "B" : "F";
  const acta: Acta = {
    id: "ACTA-" + prefix + "-" + report.id + "-" + Date.now().toString(36),
    caseId: report.id,
    caseCode: report.id,
    type: type,
    createdAt: Date.now(),
    generatedBy: generatedBy,
    verifyCode: verifyCode,
    fileName: fileName,
    pdfDataUrl: tooBig ? undefined : dataUrl,
    caseSnapshot: report,
  };
  return { acta: acta, blob: blob, dataUrl: dataUrl, fileName: fileName };
}
