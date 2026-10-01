import { CheckCircle, XCircle, Clock, Forward, Users } from "lucide-react";
import { sanitizeHtml, isHtmlContent } from "../../utils/sanitize";
// import { getRoleBadgeClass } from "../../utils/roleStyles";

const STATUS_ICON = {
  Approved:  <CheckCircle size={12} className="text-green-600" />,
  Rejected:  <XCircle    size={12} className="text-red-600"   />,
  Checking:  <Clock      size={12} className="text-amber-600" />,
  Forwarded: <Forward    size={14} className="text-blue-600"  />,
  Assigned:  <Users      size={12} className="text-teal-600"  />,
};

const CARD_BG = {
  Approved:  "bg-green-50  border-green-200",
  Forwarded: "bg-blue-50   border-blue-200",
  Checking:  "bg-amber-50  border-amber-200",
  Rejected:  "bg-red-50    border-red-200",
  Assigned:  "bg-teal-50   border-teal-200",
};

const BADGE_CLS = {
  Approved:  "bg-green-100 text-green-700",
  Forwarded: "bg-blue-100  text-blue-700",
  Checking:  "bg-amber-100 text-amber-700",
  Rejected:  "bg-red-100   text-red-700",
  Assigned:  "bg-teal-100  text-teal-700",
};

/**
 * Coloured card shown in the chat for approval / rejection / forwarding actions.
 * Layout: [icon | name | role badge]  [date · time]
 *                                     [status badge]
 *         text body
 */
export default function ApprovalCard({ log }) {
  return (
    <div
      className={`rounded-xl p-2.5 border text-[11px] ${CARD_BG[log.status] || "bg-slate-50 border-slate-200"}`}
    >
      {/* Row 1: icon + name + role  |  date · time */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          {STATUS_ICON[log.status]}
          <span className="font-black text-slate-800">
            {log.dept ? `${log.dept} - ${log.role}` : log.role}
          </span>
          {/* <span
            className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${getRoleBadgeClass(log.role)}`}
          >
            {log.role}
          </span> */}
        </div>
        <span className="text-[9px] text-slate-700 flex-shrink-0">
          {log.date} · {log.time}
        </span>
      </div>

      {/* Row 2: status badge right-aligned */}
      <div className="flex justify-start mb-1 min-w-0">
        <span
          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full break-all ${BADGE_CLS[log.status] || ""}`}
        >
          {log.status} — {log.purpose}
        </span>
      </div>

      {/* Forwarded dept change */}
      {log.status === "Forwarded" && log.changedDept && (
        <p className="text-[10px] text-blue-700 font-bold pl-4 mb-0.5">
          Dept:{" "}
          <span className="line-through text-slate-400">
            {log.originalDept}
          </span>
          {" → "}
          <span>{log.changedDept}</span>
        </p>
      )}

      {/* Internally assigned persons */}
      {log.status === "Assigned" && log.changedDept && (
        <p className="text-[10px] text-teal-700 font-bold pl-4 mb-0.5">
          Assigned to: <span>{log.changedDept}</span>
        </p>
      )}

      {isHtmlContent(log.text)
        ? <div
            className="text-slate-600 pl-4 [&_ul]:list-disc [&_ul]:list-inside [&_mark]:bg-yellow-200 [&_b]:font-bold [&_u]:underline"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(log.text) }}
          />
        : <p className="text-slate-600 pl-4">{log.text}</p>}
    </div>
  );
}
