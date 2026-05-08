import { useEffect, useState } from "react";
import { X, Share2, ExternalLink, Download } from "lucide-react";
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

/**
 * Visor de actas a pantalla completa.
 * Reemplaza al flujo de descarga directa (que iOS Safari bloquea).
 * Ofrece tres acciones: Compartir/Guardar (Web Share API), Abrir en pestaña, Descargar (escritorio).
 */
export function ActaViewer({ open, onClose, blob, dataUrl, fileName, title }: ActaViewerProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [iframeError, setIframeError] = useState(false);

  // Crear un object URL desde el blob para evitar problemas de tamaño con el dataUrl en el iframe.
  useEffect(() => {
    if (!open || !blob) return;
    const url = URL.createObjectURL(blob);
    setObjectUrl(url);
    setIframeError(false);
    return () => {
      URL.revokeObjectURL(url);
      setObjectUrl(null);
    };
  }, [open, blob]);

  // Bloquear scroll del fondo cuando está abierto.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  const viewerSrc = objectUrl || dataUrl;

  async function handleShare() {
    if (!blob) {
      // Sin blob no podemos compartir como archivo, fallback a abrir en pestaña nueva.
      openPDFInNewTab(null, dataUrl);
      return;
    }
    const ok = await sharePDF(blob, fileName, title || "Acta EduSafe");
    if (!ok) {
      // Web Share no soportado: abrir en pestaña nueva como fallback.
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

      {/* Cuerpo: visor PDF */}
      <div className="flex-1 overflow-hidden bg-gray-700 relative">
        {!iframeError ? (
          <iframe
            src={viewerSrc}
            title={fileName}
            className="w-full h-full bg-white"
            onError={() => setIframeError(true)}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-white p-6 text-center">
            <p className="text-sm opacity-80">
              Tu dispositivo no puede mostrar el PDF embebido.
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

      {/* Footer con acciones explícitas */}
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
