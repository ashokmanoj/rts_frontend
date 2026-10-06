/**
 * components/chat/ChatPanel.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Right panel inside DetailsModal — shows the message thread and input bar.
 *
 * Props:
 *   reqId         — request ID (used to key the send call)
 *   logs          — array of message objects for this request
 *   currentUser   — { name, role }
 *   onSendMessage — (reqId, message) => void
 *   isClosed      — boolean — true if ticket is closed
 *   canChat       — boolean — false for Admin (read-only)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useRef, useEffect, useState } from "react";
import { MessageSquare, Lock, Paperclip, ChevronDown, Download } from "lucide-react";
import ApprovalCard      from "./ApprovalCard";
import MessageBubble     from "./MessageBubble";
import SystemMessage     from "./SystemMessage";
import ChatInputBar      from "./ChatInputBar";
import { getNowTime, getNowDate } from "../../utils/dateTime";
import { post } from "../../services/api";
import { resolveFileUrl } from "../../utils/security";

/** Group consecutive image messages from the same author+time into one entry */
function groupLogs(logs) {
  const out = [];
  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    const isImg = (log.type === "file" || log.type === "mixed") && log.isImage;
    if (!isImg) { out.push(log); continue; }

    const group = [log];
    while (i + 1 < logs.length) {
      const nx = logs[i + 1];
      const nxImg = (nx.type === "file" || nx.type === "mixed") && nx.isImage;
      if (nxImg && nx.author === log.author && nx.date === log.date && nx.time === log.time) {
        group.push(nx);
        i++;
      } else break;
    }
    out.push(group.length > 1 ? { ...log, images: group } : log);
  }
  return out;
}

