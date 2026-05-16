import { useState } from "react";
import {
  Paperclip, FileText, FileSpreadsheet, FileImage,
  Film, Music, Archive, File, ZoomIn, Eye, Reply,
} from "lucide-react";
import VoiceMessageBubble      from "./VoiceMessageBubble";
import SpreadsheetPreviewModal from "../modals/SpreadsheetPreviewModal";
import GalleryLightbox         from "../modals/GalleryLightbox";
import { getAvatarClass, getInitials } from "../../utils/roleStyles";
import { resolveFileUrl } from "../../utils/security";

function getFileIcon(fileName = "") {
  const n = fileName.toLowerCase();
  if (/\.(png|jpg|jpeg|gif|webp|svg|bmp)$/.test(n))
    return { Icon: FileImage,      color: "text-purple-500", bg: "bg-purple-50" };
  if (n.endsWith(".pdf"))
    return { Icon: FileText,       color: "text-red-500",    bg: "bg-red-50"    };
  if (/\.(doc|docx)$/.test(n))
    return { Icon: FileText,       color: "text-blue-600",   bg: "bg-blue-50"   };
  if (/\.(xls|xlsx|csv)$/.test(n))
    return { Icon: FileSpreadsheet,color: "text-green-600",  bg: "bg-green-50"  };
  if (/\.(mp4|mov|avi|mkv|webm)$/.test(n))
    return { Icon: Film,           color: "text-pink-500",   bg: "bg-pink-50"   };
  if (/\.(mp3|wav|m4a|ogg)$/.test(n))
    return { Icon: Music,          color: "text-yellow-500", bg: "bg-yellow-50" };
  if (/\.(zip|rar|7z|tar|gz)$/.test(n))
    return { Icon: Archive,        color: "text-orange-500", bg: "bg-orange-50" };
  return   { Icon: File,           color: "text-slate-500",  bg: "bg-slate-50"  };
}

// ── MessageBubble ─────────────────────────────────────────────────
const isSpreadsheetFile = (name = "") => /\.(csv|xlsx|xls)$/i.test(name);

