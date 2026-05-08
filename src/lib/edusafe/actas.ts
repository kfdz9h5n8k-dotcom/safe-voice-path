import type { Report, Student, Acta } from "./types";
import { generateActaPDF } from "./pdf";

const MAX_DATA_URL_BYTES = 1_000_000; // 1 MB

/**
 * Devuelve { dataUrl, blob, fileName } para un acta, regenerando el PDF
 * desde el snapshot si fue demasiado grande para guardarse en localStorage.
 */
export function resolveActaPDF(acta: Acta, students: Student[]): { dataUrl: string; blob: Blob; fileName: string } {
  if (acta.pdfDataUrl) {
    // Reconstruir blob a partir del dataUrl guardado para que también funcione el Web Share API.
    const blob = dataUrlToBlob(acta.pdfDataUrl);
    return { dataUrl: acta.pdfDataUrl, blob, fileName: acta.fileName || `ACTA_${acta.caseId}.pdf` };
  }
  if (!acta.caseSnapshot) {
    throw new Error("Acta sin snapshot ni dataUrl");
  }
  const { dataUrl, blob, fileName } = generateActaPDF(acta.caseSnapshot, students, {
    type: acta.type,
    verifyCode: acta.verifyCode,
  });
  return { dataUrl, blob, fileName: acta.fileName || fileName };
}

/**
 * Convierte un dataUrl base64 a Blob (para reusar en Web Share API).
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(",");
  const mime = /data:(.*?);base64/.exec(meta)?.[1] || "application/pdf";
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return new Blob([buf], { type: mime });
}

/**
 * Descarga un PDF (solo funciona de forma fiable en escritorio).
 * En iOS Safari es preferible usar el visor `ActaViewer`.
 */
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
    /* fallthrough */
  }
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Comparte un PDF usando la Web Share API (iOS / Android).
 * Devuelve true si se pudo compartir, false si no es soportado.
 */
export async function sharePDF(blob: Blob, fileName: string, title = "Acta EduSafe"): Promise<boolean> {
  try {
    const file = new File([blob], fileName, { type: "application/pdf" });
    const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
    if (nav.canShare && nav.canShare({ files: [file] })) {
      await navigator.share({ title, files: [file] });
      return true;
    }
  } catch {
    /* user cancelled o no soportado */
  }
  return false;
}

/**
 * Abre el PDF en una pestaña nueva del navegador (fallback fiable en iOS).
 */
export function openPDFInNewTab(blob: Blob | null, dataUrl: string) {
  try {
    if (blob) {
      const url = URL.createObjectURL(blob);
      const w = window.open(url, "_blank");
      if (!w) {
        // popup blocked
        window.location.href = url;
      }
      return;
    }
  } catch {
    /* fallthrough */
  }
  window.open(dataUrl, "_blank");
}

export function buildActa(report: Report, students: Student[], type: "borrador" | "final", generatedBy: string): { acta: Acta; blob: Blob; dataUrl: string; fileName: string } {
  const { dataUrl, blob, verifyCode, fileName } = generateActaPDF(report, students, { type });
  const tooBig = dataUrl.length > MAX_DATA_URL_BYTES;
  const acta: Acta = {
    id: `ACTA-${type === "borrador" ? "B" : "F"}-${report.id}-${Date.now().toString(36)}`,
    caseId​​​​​​​​​​​​​​​​