export default function ChatPanel({ reqId, logs, currentUser, onSendMessage, isClosed, canChat, onRefreshChat, canAttachPostClose, onAttachPostClose }) {
  const chatEndRef         = useRef(null);
  const chatContainerRef   = useRef(null);
  const isFirstLoad        = useRef(true);
  const postCloseFileRef   = useRef(null);
  const [replyTo,              setReplyTo]            = useState(null);
  const [postCloseUploading,   setPostCloseUploading] = useState(false);
  const [showScrollBtn,        setShowScrollBtn]      = useState(false);
  const [bulkDownloading,      setBulkDownloading]    = useState(false);

  const handleScroll = () => {
    const c = chatContainerRef.current;
    if (!c) return;
    setShowScrollBtn(c.scrollHeight - c.scrollTop - c.clientHeight > 120);
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const visibleLogs = logs.filter(l => !(l.type === "system" && l.text?.includes("Request edited by")));

  // Mark chat as read when panel opens and refresh ticks every 8 s
  useEffect(() => {
    if (!reqId) return;
    isFirstLoad.current = true;
    post(`/requests/${reqId}/chat/read`, {}).catch(() => {});
    const interval = setInterval(() => {
      onRefreshChat?.(reqId);
    }, 8000);
    return () => clearInterval(interval);
  }, [reqId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Smart scroll: instant jump on first open; only auto-scroll on new messages when near bottom
  useEffect(() => {
    if (!visibleLogs.length) return;
    const container = chatContainerRef.current;
    if (!container) return;

    if (isFirstLoad.current) {
      container.scrollTop = container.scrollHeight;
      isFirstLoad.current = false;
      return;
    }

    // Only pull down if user is within 120px of the bottom (they haven't scrolled away)
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distanceFromBottom < 120) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [visibleLogs]);

  const handleReply = (log) => {
    setReplyTo({
      id:       log.id,
      author:   log.author,
      role:     log.role     || null,
      dept:     log.dept     || null,
      text:     log.text    || null,
      fileName: log.fileName || null,
      isImage:  log.isImage  || false,
      fileUrl:  log.fileUrl  || null,
      isVoice:  log.type === "voice",
    });
  };

  const scrollToMessage = (msgId) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    // Flash highlight after scroll reaches the element (~300 ms head-start)
    setTimeout(() => {
      el.style.transition = "background-color 0.15s ease-in";
      el.style.backgroundColor = "#e0e7ff"; // indigo-100
      el.style.borderRadius = "10px";
      // Hold for 1.5 s then fade out over 0.5 s
      setTimeout(() => {
        el.style.transition = "background-color 0.5s ease-out";
        el.style.backgroundColor = "transparent";
        setTimeout(() => { el.style.cssText = ""; }, 500);
      }, 1500);
    }, 300);
  };

  const handleSend = ({ text, files, voiceBlob, voiceDuration }) => {
    const time = getNowTime();
    const date = getNowDate();

    const trimmedText = text.trim();
    const hasFiles    = files && files.length > 0;

    if (!hasFiles && !voiceBlob && !trimmedText) return;

    if (hasFiles) {
      // Send each file as its own message; attach caption + replyTo to the first one only
      files.forEach((file, i) => {
        const isVoice = false;
        const type    = voiceBlob && i === files.length - 1 ? "mixed" : "file";
        onSendMessage(reqId, {
          id:       Date.now() + i,
          author:   currentUser.name,
          role:     currentUser.role,
          time,
          date,
          type,
          text:     i === 0 ? trimmedText : "",
          replyTo:  i === 0 ? (replyTo || null) : null,
          fileBlob: file,
          fileUrl:  URL.createObjectURL(file),
          fileName: file.name,
          isImage:  file.type.startsWith("image/"),
          voiceBlob: null,
          voiceUrl:  null,
          duration:  null,
        });
      });

      // If there's also a voice clip, send it as a final separate message
      if (voiceBlob) {
        onSendMessage(reqId, {
          id:        Date.now() + files.length,
          author:    currentUser.name,
          role:      currentUser.role,
          time,
          date,
          type:      "voice",
          text:      "",
          replyTo:   null,
          fileBlob:  null,
          fileUrl:   null,
          fileName:  null,
          isImage:   null,
          voiceBlob,
          voiceUrl:  URL.createObjectURL(voiceBlob),
          duration:  voiceDuration,
        });
      }

      // If only text with no files (shouldn't happen here but guard)
    } else {
      const type = voiceBlob ? "voice" : "message";
      onSendMessage(reqId, {
        id:        Date.now(),
        author:    currentUser.name,
        role:      currentUser.role,
        time,
        date,
        type,
        text:      trimmedText,
        replyTo:   replyTo || null,
        fileBlob:  null,
        fileUrl:   null,
        fileName:  null,
        isImage:   null,
        voiceBlob: voiceBlob || null,
        voiceUrl:  voiceBlob ? URL.createObjectURL(voiceBlob) : null,
        duration:  voiceDuration || null,
      });
    }

    setReplyTo(null);
  };

  const chatFiles = visibleLogs.filter(l =>
    l.fileUrl && l.type !== "voice" && l.type !== "approval" && l.type !== "system" && l.type !== "message"
  );

  const handleDownloadAllFiles = async () => {
    if (!chatFiles.length || bulkDownloading) return;
    setBulkDownloading(true);
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      await Promise.all(
        chatFiles.map(async (log, idx) => {
          const resolved = resolveFileUrl(log.fileUrl);
          if (!resolved) return;
          const fileName = log.fileName || `file-${idx + 1}`;
          const res  = await fetch(resolved);
          const blob = await res.blob();
          zip.file(fileName, blob);
        })
      );
      const content = await zip.generateAsync({ type: "blob" });
      const link    = document.createElement("a");
      link.href     = URL.createObjectURL(content);
      link.download = `chat-files-${reqId}.zip`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error("Chat bulk download failed:", err);
    } finally {
      setBulkDownloading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden md:p-5 md:gap-3">

      {/* Header — desktop only (mobile uses the "← Back" bar from DetailsModal) */}
      <div className="hidden md:flex items-center gap-1 flex-shrink-0">
        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1">
          <MessageSquare size={11} /> Activity &amp; Chat
          {visibleLogs.length > 0 && (
            <span className="bg-indigo-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black ml-1">
              {visibleLogs.length}
            </span>
          )}
        </p>
        <div className="ml-auto flex items-center gap-1.5">
          {chatFiles.length > 0 && (
            <button
              onClick={handleDownloadAllFiles}
              disabled={bulkDownloading}
              className="flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-2 py-1 rounded-lg font-black text-[10px] transition-all active:scale-95 disabled:opacity-60"
            >
              {bulkDownloading
                ? <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
                : <Download size={11}/>}
              {bulkDownloading ? "Zipping…" : `Download All (${chatFiles.length})`}
            </button>
          )}
          {isClosed && (
            <span className="flex items-center gap-1 bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-[9px] font-black">
              <Lock size={9} /> Chat Closed
            </span>
          )}
        </div>
      </div>

      {/* Mobile chat header bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-white flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare size={14} className="text-indigo-500" />
          <span className="text-[13px] font-black text-slate-700">Activity &amp; Chat</span>
          {visibleLogs.length > 0 && (
            <span className="bg-indigo-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black">
              {visibleLogs.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {chatFiles.length > 0 && (
            <button
              onClick={handleDownloadAllFiles}
              disabled={bulkDownloading}
              className="flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-2 py-1 rounded-lg font-black text-[10px] transition-all active:scale-95 disabled:opacity-60"
            >
              {bulkDownloading
                ? <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
                : <Download size={11}/>}
              {bulkDownloading ? "Zipping…" : `Download All (${chatFiles.length})`}
            </button>
          )}
          {isClosed && (
            <span className="flex items-center gap-1 bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-[9px] font-black">
              <Lock size={9} /> Closed
            </span>
          )}
        </div>
      </div>

      {/* Message list */}
      <div className="relative flex-1 overflow-hidden">
        <div ref={chatContainerRef} onScroll={handleScroll} className="h-full overflow-y-auto overflow-x-hidden space-y-3 bg-slate-50 md:rounded-2xl p-3 md:border md:border-slate-100">
          {visibleLogs.length === 0 && (
            <p className="text-center text-slate-400 text-sm mt-10">No activity yet.</p>
          )}
          {groupLogs(visibleLogs).map((log) =>
            log.type === "approval" ? <ApprovalCard  key={log.id} log={log} /> :
            log.type === "system"   ? <SystemMessage key={log.id} log={log} /> :
                                      <MessageBubble key={log.id} log={log} onReply={canChat ? handleReply : null} onScrollToMessage={scrollToMessage} currentUser={currentUser} />
          )}
          <div ref={chatEndRef} />
        </div>

        {showScrollBtn && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-3 right-3 z-10 w-8 h-8 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white rounded-full shadow-lg flex items-center justify-center transition-all"
          >
            <ChevronDown size={16} />
          </button>
        )}
      </div>

      {/* Input bar / closed notice */}
      <div className="flex-shrink-0 px-3 pb-3 md:px-0 md:pb-0">
        {canChat ? (
          <ChatInputBar onSend={handleSend} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />
        ) : isClosed ? (
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 bg-red-50 border-2 border-red-200 rounded-2xl px-4 py-3 text-red-500">
              <Lock size={14} />
              <span className="font-black text-[12px]">This ticket has been closed. Chat is disabled.</span>
            </div>
            {canAttachPostClose && (
              <>
                <input
                  ref={postCloseFileRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    if (!files.length) return;
                    setPostCloseUploading(true);
                    try {
                      await onAttachPostClose?.(files);
                    } catch (err) {
                      alert(err?.response?.data?.error || "Upload failed.");
                    } finally {
                      setPostCloseUploading(false);
                      if (postCloseFileRef.current) postCloseFileRef.current.value = "";
                    }
                  }}
                />
                <button
                  disabled={postCloseUploading}
                  onClick={() => postCloseFileRef.current?.click()}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl text-[11px] font-black transition-all active:scale-95"
                >
                  <Paperclip size={12} /> {postCloseUploading ? "Uploading…" : "Attach Files"}
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 text-slate-400">
            <Lock size={14} />
            <span className="font-black text-[12px]">Read-only access</span>
          </div>
        )}
      </div>
    </div>
  );
}