export default function MessageBubble({ log, onReply }) {
  const [lightbox,        setLightbox]        = useState(false);
  const [spreadsheetOpen, setSpreadsheetOpen] = useState(false);
  const [hovered,         setHovered]         = useState(false);

  const hasFile  = log.type === "file"  || log.type === "mixed";
  const hasVoice = log.type === "voice" || log.type === "mixed";
  const hasText  = !!log.text;

  const { Icon, color, bg } = hasFile ? getFileIcon(log.fileName || "") : {};
  const isSpreadsheet = hasFile && !log.isImage && isSpreadsheetFile(log.fileName);

  // Build a short label for the replied-to message
  const replyPreviewText = log.replyTo?.text
    ? log.replyTo.text.slice(0, 60) + (log.replyTo.text.length > 60 ? "…" : "")
    : log.replyTo?.fileName
    ? `📎 ${log.replyTo.fileName}`
    : log.replyTo?.isVoice
    ? "🎤 Voice message"
    : "";

  return (
    <>
      {lightbox && (
        <GalleryLightbox urls={[log.fileUrl]} fileNames={[log.fileName || "Image"]} startIndex={0} onClose={() => setLightbox(false)} />
      )}
      {spreadsheetOpen && (
        <SpreadsheetPreviewModal url={log.fileUrl} fileName={log.fileName} onClose={() => setSpreadsheetOpen(false)} />
      )}

      <div
        className="flex gap-2 items-start group"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5 ${getAvatarClass(log.role)}`}>
          {getInitials(log.author)}
        </div>

        <div className="flex-1">
          {/* Header: name + timestamp */}
          <div className="flex items-center gap-1.5 mb-1">
            <span className="font-bold text-slate-800 text-[12px]">{log.author}</span>
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
              log.role === "RM"      ? "bg-blue-100 text-blue-600" :
              log.role === "HOD"     ? "bg-purple-100 text-purple-600" :
              log.role === "DeptHOD" ? "bg-teal-100 text-teal-600" :
              log.role === "Admin"   ? "bg-orange-100 text-orange-600" :
              "bg-slate-100 text-slate-500"
            }`}>
              {log.role}
            </span>
            <span className="text-[9px] text-slate-400 ml-auto">{log.date} · {log.time}</span>
          </div>

          {/* Replied-to quote */}
          {log.replyTo && (
            <div className="flex items-stretch gap-1.5 mb-1.5 max-w-[280px]">
              <div className="w-0.5 rounded-full bg-indigo-400 flex-shrink-0" />
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-1 min-w-0">
                <p className="text-[9px] font-black text-indigo-600 truncate">{log.replyTo.author}</p>
                <p className="text-[10px] text-slate-500 truncate leading-tight">{replyPreviewText}</p>
              </div>
            </div>
          )}

          {/* Bubble content */}
          <div className="flex flex-col gap-1.5 bg-white border border-slate-100 rounded-2xl px-3 py-2.5 shadow-sm w-fit max-w-full">

            {/* ── Image file — clickable thumbnail ── */}
            {hasFile && log.isImage && (
              <div
                className="relative group cursor-pointer"
                onClick={() => setLightbox(true)}
              >
                <img
                  src={resolveFileUrl(log.fileUrl)}
                  alt={log.fileName}
                  className="max-w-[220px] max-h-[170px] rounded-xl object-cover border border-slate-100 group-hover:brightness-90 transition-all"
                />
                {/* Hover zoom overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                  <div className="bg-black/50 rounded-full p-2">
                    <ZoomIn size={18} className="text-white" />
                  </div>
                </div>
              </div>
            )}

            {/* ── Spreadsheet file — preview button ── */}
            {hasFile && !log.isImage && isSpreadsheet && (
              <button
                onClick={() => setSpreadsheetOpen(true)}
                className="flex items-center gap-2 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl px-3 py-2 text-[11px] font-bold transition-all active:scale-95"
              >
                <FileSpreadsheet size={14} className="text-teal-600 flex-shrink-0" />
                <span className="truncate text-slate-700 max-w-[160px]">{log.fileName}</span>
                <Eye size={11} className="text-teal-400 flex-shrink-0" />
              </button>
            )}

            {/* ── Non-image, non-spreadsheet file — download link ── */}
            {hasFile && !log.isImage && !isSpreadsheet && (
              <a
                href={resolveFileUrl(log.fileUrl)}
                download={log.fileName}
                className={`flex items-center gap-2 ${bg} rounded-xl px-3 py-2 text-[11px] font-bold hover:brightness-95 transition-all`}
              >
                <Icon size={14} className={color} />
                <span className="truncate text-slate-700 max-w-[180px]">{log.fileName}</span>
                <Paperclip size={11} className="text-slate-400 flex-shrink-0" />
              </a>
            )}

            {/* ── Voice ── */}
            {hasVoice && (
              <VoiceMessageBubble src={resolveFileUrl(log.voiceUrl)} duration={log.duration} />
            )}

            {/* ── Text / caption ── */}
            {hasText && (
              <p className="text-slate-600 text-[11px] leading-relaxed break-words">{log.text}</p>
            )}
          </div>
        </div>

        {/* Reply button — appears inline on hover, after the bubble */}
        {onReply && (
          <button
            onClick={() => onReply(log)}
            title="Reply"
            className={`flex-shrink-0 self-center ml-1 p-1.5 rounded-full border transition-all active:scale-90 ${
              hovered
                ? "opacity-100 bg-white border-slate-200 text-slate-400 hover:text-indigo-500 hover:border-indigo-300 shadow-sm"
                : "opacity-0 pointer-events-none border-transparent"
            }`}
          >
            <Reply size={13}/>
          </button>
        )}
      </div>
    </>
  );
}
