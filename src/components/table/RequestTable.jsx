/**
 * components/table/RequestTable.jsx — Updated
 * Added: Management Status column in the Assigned Department section
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Forward, EyeOff, Bell, Send, ThumbsUp, ThumbsDown, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import StatusBadge from "./StatusBadge";

export default function RequestTable({ requests, sortMode, currentUser, onOpenDetails, onMarkUnread, onAcknowledge, onEdit, onDelete }) {
  const [contextMenu, setContextMenu] = useState(null);
  // key: `${rowId}-${action}` e.g. "42-Resolved"
  const [pendingAck, setPendingAck] = useState(null);

  const scrollRef   = useRef(null);
  const [canLeft,  setCanLeft]  = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 0);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows);
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", updateArrows); ro.disconnect(); };
  }, [updateArrows]);

  // Re-check arrows whenever requests change (new data may change scroll width)
  useEffect(() => { updateArrows(); }, [requests, updateArrows]);

  const scroll = (dir) => {
    scrollRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  const handleAck = async (e, rowId, action) => {
    e.stopPropagation();
    if (pendingAck || !onAcknowledge) return;
    setPendingAck(`${rowId}-${action}`);
    try { await onAcknowledge(rowId, action); }
    finally { setPendingAck(null); }
  };

  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const handleRightClick = (e, rowId, row) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, rowId, row });
  };

  const handleMarkUnread = (rowId) => {
    onMarkUnread(rowId);
    setContextMenu(null);
  };

  // 1) Reopened + unread → very top  2) Normal unread  3) Reopened + read  4) Normal read
  const sorted = (!sortMode || sortMode === "default")
    ? [
        ...requests.filter(r => r.reopenedAt && !r.isClosed && !r.seen),
        ...requests.filter(r => !r.seen && !(r.reopenedAt && !r.isClosed)),
        ...requests.filter(r => r.reopenedAt && !r.isClosed &&  r.seen),
        ...requests.filter(r =>  r.seen && !(r.reopenedAt && !r.isClosed)),
      ]
    : requests;

  // First 5 columns are frozen (sticky-left). Widths must be fixed so left offsets stay accurate.
  const FROZEN = [
    { left: 0,   width: 62  },  // Ticket #
    { left: 62,  width: 90  },  // Date
    { left: 152, width: 100 },  // User ID
    { left: 252, width: 130 },  // Name
    { left: 382, width: 108 },  // Dept  ← last frozen — right border used as freeze indicator
  ];

  return (
    <>
      {contextMenu && (
        <div
          className="fixed z-[100] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden py-1"
          style={{ top: Math.min(contextMenu.y, window.innerHeight - 120), left: Math.min(contextMenu.x, window.innerWidth - 200) }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleMarkUnread(contextMenu.rowId)}
            className="flex items-center gap-2 px-4 py-2.5 hover:bg-blue-50 text-slate-700 hover:text-blue-700 w-full text-left font-bold text-[12px] transition-colors"
          >
            <EyeOff size={14} className="text-blue-500" /> Mark as Unread
          </button>
          {onEdit && (
            <button
              onClick={() => { onEdit(contextMenu.row); setContextMenu(null); }}
              className="flex items-center gap-2 px-4 py-2.5 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 w-full text-left font-bold text-[12px] transition-colors"
            >
              <Pencil size={14} className="text-indigo-500" /> Edit Request
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => { onDelete(contextMenu.row); setContextMenu(null); }}
              className="flex items-center gap-2 px-4 py-2.5 hover:bg-red-50 text-slate-700 hover:text-red-700 w-full text-left font-bold text-[12px] transition-colors"
            >
              <Trash2 size={14} className="text-red-500" /> Delete Request
            </button>
          )}
        </div>
      )}

      <div className="relative h-full flex flex-col">
        {/* Scroll arrow buttons */}
        {canLeft && (
          <button
            onClick={() => scroll(-1)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-30 w-8 h-12 bg-white/90 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-r-xl shadow-md flex items-center justify-center text-slate-500 hover:text-indigo-600 transition-all active:scale-95"
            title="Scroll left"
          >
            <ChevronLeft size={18} />
          </button>
        )}
        {canRight && (
          <button
            onClick={() => scroll(1)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-30 w-8 h-12 bg-white/90 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-l-xl shadow-md flex items-center justify-center text-slate-500 hover:text-indigo-600 transition-all active:scale-95"
            title="Scroll right"
          >
            <ChevronRight size={18} />
          </button>
        )}

      <div ref={scrollRef} className="bg-white rounded-xl shadow-xl border overflow-auto h-full" style={{minHeight:"200px"}}>
        <table className="w-full border-separate border-r border-black min-w-[860px]" style={{borderSpacing:0}}>
          <thead>
            <tr className="text-slate-800 uppercase font-black text-[13px]">
              <th colSpan="11" className="sticky top-0 bg-blue-300 border border-black p-3 text-center z-20">
                Requestor Department
              </th>
              <th className="sticky top-0 bg-[#f1f5f9] w-8 z-20" />
              <th colSpan="6" className="sticky top-0 bg-orange-300 border border-black p-3 text-center z-20">
                Assigned Department
              </th>
              <th className="sticky top-0 bg-[#9acafa] border-t border-b border-r border-black p-3 text-center z-20">
                Requestor
              </th>
            </tr>
            <tr className="bg-slate-100 border-l border-black text-slate-700 font-bold">
              {["Ticket #", "Date", "User ID", "Name", "Dept", "Designation", "Location", "RM Status", "HOD Status", "Urgency Level", "Due / Days Left"].map((h, i) => {
                const fc = i < 5 ? FROZEN[i] : null;
                return (
                  <th
                    key={h}
                    className={`sticky top-[45px] bg-slate-100 border-t border-b border-r border-black ${i === 0 ? "border-l" : ""} ${i === 4 ? "!border-r-2 !border-r-indigo-400" : ""} p-2 ${fc ? "z-20" : "z-10"} text-center whitespace-nowrap text-[12px]`}
                    style={fc ? { left: fc.left, minWidth: fc.width } : undefined}
                  >
                    {h}
                  </th>
                );
              })}
              <th className="sticky top-[45px] bg-[#f1f5f9] w-8 z-10" />
              {["Details", "Department", "Assign RM", "Assign HOD", "Dept HOD Status", "Request Status"].map((h, i) => (
                <th key={h} className={`sticky top-[45px] bg-slate-100 border-t border-b border-r border-black ${i === 0 ? "border-l" : ""} p-1 z-10 text-center whitespace-nowrap text-[12px]`}>
                  {h}
                </th>
              ))}
              <th className="sticky top-[45px] bg-[#f1f5f9] border-t border-b border-r border-black p-2 z-10 text-center whitespace-nowrap text-[12px]">
                Acknowledgement
              </th>
              
            </tr>
            
            
          </thead>

          <tbody className="bg-white">
            {sorted.length === 0 && (
              <tr>
                <td colSpan="20" className="text-center py-12 text-slate-400 font-medium">
                  No requests found.
                </td>
              </tr>
            )}

            {sorted.map((row, idx) => {
              const isUnread     = !row.seen;
              const isClosed     = row.isClosed || String(row.assignedStatus).includes("Closed");
              const isPendingAck = row.assignedStatus === "Pending Acknowledgement";
              const isOwnRow     = row.empId === currentUser?.empId;
              const isReopened   = !!(row.reopenedAt && !isClosed);

              const rowBg =
                isClosed                  ? "bg-green-50/40"  :
                isPendingAck              ? "bg-amber-50/40"  :
                (isReopened && isUnread)  ? "bg-orange-50"    :
                isUnread                  ? "bg-blue-50"      :
                row.forwarded             ? "bg-blue-50/20"   : "";
              const bold = isUnread ? "font-black" : "";

              return (
                <tr
                  key={row.id}
                  className={`hover:bg-blue-50/50 transition-colors ${rowBg}`}
                  onContextMenu={(e) => handleRightClick(e, row.id, row)}
                >
                  {[row.id, row.date, row.empId, row.name, row.dept, row.designation, row.location].map((val, i) => {
                    const fc = i < 5 ? FROZEN[i] : null;
                    const frozenBg = isClosed ? "#f0fdf4" : isPendingAck ? "#fffbeb" : (isReopened && isUnread) ? "#fff7ed" : isUnread ? "#eff6ff" : row.forwarded ? "#f5f8ff" : "#ffffff";
                    return (
                      <td
                        key={i}
                        className={`border-b border-r border-black ${i === 0 ? "border-l" : ""} ${i === 4 ? "!border-r-2 !border-r-indigo-400" : ""} p-2 text-center text-[12px] ${bold} whitespace-nowrap`}
                        style={fc ? {
                          position: "sticky",
                          left: fc.left,
                          minWidth: fc.width,
                          backgroundColor: frozenBg,
                          zIndex: 5,
                        } : undefined}
                      >
                        {i === 1 ? (
                          <span className="flex flex-col items-center gap-0.5">
                            <span>{val}</span>
                            <span className="text-[10px] text-slate-500 font-bold">{row.time}</span>
                          </span>
                        ) : val}
                      </td>
                    );
                  })}
                  <td className="border-b border-r border-black p-2 text-center">
                    <StatusBadge status={row.rmStatus} date={row.rmDate} />
                  </td>
                  <td className="border-b border-r border-black p-2 text-center">
                    <StatusBadge status={row.hodStatus} date={row.hodDate} />
                  </td>

                  {/* Priority */}
                  <td className="border-b border-r border-black p-1 text-center whitespace-nowrap">
                    {row.priority ? (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                        row.priority === "Overdue" ? "bg-red-100 text-red-700" :
                        row.priority === "High"    ? "bg-orange-100 text-orange-700" :
                        row.priority === "Medium"  ? "bg-yellow-100 text-yellow-700" :
                        "bg-green-100 text-green-700"
                      }`}>{row.priority}</span>
                    ) : <span className="text-slate-300 text-[10px]">—</span>}
                  </td>

                  {/* Due / Days Left */}
                  <td className="border-b border-r border-black p-1 text-center whitespace-nowrap">
                    {row.dueDate ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] text-slate-600 font-bold">{row.dueDate}</span>
                        {row.daysUntilDue !== null && row.daysUntilDue !== undefined && (
                          <span className={`text-[9px] font-bold ${row.daysUntilDue < 0 ? "text-red-600" : row.daysUntilDue <= 7 ? "text-orange-600" : "text-slate-500"}`}>
                            {row.daysUntilDue < 0 ? `${Math.abs(row.daysUntilDue)}d overdue` : `${row.daysUntilDue}d left`}
                          </span>
                        )}
                      </div>
                    ) : <span className="text-slate-300 text-[10px]">—</span>}
                  </td>

                  {/* Separator */}
                  <td className="bg-[#f1f5f9] border-b w-8 text-center">
                    <div className="flex items-center justify-center h-full">
                      {isOwnRow ? (
                        <Send size={17} className="text-green-500 flex-shrink-0" title="Your request" />
                      ) : (
                        <div className="relative inline-flex">
                          <Bell size={20} className="text-yellow-500 flex-shrink-0" title="Incoming" />
                          <span className="absolute top-0 right-0 block h-1 w-1 rounded-full bg-red-600 ring-2 ring-white" />
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Details / purpose */}
                  <td className="border-l border-b border-r border-black px-3 py-2 cursor-pointer text-center" onClick={() => onOpenDetails(row)}>
                    <span className="flex flex-col items-center gap-0.5">
                      <span className="flex items-center justify-center gap-1.5">
                        {isReopened && isUnread && <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0 inline-block" />}
                        {!isReopened && isUnread && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 inline-block" />}
                        <span className={`text-blue-600 underline text-[12px] ${isUnread ? "font-black" : "font-bold"}`} title={row.purpose}>
                          {row.purpose?.length > 15 ? row.purpose.slice(0, 15) + "…" : row.purpose}
                        </span>
                        {row.unreadChatCount > 0 && (
                          <span className="bg-red-500 text-white text-[9px] font-black w-[18px] h-[18px] rounded-full text-center leading-none flex items-center justify-center flex-shrink-0" title={`${row.unreadChatCount} new chat message${row.unreadChatCount === 1 ? "" : "s"}`}>
                            {row.unreadChatCount}
                          </span>
                        )}
                      </span>
                      {isReopened && <span className="text-[9px] font-black text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full">🔄 Reopened</span>}
                      {row.isRecurring && <span className="text-[9px] font-black text-violet-600 bg-violet-100 px-1.5 py-0.5 rounded-full">🔁 Recurring</span>}
                      {row.requestorRole === "broadcast" && <span className="text-[9px] font-black text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded-full">📢 Broadcast</span>}
                      {row.threadReplyCount > 0 && <span className="text-[9px] font-black text-teal-600 bg-teal-100 px-1.5 py-0.5 rounded-full">↳ {row.threadReplyCount} Thread {row.threadReplyCount === 1 ? "reply" : "replies"}</span>}
                      {row.threadParentId != null && <span className="text-[9px] font-black text-teal-600 bg-teal-100 px-1.5 py-0.5 rounded-full">↳ Thread reply</span>}
                    </span>
                  </td>

                  {/* Assigned dept */}
                  <td className="border-b border-r border-black p-2 text-center text-[12px]">
                    {row.forwarded ? (
                      <span className="flex items-center justify-center gap-1 text-blue-600 font-bold whitespace-nowrap">
                        <Forward size={13} className="text-blue-500 flex-shrink-0" />
                        <span className="text-slate-400 line-through text-[10px]">{row.forwardedFromDept || row.dept}</span>
                        <span>→</span>
                        <span>{row.assignedDept}</span>
                      </span>
                    ) : row.assignedDepts && row.assignedDepts.split(",").length > 1 ? (
                      <div className="flex flex-wrap justify-center gap-1">
                        {row.assignedDepts.split(",").map((d) => (
                          <span key={d} className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${d.trim() === row.assignedDept ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"}`}>
                            {d.trim()}
                          </span>
                        ))}
                      </div>
                    ) : row.assignedDept}
                  </td>

                  {/* Assigned dept RM status */}
                  <td className="border-b border-r border-black p-2 text-center">
                    <StatusBadge status={row.assignedRmStatus} date={row.assignedRmDate} />
                  </td>

                  {/* Assigned dept HOD status */}
                  <td className="border-b border-r border-black p-2 text-center">
                    <StatusBadge status={row.assignedHodStatus} date={row.assignedHodDate} />
                  </td>


                  {/* Dept HOD status */}
                  <td className="border-b border-r border-black p-2 text-center">
                    <StatusBadge status={row.deptHodStatus} date={row.deptHodDate} />
                  </td>

                  {/* Request status */}
                  <td className="border-b border-r border-black p-1 text-center">
                    {isClosed ? (
                      <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-1 rounded-lg block whitespace-nowrap">
                        {row.assignedStatus}
                      </span>
                    ) : isPendingAck ? (
                      <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-1 rounded-lg block whitespace-nowrap">
                        Ack. Pending
                      </span>
                    ) : row.assignedStatus === "Checking" ? (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-lg block whitespace-nowrap">
                        Checking
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg block">
                        Open
                      </span>
                    )}
                  </td>

                  {/* Acknowledgement status */}
                  <td className="border-b border-r border-black p-1 text-center whitespace-nowrap">
                    {(row.acknowledgement === "Resolved" || row.acknowledgement === "Received") ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-lg block">Resolved</span>
                    ) : (isPendingAck || (isClosed && !row.acknowledgement)) && isOwnRow && onAcknowledge ? (
                      <div className="flex flex-col gap-1 items-center">
                        {/* Resolved */}
                        {(() => {
                          const key = `${row.id}-Resolved`;
                          const isLoading = pendingAck === key;
                          return (
                            <button
                              onClick={(e) => handleAck(e, row.id, "Resolved")}
                              disabled={!!pendingAck}
                              className={`flex items-center gap-1 text-emerald-700 text-[10px] font-black px-2 py-1 rounded-lg w-full justify-center transition-colors ${
                                isLoading ? "bg-emerald-200 cursor-wait"
                                : pendingAck ? "bg-emerald-50 opacity-40 cursor-not-allowed"
                                : "bg-emerald-100 hover:bg-emerald-200"
                              }`}
                            >
                              {isLoading
                                ? <span className="inline-block w-2.5 h-2.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                                : <ThumbsUp size={10} />}
                              Resolved
                            </button>
                          );
                        })()}
                        {/* Not Resolved */}
                        {(() => {
                          const key = `${row.id}-Not Resolved`;
                          const isLoading = pendingAck === key;
                          return (
                            <button
                              onClick={(e) => handleAck(e, row.id, "Not Resolved")}
                              disabled={!!pendingAck}
                              className={`flex items-center gap-1 text-red-700 text-[10px] font-black px-2 py-1 rounded-lg w-full justify-center transition-colors ${
                                isLoading ? "bg-red-200 cursor-wait"
                                : pendingAck ? "bg-red-50 opacity-40 cursor-not-allowed"
                                : "bg-red-100 hover:bg-red-200"
                              }`}
                            >
                              {isLoading
                                ? <span className="inline-block w-2.5 h-2.5 border-2 border-red-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                                : <ThumbsDown size={10} />}
                              Not Resolved
                            </button>
                          );
                        })()}
                      </div>
                    ) : isPendingAck || (isClosed && !row.acknowledgement) ? (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded-lg block">⏳ Pending</span>
                    ) : isClosed ? (
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg block">—</span>
                    ) : (
                      <span className="text-slate-300 text-[10px]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </div>
    </>
  );
}
