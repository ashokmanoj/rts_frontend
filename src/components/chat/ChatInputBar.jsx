import { useRef, useState, useEffect, useCallback } from "react";
import {
  Send, Paperclip, Mic, Square, X,
  Play, Pause, FileText, FileSpreadsheet, FileImage,
  Film, Music, Archive, File, Upload,
} from "lucide-react";
import { formatDuration } from "../../utils/dateTime";

// ─── helpers ────────────────────────────────────────────────

function getFileInfo(file) {
  const t = file.type;
  const n = (file.name || "").toLowerCase();
  if (t.startsWith("image/"))
    return { kind: "image",   label: "Image",       color: "bg-purple-100", iconColor: "text-purple-500",  Icon: FileImage       };
  if (t.startsWith("video/"))
    return { kind: "video",   label: "Video",       color: "bg-pink-100",   iconColor: "text-pink-500",    Icon: Film            };
  if (t.startsWith("audio/"))
    return { kind: "audio",   label: "Audio",       color: "bg-yellow-100", iconColor: "text-yellow-600",  Icon: Music           };
  if (t === "application/pdf")
    return { kind: "pdf",     label: "PDF",         color: "bg-red-100",    iconColor: "text-red-500",     Icon: FileText        };
  if (t.includes("word") || /\.(doc|docx)$/.test(n))
    return { kind: "word",    label: "Word",        color: "bg-blue-100",   iconColor: "text-blue-600",    Icon: FileText        };
  if (t === "text/csv" || n.endsWith(".csv"))
    return { kind: "csv",     label: "CSV",         color: "bg-teal-100",   iconColor: "text-teal-600",    Icon: FileSpreadsheet };
  if (t.includes("excel") || t.includes("spreadsheet") || /\.(xls|xlsx)$/.test(n))
    return { kind: "excel",   label: "Spreadsheet", color: "bg-green-100",  iconColor: "text-green-600",   Icon: FileSpreadsheet };
  if (/\.(zip|rar|7z|tar|gz)$/.test(n))
    return { kind: "archive", label: "Archive",     color: "bg-orange-100", iconColor: "text-orange-500",  Icon: Archive         };
  return   { kind: "other",   label: "File",        color: "bg-slate-100",  iconColor: "text-slate-500",   Icon: File            };
}

