import { useEffect } from "react";
import { X, Download, FileText } from "lucide-react";
import { resolveFileUrl } from "../../utils/security";

export default function PDFPreviewModal({ url, fileName, onClose }) {
  const resolved = resolveFileUrl(url);

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") { e.stopImmediatePropagation(); onClose(); } };
    window.addEventListener("keydown", h, { capture: true });
    return () => window.removeEventListener("keydown", h, { capture: true });
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90dvh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50 flex-shrink-0">
          <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center border border-red-100">
            <FileText size={18} className="text-red-500" />
          </div>
          <p className="flex-1 font-black text-slate-800 text-[13px] truncate min-w-0">{fileName}</p>
          <a
            href={resolved}
            download={fileName}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black px-3 py-2 rounded-xl transition-all active:scale-95 shadow-sm"
          >
            <Download size={13} /> Download
          </a>
          <button
            onClick={onClose}
            className="p-2 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* PDF viewer — uses the browser's built-in PDF renderer */}
        <iframe
          src={resolved}
          title={fileName}
          className="flex-1 w-full border-0"
        />
      </div>
    </div>
  );
}
