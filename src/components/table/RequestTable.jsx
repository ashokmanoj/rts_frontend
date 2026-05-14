/**
 * components/table/RequestTable.jsx — Updated
 * Added: Management Status column in the Assigned Department section
 */

import React, { useState, useEffect } from "react";
import { Forward, EyeOff, Bell, Send, ThumbsUp, ThumbsDown } from "lucide-react";
import StatusBadge from "./StatusBadge";

export default function RequestTable({ requests, currentUser, onOpenDetails, onMarkUnread, onAcknowledge }) {
  const [contextMenu, setContextMenu] = useState(null);

  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const handleRightClick = (e, rowId) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, rowId });
  };

  const handleMarkUnread = (rowId) => {
    onMarkUnread(rowId);
    setContextMenu(null);
  };

  const sorted = [
    ...requests.filter((r) => !r.seen && r.forwarded),
    ...requests.filter((r) => !r.seen && !r.forwarded),
    ...requests.filter((r) => r.seen  && r.forwarded),
    ...requests.filter((r) => r.seen  && !r.forwarded),
  ];

  return (
    <>
      {contextMenu && (
        <div
          className="fixed z-[100] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden py-1"
          style={{ top: Math.min(contextMenu.y, window.innerHeight - 60), left: Math.min(contextMenu.x, window.innerWidth - 180) }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleMarkUnread(contextMenu.rowId)}
            className="flex items-center gap-2 px-4 py-2.5 hover:bg-blue-50 text-slate-700 hover:text-blue-700 w-full text-left font-bold text-[12px] transition-colors"
          >
            <EyeOff size={14} className="text-blue-500" /> Mark as Unread
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-xl border overflow-auto" style={{maxHeight:"calc(100dvh - 280px)", minHeight:"200px"}}>
        <table className="w-full border-collapse border border-black min-w-[860px]">
          <thead>
            <tr className="text-slate-800 uppercase font-black text-[13px]">
              <th colSpan="11" className="sticky top-0 bg-blue-300 border border-black p-3 text-center z-20">
                Requestor Department
              </th>
              <th className="sticky top-0 bg-[#f1f5f9] border-b w-8 z-20" />
              <th colSpan="5" className="sticky top-0 bg-orange-300 border border-black p-3 text-center z-20">
                Assigned Department
              </th>
              <th className="sticky top-0 bg-[#9acafa] border-b w-8 border border-black p-3 text-center z-20" >
              Requestor
              </th>
            </tr>
            <tr className="bg-slate-100 border-l border-black text-slate-700 font-bold">
              {["Sl.No.", "Date", "User ID", "Name", "Dept", "Designation", "Location", "RM Status", "HOD Status", "Urgency Level", "Due / Days Left"].map((h) => (
                <th key={h} className="sticky top-[45px] bg-slate-100 border-b border-r border-black p-2 z-10 text-center whitespace-nowrap text-[11px]">
                  {h}
                </th>
              ))}
              <th className="sticky top-[45px] bg-[#f1f5f9] w-8 z-10" />
              {["Details", "Department", "Checking Info", "Dept HOD Status", "Request Status"].map((h) => (
                <th key={h} className="sticky top-[45px] bg-slate-100 border border-black p-1 z-10 text-center whitespace-nowrap text-[11px]">
                  {h}
                </th>
              ))}
              <th className="sticky top-[45px] bg-[#f1f5f9] border border-black p-2 z-10 text-center whitespace-nowrap text-[11px]">
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

              const rowBg =
                isClosed      ? "bg-green-50/40"  :
                isPendingAck  ? "bg-amber-50/40"  :
                isUnread      ? "bg-blue-50"       :
                row.forwarded ? "bg-blue-50/20"    : "";
              const bold = isUnread ? "font-black" : "";

              return (
                <tr
                  key={row.id}
                  className={`hover:bg-blue-50/50 transition-colors border-b border-l border-black ${rowBg}`}
                  onContextMenu={(e) => handleRightClick(e, row.id)}
                >
                  {[idx + 1, row.date, row.empId, row.name, row.dept, row.designation, row.location].map((val, i) => (
                    <td key={i} className={`border-r border-black p-2 text-center text-[11px] ${bold} whitespace-nowrap`}>
                      {val}
                    </td>
                  ))}
                  <td className="border-r border-black p-2 text-center">
                    <StatusBadge status={row.rmStatus} date={row.rmDate} />
                  </td>
                  <td className="border-r border-black p-2 text-center">
                    <StatusBadge status={row.hodStatus} date={row.hodDate} />
                  </td>

                  {/* Priority */}
                  <td className="border-r border-black p-1 text-center whitespace-nowrap">
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
                  <td className="border-r border-black p-1 text-center whitespace-nowrap">
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
                  <td className="bg-[#f1f5f9] border-t border-b w-8 text-center">
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
                  <td className="border border-black px-3 py-2 cursor-pointer text-center" onClick={() => onOpenDetails(row)}>
                    <span className="flex items-center justify-center gap-1.5">
                      {isUnread && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 inline-block" />}
                      <span className={`text-blue-600 underline text-[11px] ${isUnread ? "font-black" : "font-bold"}`} title={row.purpose}>
                        {row.purpose?.length > 15 ? row.purpose.slice(0, 15) + "…" : row.purpose}
                      </span>
                    </span>
                  </td>

                  {/* Assigned dept */}
                  <td className="border border-black p-2 text-center text-[11px]">
                    {row.forwarded ? (
                      <span className="flex items-center justify-center gap-1 text-blue-600 font-bold whitespace-nowrap">
                        <Forward size={13} className="text-blue-500 flex-shrink-0" />
                        <span className="text-slate-400 line-through text-[10px]">{row.dept}</span>
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

                  {/* Checking info */}
                  <td className="border border-black p-1 text-center whitespace-nowrap">
                    {row.assignedStatus === "Checking" && row.checkingDaysLeft != null ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${row.checkingDaysLeft < 0 ? "bg-red-100 text-red-700" : row.checkingDaysLeft <= 2 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                          {row.checkingDaysLeft < 0 ? "Overdue!" : `${row.checkingDaysLeft}d left`}
                        </span>
                        {row.checkingBy && <span className="text-[9px] text-slate-500 font-medium truncate max-w-[90px]" title={row.checkingBy}>{row.checkingBy}</span>}
                      </div>
                    ) : <span className="text-slate-300 text-[10px]">—</span>}
                  </td>

                  {/* Dept HOD status */}
                  <td className="border border-black p-2 text-center">
                    <StatusBadge status={row.deptHodStatus} date={row.deptHodDate} />
                  </td>

                  {/* Request status */}
                  <td className="border border-black p-1 text-center">
                    {isClosed ? (
                      <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-1 rounded-lg block whitespace-nowrap">
                        {row.assignedStatus}
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
                  <td className="border border-black p-1 text-center whitespace-nowrap">
                    {row.acknowledgement === "Received" ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-lg block">Received</span>
                    ) : isPendingAck && isOwnRow && onAcknowledge ? (
                      <div className="flex flex-col gap-1 items-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); onAcknowledge(row.id, "Received"); }}
                          className="flex items-center gap-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-[10px] font-black px-2 py-1 rounded-lg transition-colors w-full justify-center"
                        >
                          <ThumbsUp size={10} /> Received
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onAcknowledge(row.id, "Not Received"); }}
                          className="flex items-center gap-1 bg-red-100 hover:bg-red-200 text-red-700 text-[10px] font-black px-2 py-1 rounded-lg transition-colors w-full justify-center"
                        >
                          <ThumbsDown size={10} /> Not Received
                        </button>
                      </div>
                    ) : isPendingAck ? (
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
    </>
  );
}