function formatSize(bytes) {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── component ──────────────────────────────────────────────

export default function ChatInputBar({ onSend, replyTo, onCancelReply }) {
  // multiple staged files
  const [pendingFiles,   setPendingFiles]   = useState([]);   // File[]
  const [imagePreviews,  setImagePreviews]  = useState([]);   // (string|null)[]

  const [pendingVoice,   setPendingVoice]   = useState(null); // { blob, url, duration }
  const [voicePlaying,   setVoicePlaying]   = useState(false);
  const [message,        setMessage]        = useState("");
  const [isRecording,    setIsRecording]    = useState(false);
  const [recordingTime,  setRecordingTime]  = useState(0);
  const [isDragging,     setIsDragging]     = useState(false);

  const fileInputRef         = useRef(null);
  const mediaRecorderRef     = useRef(null);
  const recordingIntervalRef = useRef(null);
  const chunksRef            = useRef([]);
  const voiceAudioRef        = useRef(null);
  const dragCounterRef       = useRef(0);

  const hasFiles  = pendingFiles.length > 0;
  const canSend   = hasFiles || !!pendingVoice || message.trim().length > 0;

  // ── add files (multi) ──────────────────────────────────────
  const addFiles = useCallback((newFiles) => {
    if (!newFiles.length) return;
    setPendingFiles(prev => [...prev, ...newFiles]);
    setImagePreviews(prev => [
      ...prev,
      ...newFiles.map(f => f.type.startsWith("image/") ? URL.createObjectURL(f) : null),
    ]);
  }, []);

  const removeFile = (idx) => {
    const preview = imagePreviews[idx];
    if (preview) URL.revokeObjectURL(preview);
    setPendingFiles(prev  => prev.filter((_, i) => i !== idx));
    setImagePreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const removeAllFiles = () => {
    imagePreviews.forEach(p => p && URL.revokeObjectURL(p));
    setPendingFiles([]);
    setImagePreviews([]);
  };

  const handleFileChange = (e) => {
    addFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  // ── drag & drop ────────────────────────────────────────────
  const onDragEnter = (e) => {
    e.preventDefault();
    dragCounterRef.current++;
    if (dragCounterRef.current === 1) setIsDragging(true);
  };
  const onDragLeave = (e) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDragging(false);
  };
  const onDragOver = (e) => e.preventDefault();
  const onDrop = (e) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  // ── paste ──────────────────────────────────────────────────
  useEffect(() => {
    const onPaste = (e) => {
      // If clipboard has file/image items (screenshots, Excel cell copies, etc.),
      // prefer those over text — prevent default text paste and attach as file.
      const files = Array.from(e.clipboardData?.items || [])
        .filter(item => item.kind === "file")
        .map(item => item.getAsFile())
        .filter(Boolean);
      if (files.length) {
        e.preventDefault();
        addFiles(files);
        return;
      }
      // No file items — let the browser paste text into the input normally.
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addFiles]);

  // ── voice ──────────────────────────────────────────────────
  const startRecording = async () => {
    if (pendingVoice) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url  = URL.createObjectURL(blob);
        setPendingVoice({ blob, url, duration: formatDuration(recordingTime) });
        stream.getTracks().forEach(t => t.stop());
        setRecordingTime(0);
      };
      mr.start();
      setIsRecording(true);
      recordingIntervalRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch {
      alert("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    clearInterval(recordingIntervalRef.current);
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const removeVoice = () => {
    voiceAudioRef.current?.pause();
    setPendingVoice(null);
    setVoicePlaying(false);
  };

  const togglePlay = () => {
    if (!voiceAudioRef.current) return;
    if (voicePlaying) { voiceAudioRef.current.pause(); setVoicePlaying(false); }
    else              { voiceAudioRef.current.play();  setVoicePlaying(true);  }
  };

  // ── send ───────────────────────────────────────────────────
  const handleSend = () => {
    if (!canSend) return;
    onSend({
      text:          message.trim(),
      files:         pendingFiles.length > 0 ? [...pendingFiles] : null,
      voiceBlob:     pendingVoice?.blob     || null,
      voiceDuration: pendingVoice?.duration || null,
    });
    setMessage("");
    removeAllFiles();
    setPendingVoice(null);
    setVoicePlaying(false);
  };

  return (
    <div
      className="flex flex-col gap-2 relative"
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-indigo-400 bg-indigo-50/95 pointer-events-none gap-1">
          <Upload size={22} className="text-indigo-500 animate-bounce" />
          <p className="text-indigo-600 font-black text-[12px]">Drop files to attach</p>
        </div>
      )}

      {/* ── Reply preview ── */}
      {replyTo && (
        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2">
          <div className="w-0.5 self-stretch rounded-full bg-indigo-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black text-indigo-600 truncate">{replyTo.author}</p>
            <p className="text-[10px] text-slate-500 truncate leading-snug">
              {replyTo.text
                ? replyTo.text.slice(0, 70) + (replyTo.text.length > 70 ? "…" : "")
                : replyTo.fileName ? `📎 ${replyTo.fileName}`
                : replyTo.isVoice  ? "🎤 Voice message"
                : ""}
            </p>
          </div>
          <button onClick={onCancelReply} className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-colors">
            <X size={11} />
          </button>
        </div>
      )}

      {/* ── Staged files grid ── */}
      {hasFiles && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
          <div className="flex flex-wrap gap-2">
            {pendingFiles.map((f, idx) => {
              const info    = getFileInfo(f);
              const preview = imagePreviews[idx];
              const Icon    = info.Icon;
              return (
                <div key={idx} className="relative flex-shrink-0 flex flex-col items-center">
                  <div className={`w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center border-2 border-white shadow-sm ${info.color}`}>
                    {info.kind === "image" && preview
                      ? <img src={preview} alt={f.name} className="w-full h-full object-cover" />
                      : <Icon size={22} className={info.iconColor} />
                    }
                  </div>
                  <button
                    onClick={() => removeFile(idx)}
                    className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow transition-colors z-10"
                    style={{ width: 18, height: 18 }}
                  >
                    <X size={9} />
                  </button>
                  <p className="text-[8px] text-slate-500 font-medium mt-1 truncate w-16 text-center" title={f.name}>{f.name}</p>
                  <p className="text-[7px] text-slate-400">{formatSize(f.size)}</p>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-[11px] text-indigo-600 font-black hover:underline"
            >
              + Add more
            </button>
            <span className="text-slate-200 text-xs">|</span>
            <span className="text-[10px] text-slate-400 font-medium">
              {pendingFiles.length} file{pendingFiles.length !== 1 ? "s" : ""} staged
            </span>
            <span className="text-slate-200 text-xs">|</span>
            <button
              onClick={removeAllFiles}
              className="text-[11px] text-red-500 font-black hover:underline ml-auto"
            >
              Remove all
            </button>
          </div>
        </div>
      )}

      {/* ── Staged voice card ── */}
      {(pendingVoice || isRecording) && (
        <div className="flex flex-wrap gap-2">
          {pendingVoice && !isRecording && (
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-2xl px-3 py-2 shadow-sm">
              <button onClick={togglePlay} className="w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center flex-shrink-0 hover:bg-indigo-700 transition-colors">
                {voicePlaying ? <Pause size={11} /> : <Play size={11} />}
              </button>
              <div className="flex items-end gap-[2px] h-5">
                {[3, 6, 9, 5, 8, 4, 7, 5, 9, 6, 4, 3].map((h, i) => (
                  <div key={i} className={`w-[2px] rounded-full transition-all ${voicePlaying ? "bg-indigo-400 animate-pulse" : "bg-indigo-300"}`} style={{ height: `${h * 2}px` }} />
                ))}
              </div>
              <span className="text-[10px] text-indigo-600 font-mono font-bold">{pendingVoice.duration}</span>
              <button onClick={removeVoice} className="w-5 h-5 rounded-full bg-indigo-100 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-colors ml-1">
                <X size={11} />
              </button>
              <audio ref={voiceAudioRef} src={pendingVoice.url} onEnded={() => setVoicePlaying(false)} />
            </div>
          )}
          {isRecording && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-2xl px-3 py-2 shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
              <span className="text-red-600 font-bold text-[11px]">Recording {formatDuration(recordingTime)}</span>
              <button onClick={stopRecording} className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-2.5 py-1 rounded-xl font-bold text-[10px] transition-colors ml-1">
                <Square size={10} /> Stop
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Main input row ── */}
      <div className={`flex items-center gap-2 border-2 rounded-2xl overflow-hidden transition-all bg-white ${canSend ? "border-indigo-300 focus-within:border-indigo-500" : "border-slate-200 focus-within:border-indigo-400"}`}>
        {/* Paperclip */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className={`flex-shrink-0 p-3 transition-colors ${hasFiles ? "text-indigo-500" : "text-slate-400 hover:text-indigo-600"}`}
          title="Attach files"
        >
          <Paperclip size={18} />
        </button>
        <input type="file" accept="*" multiple ref={fileInputRef} className="hidden" onChange={handleFileChange} />

        {/* Text input */}
        <input
          className="flex-1 py-3 outline-none text-[12px] bg-transparent placeholder:text-slate-400"
          placeholder={
            hasFiles       ? `Caption for ${pendingFiles.length} file${pendingFiles.length !== 1 ? "s" : ""} (optional)…`
            : pendingVoice ? "Add a caption (optional)…"
            : isRecording  ? "Recording in progress…"
            :                "Type your message… (drag, paste or attach files)"
          }
          disabled={isRecording}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !isRecording && handleSend()}
        />

        {/* Mic */}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={!!pendingVoice && !isRecording}
          title={isRecording ? "Stop recording" : "Record voice message"}
          className={`flex-shrink-0 p-3 transition-colors ${
            isRecording  ? "text-red-500 animate-pulse"
            : pendingVoice ? "text-slate-200 cursor-not-allowed"
            :                "text-slate-400 hover:text-red-500"
          }`}
        >
          <Mic size={18} />
        </button>

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          className={`flex-shrink-0 p-3 transition-all ${canSend ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-slate-100 text-slate-300 cursor-not-allowed"}`}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
