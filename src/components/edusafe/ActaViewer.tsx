import { useEffect, useState } from "react";
import { X, Share2, ExternalLink, Download, CheckCircle2, FileText } from "lucide-react";
import { toast } from "sonner";
import { downloadPDF, openPDFInNewTab, sharePDF } from "@/lib/edusafe/actas";

export type ActaViewerProps = {
  open: boolean;
  onClose: () => void;
  blob: Blob | null;
  dataUrl: string;
  fileName: string;
  title?: string;
};

function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iphone|ipad|ipod/i.test(ua)) return true;
  if (/macintosh/i.test(ua) && (navigator.maxTouchPoints ?? 0) > 1) return true;
  return false;
}

/**
 * Visor de actas a pantalla completa.
 * En iOS Safari el iframe de PDF queda en blanco, por eso mostramos una pantalla
 * intermedia con acciones nativas (compartir / abrir en Safari).
 */
export function ActaViewer({ open, onClose, blob, dataUrl, fileName, title }: ActaViewerProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [iframeError, setIframeError] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setIsIOS(isIOSDevice());
  }, []);

  // Crear un object URL desde el blob solo si NO es iOS (en iOS no se usa el iframe).
  useEffect(() => {
    if (!open) {
      setIframeError(false);
    }
    if (!open || !blob || isIOS) return;
    const url = URL.createObjectURL(blob);
    setObjectUrl(url);
    setIframeError(false);
    return () => {
      URL.revokeObjectURL(url);
      setObjectUrl(null);
    };
  }, [open, blob, isIOS]);

  // Bloquear scroll del fondo cuando está abierto.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  const viewerSrc = objectUrl || dataUrl;
  const canPreview = Boolean(viewerSrc);

  async function handleShare() {
    if (!blob) {
      openPDFInNewTab(null, dataUrl);
      return;
    }
    const ok = await sharePDF(blob, fileName, title || "Acta EduSafe");
    if (!ok) {
      openPDFInNewTab(blob, dataUrl);
      toast.message("Tu navegador no permite compartir directamente. Hemos abierto el PDF en una pestaña nueva.");
    }
  }

  function handleOpenNewTab() {
    openPDFInNewTab(blob, dataUrl);
  }

  function handleDownload() {
    downloadPDF(blob, dataUrl, fileName);
    toast.success("Descarga iniciada");
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0B3D91] text-white shadow-lg">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-lg hover:bg-white/10"
          aria-label="Cerrar visor"
        >
          <X size={20} />
        </button>
        <div className="flex-1 text-center px-2 truncate text-sm font-semibold">
          {title || fileName}
        </div>
        <button
          onClick={handleShare}
          className="p-2 -mr-2 rounded-lg hover:bg-white/10"
          aria-label="Compartir o guardar"
        >
          <Share2 size={20} />
        </button>
      </div>

      {/* Cuerpo */}
      <div className={`flex-1 overflow-auto relative ${isIOS ? "bg-gray-100" : "bg-gray-700"}`}>
        {isIOS ? (
          <div className="min-h-full flex items-center justify-center p-6">
            <div className="w-full max-w-[400px] bg-white rounded-3xl shadow-lg p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <CheckCircle2 size={36} className="text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Tu acta está lista</h2>
              {title && (
                <p className="text-sm text-gray-500 mt-1">{title}</p>
              )}

              <div className="mt-6 w-full flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 text-left">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <FileText size={20} className="text-[#0B3D91]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800 truncate">{fileName}</p>
                  <p className="text-xs text-gray-500">Documento PDF</p>
                </div>
              </div>

              <button
                onClick={handleShare}
                className="mt-6 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#0B3D91] text-white text-sm font-semibold hover:bg-blue-900"
              >
                <Share2 size={16} /> Compartir o guardar
              </button>
              <button
                onClick={handleOpenNewTab}
                className="mt-2 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                <ExternalLink size={16} /> Abrir en Safari
              </button>

              <p className="mt-5 text-xs text-gray-500 leading-relaxed">
                Tu dispositivo no muestra PDFs embebidos. Pulsa "Compartir o guardar" para enviar el acta por WhatsApp, AirDrop, email o guardar en Archivos.
              </p>
            </div>
          </div>
        ) : canPreview && !iframeError ? (
          <iframe
            src={viewerSrc}
            title={fileName}
            className="w-full h-full bg-white"
            onError={() => setIframeError(true)}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-white p-6 text-center">
            <p className="text-sm opacity-80">
              {!canPreview
                ? "No se pudo preparar el PDF para previsualizarlo."
                : "Tu dispositivo no puede mostrar el PDF embebido."}
              Pulsa abajo para abrirlo en una pestaña nueva o guardarlo.
            </p>
            <button
              onClick={handleOpenNewTab}
              className="px-5 py-2.5 rounded-lg bg-white text-[#0B3D91] font-semibold flex items-center gap-2"
            >
              <ExternalLink size={16} /> Abrir PDF en pestaña nueva
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 px-3 py-2 flex flex-wrap gap-2 justify-center sm:justify-end safe-bottom">
        <button
          onClick={handleOpenNewTab}
          className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          <ExternalLink size={15} /> Abrir en pestaña
        </button>
        <button
          onClick={handleShare}
          className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#0B3D91] text-white text-sm font-semibold hover:bg-blue-900"
        >
          <Share2 size={15} /> Compartir / Guardar
        </button>
        <button
          onClick={handleDownload}
          className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          title="Solo funciona en escritorio"
        >
          <Download size={15} /> Descargar
        </button>
      </div>
    </div>
  );
}
