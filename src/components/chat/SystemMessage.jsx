/**
 * SystemMessage — Closure events in chat.
 * Renders: who closed it, resolution note, and attached file/image.
 */
import { useState } from "react";
import { Download, ZoomIn } from "lucide-react";

function isImageUrl(url) {
  return url && /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(url);
}

function Lightbox({ src, fileName, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/90 z-[300] flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative flex flex-col items-center gap-3 max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between w-full px-1">
          <span className="text-white text-sm font-bold truncate max-w-[80%]">{fileName || "Image"}</span>
          <div className="flex items-center gap-2">
            <a href={src} download={fileName} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white" title="Download">
              <Download size={16} />
            </a>
            <button onClick={onClose} className="p-2 bg-white/10 hover:bg-red-500 rounded-full text-white">✕</button>
          </div>
        </div>
        <img src={src} alt={fileName} className="max-h-[80vh] max-w-full rounded-xl object-contain shadow-2xl" />
      </div>
    </div>
  );
}

export default function SystemMessage({ log }) {
  const [lightbox, setLightbox] = useState(false);

  const hasFile = !!log.fileUrl;
  const isImage = isImageUrl(log.fileUrl);

  // Backend stores: "🔒 Ticket closed by Name (Role)\n\nResolution note: text"
  const parts        = (log.text || "").split("\n\nResolution note: ");
  const headerText   = parts[0];
  const resolutionNote = parts[1] || null;

  return (
    <div className="flex items-center justify-center my-3">
      {lightbox && <Lightbox src={log.fileUrl} fileName={log.fileName} onClose={() => setLightbox(false)} />}

      <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-center max-w-[95%] w-full space-y-2">

        {/* Closure header */}
        <p className="text-[11px] font-black text-red-600">{headerText}</p>

        {/* Resolution note */}
        {resolutionNote && (
          <div className="bg-white border border-red-100 rounded-xl px-3 py-2 text-left">
            <p className="text-[9px] text-red-400 font-bold uppercase tracking-wider mb-1">Resolution Note</p>
            <p className="text-[11px] text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">{resolutionNote}</p>
          </div>
        )}

        {/* Attached file */}
        {hasFile && (
          <div className="bg-white border border-red-100 rounded-xl px-3 py-2">
            <p className="text-[9px] text-red-400 font-bold uppercase tracking-wider mb-1">Attached File</p>
            {isImage ? (
              <div className="relative group cursor-pointer inline-block" onClick={() => setLightbox(true)}>
                <img
                  src={log.fileUrl}
                  alt={log.fileName || "attachment"}
                  className="max-h-36 rounded-lg shadow border-2 border-white object-contain group-hover:brightness-90 transition-all"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-black/50 rounded-full p-1.5"><ZoomIn size={16} className="text-white" /></div>
                </div>
                <p className="text-[9px] text-slate-400 mt-1">Click to view full size</p>
              </div>
            ) : (
              <a
                href={log.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-red-600 hover:text-red-800 font-bold text-[11px] underline justify-center"
              >
                <Download size={13} /> {log.fileName || "Download attachment"}
              </a>
            )}
          </div>
        )}

        <p className="text-[9px] text-slate-400">{log.date} · {log.time}</p>
      </div>
    </div>
  );
}
