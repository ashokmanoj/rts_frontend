import { useState } from "react";
import {
  Paperclip, FileText, FileSpreadsheet, FileImage,
  Film, Music, Archive, File, ZoomIn, Eye, Reply, Download, Images,
  Check, CheckCheck,
} from "lucide-react";
import { renderRichText } from "../../utils/richText";
import { sanitizeHtml, stripHtml, isHtmlContent } from "../../utils/sanitize";
import VoiceMessageBubble      from "./VoiceMessageBubble";
import SpreadsheetPreviewModal from "../modals/SpreadsheetPreviewModal";
import PDFPreviewModal         from "../modals/PDFPreviewModal";
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

// ── ImageGrid (WhatsApp-style) ────────────────────────────────────
function ImageGrid({ images, onOpenLightbox }) {
  const MAX_VISIBLE = 4;
  const visible  = images.slice(0, MAX_VISIBLE);
  const overflow = images.length - MAX_VISIBLE;
  const cols     = visible.length === 1 ? 1 : 2;

  const handleDownloadAll = (e) => {
    e.stopPropagation();
    images.forEach((img) => {
      const a = document.createElement("a");
      a.href     = resolveFileUrl(img.fileUrl);
      a.download = img.fileName || "image";
      a.target   = "_blank";
      a.rel      = "noopener noreferrer";
      a.click();
    });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={`grid gap-1 rounded-xl overflow-hidden`}
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, width: cols === 1 ? 220 : 220 }}
      >
        {visible.map((img, idx) => {
          const isLast    = idx === MAX_VISIBLE - 1;
          const showMore  = isLast && overflow > 0;
          return (
            <div
              key={img.id}
              className="relative cursor-pointer group"
              onClick={() => onOpenLightbox(idx)}
              style={{ aspectRatio: "1 / 1" }}
            >
              <img
                src={resolveFileUrl(img.fileUrl)}
                alt={img.fileName}
                className="w-full h-full object-cover group-hover:brightness-90 transition-all"
              />
              {showMore && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white font-black text-[18px]">+{overflow}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Download all bar */}
      <button
        onClick={handleDownloadAll}
        className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 hover:text-indigo-600 transition-colors self-start px-1"
      >
        <Download size={11} />
        Download all ({images.length})
      </button>
    </div>
  );
}

// ── TickMark — WhatsApp-style delivery/read indicator ─────────────
function TickMark({ status }) {
  if (!status) return null;
  if (status === "read")
    return (
      <span title="Seen">
        <CheckCheck size={12} className="text-blue-500 flex-shrink-0" strokeWidth={2.5} />
      </span>
    );
  if (status === "delivered")
    return (
      <span title="Delivered">
        <CheckCheck size={12} className="text-slate-400 flex-shrink-0" strokeWidth={2} />
      </span>
    );
  return (
    <span title="Sent">
      <Check size={12} className="text-slate-400 flex-shrink-0" strokeWidth={2} />
    </span>
  );
}

// ── MessageBubble ─────────────────────────────────────────────────
const isSpreadsheetFile = (name = "") => /\.(csv|xlsx|xls)$/i.test(name);

export default function MessageBubble({ log, onReply, onScrollToMessage, currentUser }) {
  const [lightboxIdx,     setLightboxIdx]     = useState(-1);
  const [spreadsheetOpen, setSpreadsheetOpen] = useState(false);
  const [pdfOpen,         setPdfOpen]         = useState(false);
  const [hovered,         setHovered]         = useState(false);

  const isOwn   = !!currentUser && currentUser.empId === log.authorId;
  const isGroup  = Array.isArray(log.images) && log.images.length > 1;
  const hasFile  = log.type === "file"  || log.type === "mixed";
  const hasVoice = log.type === "voice" || log.type === "mixed";

  // Parse legacy <!--RQ:reqId~|~author~|~preview-->replyText format
  const RQ_RE = /^<!--RQ:(\d+)~\|~([^~]*?)~\|~([\s\S]*?)-->([\s\S]*)$/;
  const rqMatch = log.text ? RQ_RE.exec(log.text) : null;
  const rqRef   = rqMatch ? { reqId: rqMatch[1], author: rqMatch[2], preview: rqMatch[3].trim() } : null;
  const displayText = rqMatch ? rqMatch[4] : log.text;

  const hasText  = !!(rqRef || displayText);

  const { Icon, color, bg } = hasFile ? getFileIcon(log.fileName || "") : {};
  const isSpreadsheet = hasFile && !log.isImage && isSpreadsheetFile(log.fileName);
  const isPdf         = hasFile && !log.isImage && /\.pdf$/i.test(log.fileName || "");

  // Lightbox sources: group = all images; single = just this one
  const lightboxUrls  = isGroup ? log.images.map(i => resolveFileUrl(i.fileUrl))   : [resolveFileUrl(log.fileUrl)];
  const lightboxNames = isGroup ? log.images.map(i => i.fileName || "image")       : [log.fileName || "image"];

  // Build a short label for the replied-to message
  const replyPreviewText = log.replyTo?.text
    ? (() => { const raw = log.replyTo.text.replace(/^<!--RQ:[^>]*-->/, ""); const t = stripHtml(raw).replace(/\n+/g, " "); return t.slice(0, 60) + (t.length > 60 ? "…" : ""); })()
    : log.replyTo?.fileName
    ? `📎 ${log.replyTo.fileName}`
    : log.replyTo?.isVoice
    ? "🎤 Voice message"
    : "";

  return (
    <>
      {lightboxIdx >= 0 && (
        <GalleryLightbox urls={lightboxUrls} fileNames={lightboxNames} startIndex={lightboxIdx} onClose={() => setLightboxIdx(-1)} />
      )}
      {spreadsheetOpen && (
        <SpreadsheetPreviewModal url={log.fileUrl} fileName={log.fileName} onClose={() => setSpreadsheetOpen(false)} />
      )}
      {pdfOpen && (
        <PDFPreviewModal url={log.fileUrl} fileName={log.fileName} onClose={() => setPdfOpen(false)} />
      )}

      <div
        id={`msg-${log.id}`}
        className="flex gap-2 items-start group"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5 ${getAvatarClass(log.role)}`}>
          {getInitials(log.author)}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header: name + timestamp */}
          {(() => {
            const displayName = (log.role === "Requestor" || !log.role)
              ? log.author
              : (log.dept ? `${log.dept} - ${log.role}` : log.role);
            return (
              <div className="flex items-center gap-1.5 mb-1">
                <span className="font-bold text-slate-800 text-[12px]">{displayName}</span>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                  log.role === "RM"      ? "bg-blue-100 text-blue-600" :
                  log.role === "HOD"     ? "bg-purple-100 text-purple-600" :
                  log.role === "DeptHOD" ? "bg-teal-100 text-teal-600" :
                  log.role === "Admin"   ? "bg-orange-100 text-orange-600" :
                  "bg-slate-100 text-slate-500"
                }`}>
                  {log.role}
                </span>
                <span className="text-[9px] text-slate-400 ml-auto flex items-center gap-1">
                  {log.date} · {log.time}
                  {isOwn && <TickMark status={log.tickStatus} />}
                </span>
              </div>
            );
          })()}

          {/* Replied-to quote — click to jump to original message */}
          {log.replyTo && (
            <div
              className={`flex items-stretch gap-1.5 mb-1.5 max-w-[280px] rounded-lg transition-opacity ${log.replyTo.id ? "cursor-pointer hover:opacity-75 active:opacity-60" : ""}`}
              onClick={() => log.replyTo.id && onScrollToMessage?.(log.replyTo.id)}
            >
              <div className="w-0.5 rounded-full bg-indigo-400 flex-shrink-0" />
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-1 min-w-0">
                <p className="text-[9px] font-black text-indigo-600 truncate">
                  {(!log.replyTo.role || log.replyTo.role === "Requestor")
                    ? log.replyTo.author
                    : (log.replyTo.dept || log.replyTo.role)}
                </p>
                <p className="text-[10px] text-slate-500 truncate leading-tight">{replyPreviewText}</p>
              </div>
            </div>
          )}

          {/* Legacy cross-request reference block <!--RQ:id~|~author~|~preview--> */}
          {rqRef && (
            <div className="flex items-stretch gap-1.5 mb-1.5 max-w-[280px] rounded-lg">
              <div className="w-0.5 rounded-full bg-violet-400 flex-shrink-0" />
              <div className="bg-violet-50 border border-violet-100 rounded-lg px-2 py-1 min-w-0">
                <p className="text-[9px] font-black text-violet-600 truncate">↗ {rqRef.author} · Req #{rqRef.reqId}</p>
                {rqRef.preview && (
                  <p className="text-[10px] text-slate-500 truncate leading-tight">
                    {rqRef.preview.length > 60 ? rqRef.preview.slice(0, 60) + "…" : rqRef.preview}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Bubble content */}
          <div className="flex flex-col gap-1.5 bg-white border border-slate-100 rounded-2xl px-3 py-2.5 shadow-sm w-fit max-w-full">

            {/* ── Image group (WhatsApp-style grid) ── */}
            {isGroup && (
              <ImageGrid images={log.images} onOpenLightbox={(idx) => setLightboxIdx(idx)} />
            )}

            {/* ── Single image thumbnail ── */}
            {!isGroup && hasFile && log.isImage && (
              <div
                className="relative group cursor-pointer"
                onClick={() => setLightboxIdx(0)}
              >
                <img
                  src={resolveFileUrl(log.fileUrl)}
                  alt={log.fileName}
                  className="max-w-[220px] max-h-[170px] rounded-xl object-cover border border-slate-100 group-hover:brightness-90 transition-all"
                />
                <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl bg-black/20">
                  <div className="bg-black/60 rounded-full p-2">
                    <ZoomIn size={16} className="text-white" />
                  </div>
                  <a
                    href={resolveFileUrl(log.fileUrl)}
                    download={log.fileName || "image"}
                    onClick={e => e.stopPropagation()}
                    className="bg-black/60 hover:bg-emerald-600 rounded-full p-2 transition-colors"
                    title="Download"
                  >
                    <Download size={16} className="text-white" />
                  </a>
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

            {/* ── PDF file — preview in popup ── */}
            {hasFile && !log.isImage && isPdf && (
              <button
                onClick={() => setPdfOpen(true)}
                className="flex items-center gap-2 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl px-3 py-2 text-[11px] font-bold transition-all active:scale-95"
              >
                <FileText size={14} className="text-red-500 flex-shrink-0" />
                <span className="truncate text-slate-700 max-w-[160px]">{log.fileName}</span>
                <Eye size={11} className="text-red-400 flex-shrink-0" />
              </button>
            )}

            {/* ── Other files — download ── */}
            {hasFile && !log.isImage && !isSpreadsheet && !isPdf && (
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
            {displayText && (
              isHtmlContent(displayText)
                ? <div
                    className="text-slate-600 text-[11px] leading-relaxed break-words [&_ul]:list-disc [&_ul]:list-inside [&_ul]:my-0.5 [&_mark]:bg-yellow-200 [&_mark]:rounded-sm [&_a]:text-blue-500 [&_a]:underline [&_b]:font-bold [&_strong]:font-bold [&_u]:underline"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(displayText) }}
                  />
                : <p className="text-slate-600 text-[11px] leading-relaxed break-words whitespace-pre-wrap">{renderRichText(displayText)}</p>
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
