import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, User, ChevronDown, CheckCircle, XCircle, Clock, Forward, ImageOff, ZoomIn, Bell, Send, ShieldCheck, Calendar, AlertTriangle, ThumbsUp, ThumbsDown, FileSpreadsheet, FileText, Eye, MessageSquare, Download, Users, ChevronRight, Search, RefreshCw, StopCircle, Check, Paperclip, Link2, Plus } from "lucide-react";
import { get, patch } from "../../services/api";
import { attachAfterClose, fetchRequestThread } from "../../services/requestService";
import { renderRichText } from "../../utils/richText";
import { sanitizeHtml, isHtmlContent } from "../../utils/sanitize";
import { LinkPreview } from "../../utils/linkUtils";
import RichTextArea from "../ui/RichTextArea";

import { useEscapeKey } from "../../hooks/useEscapeKey";
import { getNowTime, getNowDate, getNowDateTime } from "../../utils/dateTime";
import { resolveFileUrl } from "../../utils/security";
import StatusBadge            from "../table/StatusBadge";
import ChatPanel              from "../chat/ChatPanel";
import SpreadsheetPreviewModal from "./SpreadsheetPreviewModal";
import PDFPreviewModal         from "./PDFPreviewModal";
import GalleryLightbox         from "./GalleryLightbox";
import Spinner                 from "../ui/Spinner";
import SearchableSelect        from "../ui/SearchableSelect";

const DEPARTMENTS = ["Academics-Assam","Academics-Karnataka","Academics-Mizoram","Academics-Tripura","Academics-Uttarakhand","Accounts-A","Accounts-G","Animation","Broadcasting-Assam","Broadcasting-Karnataka","Broadcasting-Mizoram","Broadcasting-Tripura","Broadcasting-Uttarakhand","Business Development","Corporate Communications","Documentation","Facilities","Food Committee","Game Development","Govt. Relations","HR","Management","Marketing","Operations-Assam","Operations-Bihar","Operations-Karnataka","Operations-Maharashtra","Operations-Mizoram","Operations-Nagaland","Operations-Tripura","Operations-Uttarakhand","Purchase","RTS Help Desk","Software","Stores-Assam","Stores-Karnataka","Stores-Mizoram","Stores-Tripura","System Admin-Assam","System Admin-Karnataka","System Admin-Uttarakhand","TA Committee","Technical Support"];
const NO_USER_DEPTS = new Set(["Accounts-A", "Accounts-G"]);

function StatusDot({ status, label, index }) {
  const cls =
    status === "Approved"  ? "bg-emerald-500 border-emerald-500 text-white" :
    status === "Rejected"  ? "bg-red-500 border-red-500 text-white"         :
    status === "Checking"  ? "bg-amber-400 border-amber-400 text-white"     :
    status === "Forwarded" ? "bg-blue-500 border-blue-500 text-white"       :
    "bg-slate-100 border-slate-200 text-slate-400";
  const textCls =
    status === "Approved" ? "text-emerald-600" : status === "Rejected" ? "text-red-500" :
    status === "Checking" ? "text-amber-600"   : "text-blue-500";
  return (
    <div className="flex flex-col items-center flex-1 min-w-0">
      <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[9px] font-black ${cls}`}>
        {status === "Approved" ? <CheckCircle size={12}/> : status === "Rejected" ? <XCircle size={12}/> :
         status === "Checking" ? <Clock size={12}/> : status === "Forwarded" ? <Forward size={11}/> : <span>{index+1}</span>}
      </div>
      <span className="text-[7px] text-slate-500 font-bold mt-0.5 text-center px-0.5 truncate w-full">{label}</span>
      {status && status !== "--" && <span className={`text-[7px] font-black ${textCls}`}>{status}</span>}
    </div>
  );
}

function ApprovalProgress({ rmStatus, hodStatus, assignedRmStatus, assignedHodStatus, deptHodStatus, managementStatus, isClosed, dept, assignedDept }) {
  const lineCls = (s) => !s || s === "--" ? "bg-slate-200" : s === "Approved" ? "bg-emerald-400" : s === "Rejected" ? "bg-red-400" : "bg-amber-300";
  const isCrossDept = dept && assignedDept && dept !== assignedDept;
  const hasMgmt = managementStatus && managementStatus !== "--";

  return (
    <div className="space-y-2">
      <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Approval Progress</p>
      <div className="flex gap-3">
        {/* Requestor dept side */}
        <div className="flex-1 min-w-0">
          <p className="text-[8px] text-blue-400 font-black uppercase tracking-widest mb-1 text-center truncate">{dept || "Requestor"}</p>
          <div className="flex items-center">
            <StatusDot status={rmStatus}  label="RM"  index={0} />
            <div className={`h-0.5 w-2 flex-shrink-0 ${lineCls(rmStatus)}`}/>
            <StatusDot status={hodStatus} label="HOD" index={1} />
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center"><div className="w-px h-10 bg-slate-200"/></div>

        {/* Assigned dept side */}
        <div className="flex-1 min-w-0">
          <p className="text-[8px] text-orange-400 font-black uppercase tracking-widest mb-1 text-center truncate">{assignedDept || "Assigned"}</p>
          <div className="flex items-center">
            {isCrossDept && <>
              <StatusDot status={assignedRmStatus}  label="RM"  index={0} />
              <div className={`h-0.5 w-2 flex-shrink-0 ${lineCls(assignedRmStatus)}`}/>
              <StatusDot status={assignedHodStatus} label="HOD" index={1} />
              <div className={`h-0.5 w-2 flex-shrink-0 ${lineCls(assignedHodStatus)}`}/>
            </>}
            {hasMgmt && <>
              <StatusDot status={managementStatus} label="Mgmt" index={isCrossDept ? 2 : 0} />
              <div className={`h-0.5 w-2 flex-shrink-0 ${lineCls(managementStatus)}`}/>
            </>}
            <StatusDot status={deptHodStatus} label="Dept HOD" index={isCrossDept ? (hasMgmt ? 3 : 2) : (hasMgmt ? 1 : 0)} />
            <div className={`h-0.5 w-2 flex-shrink-0 ${isClosed?"bg-emerald-400":"bg-slate-200"}`}/>
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[9px] font-black ${isClosed?"bg-emerald-500 border-emerald-500 text-white":"bg-slate-100 border-slate-200 text-slate-300"}`}>
                {isClosed ? "✓" : "🔒"}
              </div>
              <span className="text-[7px] text-slate-500 font-bold mt-0.5">Closed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DetailsModal({ req, chatLogs, currentUser, onClose, onSendMessage, onApproval, onOpenCloseTicket, onAcknowledge, onRefreshChat, onAddToThread, onOpenRequest }) {
  const [selectedDept,            setSelectedDept]            = useState(req?.assignedDept || "");
  const [approvalComment,         setApprovalComment]         = useState("");
  const [lightboxData,            setLightboxData]            = useState(null); // { urls, names, index }
  const [showCheckingModal,       setShowCheckingModal]       = useState(false);
  const [checkingDate,            setCheckingDate]            = useState("");
  const [checkingReason,          setCheckingReason]          = useState("");
  const [approvalLoading,         setApprovalLoading]         = useState(false);
  const [pendingDecision,         setPendingDecision]         = useState(null);
  const [pendingAck,              setPendingAck]              = useState(null);
  const [showChat,                setShowChat]                = useState(false);
  const [bulkDownloading,         setBulkDownloading]         = useState(false);
  const [showDeptHodApproveModal,  setShowDeptHodApproveModal]  = useState(false);
  const [deptHodMode,              setDeptHodMode]              = useState(null); // "internal" | "forward"
  const [deptHodSelectedPersons,   setDeptHodSelectedPersons]   = useState([]); // [{ empId, name }]
  const [deptHodForwardDept,       setDeptHodForwardDept]       = useState("");
  const [deptUsersForApproval,     setDeptUsersForApproval]     = useState([]);
  const [loadingDeptUsers,         setLoadingDeptUsers]         = useState(false);
  const [deptUsersSearch,          setDeptUsersSearch]          = useState("");
  // HOD approve popup
  const [showHodApproveModal,  setShowHodApproveModal]  = useState(false);
  const [hodApproveMode,       setHodApproveMode]       = useState(null); // null | "forward"
  const [hodForwardDept,       setHodForwardDept]       = useState("");
  const [hodDeptSearch,        setHodDeptSearch]        = useState("");
  // Stop recurring
  const [stopRecurringLoading, setStopRecurringLoading] = useState(false);
  // Forward dept+person combined picker
  const [fwdDeptUsers,   setFwdDeptUsers]   = useState({});
  const [fwdLoadingDept, setFwdLoadingDept] = useState(false);
  const [fwdPersons,     setFwdPersons]     = useState(new Set());
  const [fwdPickerOpen,  setFwdPickerOpen]  = useState(false);
  const [fwdDeptSearch,  setFwdDeptSearch]  = useState("");
  const [fwdPersonSearch,setFwdPersonSearch]= useState("");
  const [fwdPickerRect,  setFwdPickerRect]  = useState(null);
  const fwdPickerRef      = useRef(null);
  const fwdPickerPanelRef = useRef(null);

  // ── Thread state ────────────────────────────────────────────────────────────
  const [threadMembers,  setThreadMembers]  = useState([]);
  const [threadRootId,   setThreadRootId]   = useState(null);
  const [threadLoading,  setThreadLoading]  = useState(false);

  useEffect(() => {
    if (!req?.id) return;
    setThreadLoading(true);
    fetchRequestThread(req.id)
      .then(data => {
        setThreadMembers(data?.members ?? []);
        setThreadRootId(data?.rootId ?? null);
      })
      .catch(() => {})
      .finally(() => setThreadLoading(false));
  }, [req?.id]);

  useEscapeKey(
    lightboxData        ? () => setLightboxData(null)
    : showHodApproveModal ? () => { setShowHodApproveModal(false); setHodApproveMode(null); setHodForwardDept(""); setHodDeptSearch(""); }
    : showChat          ? () => setShowChat(false)
    : onClose
  );

  const ASSIGNABLE_ROLES = new Set(["RM", "HOD"]);
  const filterAssignable = (users) =>
    users.filter(u =>
      ASSIGNABLE_ROLES.has(u.role) ||
      (u.roles || []).some(r => ASSIGNABLE_ROLES.has(r.role))
    );
  const fwdDeptUsersRef = useRef({});
  const selectFwdDept = async (dept) => {
    setSelectedDept(dept);
    setFwdPersons(new Set());
    setFwdPersonSearch("");
    if (fwdDeptUsersRef.current[dept] !== undefined) return; // already cached
    if (NO_USER_DEPTS.has(dept)) {
      fwdDeptUsersRef.current = { ...fwdDeptUsersRef.current, [dept]: [] };
      setFwdDeptUsers(fwdDeptUsersRef.current);
      return;
    }
    setFwdLoadingDept(true);
    try {
      const data  = await get(`/requests/users-by-dept?depts=${encodeURIComponent(dept)}`);
      const all   = Array.isArray(data) ? data : (data?.data ?? []);
      const users = filterAssignable(all);
      fwdDeptUsersRef.current = { ...fwdDeptUsersRef.current, [dept]: users };
      setFwdDeptUsers(fwdDeptUsersRef.current);
    } catch {
      fwdDeptUsersRef.current = { ...fwdDeptUsersRef.current, [dept]: [] };
      setFwdDeptUsers(fwdDeptUsersRef.current);
    } finally {
      setFwdLoadingDept(false);
    }
  };

  // Close fwd picker on outside click
  useEffect(() => {
    if (!fwdPickerOpen) return;
    const close = (e) => {
      if (
        fwdPickerRef.current      && !fwdPickerRef.current.contains(e.target) &&
        fwdPickerPanelRef.current && !fwdPickerPanelRef.current.contains(e.target)
      ) { setFwdPickerOpen(false); setFwdDeptSearch(""); setFwdPersonSearch(""); }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [fwdPickerOpen]);

  const repositionFwdPicker = useCallback(() => {
    if (!fwdPickerOpen) return;
    const r = fwdPickerRef.current?.getBoundingClientRect();
    if (r) setFwdPickerRect(r);
  }, [fwdPickerOpen]);
  useEffect(() => {
    if (!fwdPickerOpen) return;
    window.addEventListener("scroll", repositionFwdPicker, true);
    window.addEventListener("resize", repositionFwdPicker);
    return () => {
      window.removeEventListener("scroll", repositionFwdPicker, true);
      window.removeEventListener("resize", repositionFwdPicker);
    };
  }, [fwdPickerOpen, repositionFwdPicker]);

  const handleBulkDownload = async () => {
    if (!req?.fileUrls?.length || bulkDownloading) return;
    setBulkDownloading(true);
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      await Promise.all(
        req.fileUrls.map(async (url, idx) => {
          const resolved = resolveFileUrl(url);
          if (!resolved) return;
          const fileName = req.fileNames?.[idx] || `file-${idx + 1}`;
          const res  = await fetch(resolved);
          const blob = await res.blob();
          zip.file(fileName, blob);
        })
      );
      const content = await zip.generateAsync({ type: "blob" });
      const link    = document.createElement("a");
      link.href     = URL.createObjectURL(content);
      link.download = `request-${req.id}-files.zip`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error("Bulk download failed:", err);
    } finally {
      setBulkDownloading(false);
    }
  };

  const logs        = chatLogs[req?.id] || [];
  const deptChanged = selectedDept !== req?.assignedDept;
  const isClosed    = req?.isClosed || false;
  const isPendingAck = req?.assignedStatus === "Pending Acknowledgement";
  // Ticket closed directly (rejected/admin) — requestor can still choose to reopen
  const isDirectlyClosed = isClosed && !isPendingAck && !req?.acknowledgement;
  const role        = currentUser?.role || "";
  const roleLow     = role.toLowerCase();

  const isRM              = roleLow === "rm";
  const isHOD             = roleLow === "hod";
  const isDeptHOD         = roleLow === "depthod";
  const isManagement      = roleLow === "management";
  const isAdmin           = roleLow === "admin";
  const isViewCloseTicket = roleLow === "viewcloseticket";
  const isOwnRequest = req?.empId === currentUser?.empId;
  const isFromOtherDept = (req?.dept || "").trim().toLowerCase() !== (currentUser?.dept || "").trim().toLowerCase();
  const isAssignedToMyDept = (req?.assignedDept || "").trim().toLowerCase() === (currentUser?.dept || "").trim().toLowerCase();

  // User's dept must be involved in this request (as requestor dept, assigned dept, or in the
  // forwarding chain) before RM/HOD/DeptHOD can take any action on it.
  const myDeptLower = (currentUser?.dept || "").trim().toLowerCase();
  const assignedDeptsChain = (req?.assignedDepts || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  const isDeptRelevant =
    myDeptLower === (req?.dept || "").trim().toLowerCase() ||
    myDeptLower === (req?.assignedDept || "").trim().toLowerCase() ||
    assignedDeptsChain.includes(myDeptLower);
  const isTeamMemberIncoming = isFromOtherDept && isAssignedToMyDept;

  // If this RM/HOD is from the assigned dept (not requestor's dept) → use assigned fields
  const isAssignedDeptUser = (isRM || isHOD) && isAssignedToMyDept && isFromOtherDept;
  const myApprovalStatus = isRM
    ? (isAssignedDeptUser ? req?.assignedRmStatus : req?.rmStatus)
    : isHOD
    ? (isAssignedDeptUser ? req?.assignedHodStatus : req?.hodStatus)
    : isDeptHOD ? req?.deptHodStatus
    : isManagement ? req?.managementStatus
    : "--";
  const hasAlreadyActed = myApprovalStatus && myApprovalStatus !== "--";
  const isSpecificallyAssigned = !isOwnRequest && !!(req?.assignedPersonEmpId?.split(",").map(s => s.trim()).includes(currentUser?.empId));

  // Request was forwarded away from the current user's dept to a different dept.
  // Original dept users lose all action buttons — only the receiving dept acts.
  // Management can always act regardless of forwarding.
  const isForwardedAway = !!(
    req?.forwarded &&
    (req?.assignedDept || "").trim().toLowerCase() !== (currentUser?.dept || "").trim().toLowerCase() &&
    !isManagement &&
    !isOwnRequest
  );

  // CC users: explicitly CC'd on this ticket — can only view and chat, no actions.
  // Exception: if the user's dept is the assigned dept, they keep full action rights
  // even if the same dept was also added to ccDepts (e.g. old tickets with overlap).
  const isCcUser = !isOwnRequest && !isAssignedToMyDept && !!(
    (req?.ccDepts  && req.ccDepts.split(",").map(s => s.trim()).some(d => d === currentUser?.dept)) ||
    (req?.ccEmpIds && req.ccEmpIds.split(",").map(s => s.trim()).some(e => e === currentUser?.empId))
  );

  const canApprove    = (isRM || isHOD || isDeptHOD || isManagement) && !isClosed && !isPendingAck && !isOwnRequest && !isForwardedAway && !isCcUser && (isManagement || isDeptRelevant);
  const canChangeDept = (isRM || isHOD || isDeptHOD || isManagement) && !isOwnRequest && !isClosed && !isPendingAck && !isForwardedAway && !isCcUser && (isManagement || isDeptRelevant);
  // Facilities requestor can close incoming requests assigned to Facilities (not their own)
  const isFacilitiesRequestorClose = currentUser?.dept === "Facilities" && roleLow === "requestor" && req?.assignedDept === "Facilities" && !isOwnRequest && !isClosed && !isPendingAck && !isCcUser;
  // ViewCloseTicket: buttons only visible after the assigned dept HOD or DeptHOD has approved
  const viewCloseTicketGate = !isViewCloseTicket || req?.assignedHodStatus === "Approved" || req?.deptHodStatus === "Approved";
  const canClose      = (((isDeptHOD || isManagement) && !isOwnRequest && !isClosed && !isPendingAck && !isForwardedAway) ||
                        (isTeamMemberIncoming && !isClosed && !isPendingAck && !isAdmin && !isForwardedAway) ||
                        (isSpecificallyAssigned && !isClosed && !isPendingAck && !isAdmin) ||
                        isFacilitiesRequestorClose) && !isCcUser && viewCloseTicketGate;
  const canChat              = !isAdmin && !isClosed;
  const canAttachPostClose   = isClosed && req?.acknowledgement === "Resolved" && (isTeamMemberIncoming || isSpecificallyAssigned || isOwnRequest) && !isAdmin && !isCcUser;
  const isRequestorMode = roleLow === "requestor" || isOwnRequest;

  // Team members can click "Checking" on incoming requests from other departments
  const canUserCheck = isTeamMemberIncoming && !isClosed && !isPendingAck && !isAdmin && !canApprove && !isForwardedAway && !isCcUser && viewCloseTicketGate && !isViewCloseTicket;

  // Facilities dept team members can forward incoming requests to another department
  const canUserForward = currentUser?.dept === "Facilities" && isTeamMemberIncoming && !isClosed && !isPendingAck && !isAdmin && !canApprove && !isForwardedAway;

  // Directly-assigned persons get Forward + Checking + Close buttons
  const canAssignedPersonActions = isSpecificallyAssigned && !isClosed && !isPendingAck && !isAdmin && !isForwardedAway && !isCcUser && viewCloseTicketGate;

  // Check by filename as well as URL — new DB-stored files have UUID URLs with no extension
  const isImageFile      = (url, name) =>
    /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(url  || "") ||
    /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(name || "");
  const isSpreadsheetFile = (url, name) =>
    /\.(csv|xlsx|xls)(\?.*)?$/i.test(url  || "") ||
    /\.(csv|xlsx|xls)$/i.test(name || "");
  const isPdfFile         = (url, name) =>
    /\.pdf(\?.*)?$/i.test(url  || "") ||
    /\.pdf$/i.test(name || "");

  const [spreadsheetPreview, setSpreadsheetPreview] = useState(null); // { url, fileName }
  const [pdfPreview,         setPdfPreview]         = useState(null); // { url, fileName }

  const handleAttachPostClose = async (files) => {
    await attachAfterClose(req.id, files);
    onRefreshChat?.(req.id);
  };

  const handleApproval = async (decision, checkingDeadline = null, checkingReasonVal = null, extras = {}) => {
    if (approvalLoading) return;
    setPendingDecision(decision);
    setApprovalLoading(true);
    try {
      const dateTime = getNowDateTime();
      await onApproval(req.id, decision, dateTime, currentUser, approvalComment, selectedDept, checkingDeadline, checkingReasonVal, extras);
      setApprovalComment("");
    } finally {
      setApprovalLoading(false);
      setPendingDecision(null);
    }
  };

  const closeDeptHodModal = () => {
    setShowDeptHodApproveModal(false);
    setDeptHodMode(null);
    setDeptHodSelectedPersons([]);
    setDeptHodForwardDept("");
    setDeptUsersSearch("");
  };

  const closeHodModal = () => {
    setShowHodApproveModal(false);
    setHodApproveMode(null);
    setHodForwardDept("");
    setHodDeptSearch("");
  };

  const handleHodForwardConfirm = async () => {
    if (approvalLoading || !hodForwardDept) return;
    setApprovalLoading(true);
    try {
      const dateTime = getNowDateTime();
      await onApproval(req.id, "Forwarded", dateTime, currentUser, approvalComment, hodForwardDept, null, null, { dualDept: true });
      setApprovalComment("");
      closeHodModal();
    } finally {
      setApprovalLoading(false);
      setPendingDecision(null);
    }
  };

  const handleSelectInternalMode = async () => {
    setDeptHodMode("internal");
    if (!deptUsersForApproval.length && !loadingDeptUsers) {
      setLoadingDeptUsers(true);
      try {
        const users = await get(`/requests/users-by-dept?depts=${encodeURIComponent(currentUser?.dept || "")}`);
        setDeptUsersForApproval(Array.isArray(users) ? users : []);
      } catch {}
      setLoadingDeptUsers(false);
    }
  };

  const handleDeptHodApproveOnly = async () => {
    if (approvalLoading) return;
    setApprovalLoading(true);
    try {
      await onApproval(req.id, "Approved", getNowDateTime(), currentUser, approvalComment, selectedDept, null, null, {});
      setApprovalComment("");
      closeDeptHodModal();
    } finally {
      setApprovalLoading(false);
      setPendingDecision(null);
    }
  };

  const handleDeptHodApproveConfirm = async () => {
    if (approvalLoading || !deptHodMode) return;
    if (deptHodMode === "internal" && deptHodSelectedPersons.length === 0) return;
    if (deptHodMode === "forward" && !deptHodForwardDept) return;
    setApprovalLoading(true);
    try {
      const dateTime = getNowDateTime();
      if (deptHodMode === "internal") {
        const empIds = deptHodSelectedPersons.map(p => p.empId).join(",");
        const names  = deptHodSelectedPersons.map(p => p.name).join(",");
        await onApproval(req.id, "Approved", dateTime, currentUser, approvalComment, selectedDept, null, null, { assignedPersonEmpId: empIds, assignedPersonName: names });
      } else {
        await onApproval(req.id, "Forwarded", dateTime, currentUser, approvalComment, deptHodForwardDept, null, null, { dualDept: true });
      }
      setApprovalComment("");
      closeDeptHodModal();
    } finally {
      setApprovalLoading(false);
      setPendingDecision(null);
    }
  };

  const handleCheckingConfirm = () => {
    handleApproval("Checking", checkingDate || null, checkingReason || null);
    setShowCheckingModal(false);
    setCheckingDate("");
    setCheckingReason("");
  };

  const handleAcknowledge = async (status) => {
    if (!onAcknowledge || pendingAck) return;
    setPendingAck(status);
    try { await onAcknowledge(req.id, status); }
    finally { setPendingAck(null); }
  };

  const handleStopRecurring = async () => {
    if (stopRecurringLoading) return;
    if (!window.confirm("Stop the recurring schedule? No more auto-requests will be created from this ticket.")) return;
    setStopRecurringLoading(true);
    try {
      await patch(`/requests/${req.id}/stop-recurring`, {});
      // reload parent by closing — parent list refresh will update it
      onClose();
    } catch (err) {
      alert(err?.message || "Failed to stop recurring.");
    } finally {
      setStopRecurringLoading(false);
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];

  const actionLabel = isManagement ? "Management Action" : isRM?"RM Action":isHOD?"HOD Action":isDeptHOD?"Dept HOD Action":"";

  const roleBadgeCls =
    isRM         ? "bg-blue-100 text-blue-700"   :
    isHOD        ? "bg-purple-100 text-purple-700":
    isDeptHOD    ? "bg-teal-100 text-teal-700"   :
    isManagement ? "bg-rose-100 text-rose-700"   :
    isAdmin      ? "bg-orange-100 text-orange-700":
    "bg-indigo-100 text-indigo-700";

  return (
    <>
      {lightboxData && <GalleryLightbox urls={lightboxData.urls} fileNames={lightboxData.names} startIndex={lightboxData.index} onClose={() => setLightboxData(null)} />}
      {spreadsheetPreview && <SpreadsheetPreviewModal url={spreadsheetPreview.url} fileName={spreadsheetPreview.fileName} onClose={() => setSpreadsheetPreview(null)} />}
      {pdfPreview         && <PDFPreviewModal         url={pdfPreview.url}         fileName={pdfPreview.fileName}         onClose={() => setPdfPreview(null)} />}

      {/* Checking deadline popup */}
      {showCheckingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Clock size={16} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">Set Checking Deadline</h3>
                  <p className="text-[10px] text-slate-400 font-medium">How long do you need?</p>
                </div>
              </div>
              <button onClick={() => setShowCheckingModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                <X size={16}/>
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                <Calendar size={10}/> Completion Date
              </label>
              <input
                type="date"
                min={todayStr}
                value={checkingDate}
                onChange={e => setCheckingDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-[13px] font-medium outline-none focus:ring-2 focus:ring-amber-400 transition-all cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reason / Plan</label>
              <RichTextArea
                value={checkingReason}
                onChange={e => setCheckingReason(e.target.value)}
                placeholder="e.g. Waiting for vendor quote, will complete by selected date..."
                rows={3}
              />
              <LinkPreview text={checkingReason} />
            </div>

            {checkingDate && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-[11px]">
                <AlertTriangle size={13} className="text-amber-500 flex-shrink-0"/>
                <span className="text-amber-700 font-medium">
                  Countdown starts now. Team will see days remaining.
                </span>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowCheckingModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-black text-[12px] transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleCheckingConfirm}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-[12px] transition-all active:scale-95"
              >
                Confirm Checking
              </button>
            </div>
          </div>
        </div>
      )}
      {/* HOD Approve popup — Only Approve or Approve & Forward */}
      {showHodApproveModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                {hodApproveMode && (
                  <button
                    onClick={() => { setHodApproveMode(null); setHodForwardDept(""); setHodDeptSearch(""); }}
                    className="p-1 hover:bg-slate-100 rounded-lg transition-colors mr-0.5"
                  >
                    <ChevronRight size={15} className="text-slate-400 rotate-180"/>
                  </button>
                )}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${hodApproveMode === "forward" ? "bg-blue-100" : "bg-emerald-100"}`}>
                  {hodApproveMode === "forward" ? <Forward size={15} className="text-blue-600"/> : <CheckCircle size={15} className="text-emerald-600"/>}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">
                    {hodApproveMode === "forward" ? "Forward to Department" : "Approve Request"}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {hodApproveMode === "forward"
                      ? hodForwardDept ? `Selected: ${hodForwardDept}` : "Select a department"
                      : "Choose how to approve"}
                  </p>
                </div>
              </div>
              <button onClick={closeHodModal} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                <X size={16}/>
              </button>
            </div>

            {/* Step 1: Choose action */}
            {!hodApproveMode && (
              <div className="p-4 space-y-2">
                <button
                  onClick={() => { handleApproval("Approved"); closeHodModal(); }}
                  disabled={approvalLoading}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 disabled:opacity-50 transition-all text-left group"
                >
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-200 transition-colors">
                    <CheckCircle size={17} className="text-emerald-600"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-black text-slate-800">Only Approve</p>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Approve this request without forwarding</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 flex-shrink-0 group-hover:text-emerald-400 transition-colors"/>
                </button>

                <button
                  onClick={() => setHodApproveMode("forward")}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-left group"
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                    <Forward size={17} className="text-blue-600"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-black text-slate-800">Approve &amp; Forward to Dept</p>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Approve and forward to another department</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 flex-shrink-0 group-hover:text-blue-400 transition-colors"/>
                </button>

                <button onClick={closeHodModal} className="w-full py-2.5 text-slate-400 font-black text-[12px] hover:text-slate-600 transition-colors">
                  Cancel
                </button>
              </div>
            )}

            {/* Step 2: Forward — dept list with search */}
            {hodApproveMode === "forward" && (
              <div className="flex flex-col" style={{ maxHeight: "420px" }}>
                <div className="px-3 py-2.5 border-b border-slate-100">
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                    <input
                      value={hodDeptSearch}
                      onChange={e => setHodDeptSearch(e.target.value)}
                      placeholder="Search department..."
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[12px] outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                    />
                  </div>
                </div>

                <div className="overflow-y-auto flex-1 p-2">
                  {DEPARTMENTS.filter(d => d !== req?.assignedDept && (!hodDeptSearch || d.toLowerCase().includes(hodDeptSearch.toLowerCase()))).map(d => (
                    <button
                      key={d}
                      onClick={() => setHodForwardDept(d)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl mb-1 transition-all text-left border-2 ${hodForwardDept === d ? "bg-blue-50 border-blue-300" : "border-transparent hover:bg-slate-50 hover:border-slate-200"}`}
                    >
                      <div className={`w-5 h-5 rounded-full flex-shrink-0 border-2 flex items-center justify-center transition-all ${hodForwardDept === d ? "border-blue-500 bg-blue-500" : "border-slate-300"}`}>
                        {hodForwardDept === d && <div className="w-2 h-2 bg-white rounded-full"/>}
                      </div>
                      <p className="text-[12px] font-bold text-slate-700">{d}</p>
                    </button>
                  ))}
                </div>

                <div className="px-3 py-3 border-t border-slate-100 flex gap-2">
                  <button
                    onClick={() => { setHodApproveMode(null); setHodForwardDept(""); setHodDeptSearch(""); }}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-black text-[12px] transition-all active:scale-95"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleHodForwardConfirm}
                    disabled={approvalLoading || !hodForwardDept}
                    className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl font-black text-[12px] transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    {approvalLoading
                      ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                      : <Forward size={12}/>}
                    {hodForwardDept ? `Approve & Forward to ${hodForwardDept}` : "Approve & Forward"}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* DeptHOD Approve popup — multi-step */}
      {showDeptHodApproveModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                {deptHodMode && (
                  <button
                    onClick={() => { setDeptHodMode(null); setDeptHodSelectedPersons([]); setDeptHodForwardDept(""); setDeptUsersSearch(""); }}
                    className="p-1 hover:bg-slate-100 rounded-lg transition-colors mr-0.5"
                  >
                    <ChevronRight size={15} className="text-slate-400 rotate-180"/>
                  </button>
                )}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${deptHodMode === "internal" ? "bg-teal-100" : deptHodMode === "forward" ? "bg-blue-100" : "bg-emerald-100"}`}>
                  {deptHodMode === "internal" ? <Users size={15} className="text-teal-600"/> : deptHodMode === "forward" ? <Forward size={15} className="text-blue-600"/> : <CheckCircle size={15} className="text-emerald-600"/>}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">
                    {deptHodMode === "internal" ? "Assign Internal" : deptHodMode === "forward" ? "Forward to Department" : "Approve Request"}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {deptHodMode === "internal"
                      ? deptHodSelectedPersons.length > 0 ? `${deptHodSelectedPersons.length} person${deptHodSelectedPersons.length > 1 ? "s" : ""} selected` : "Select one or more people"
                      : deptHodMode === "forward" ? "Select a department"
                      : "Choose how to approve"}
                  </p>
                </div>
              </div>
              <button onClick={closeDeptHodModal} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                <X size={16}/>
              </button>
            </div>

            {/* Step 1: Choose action */}
            {!deptHodMode && (
              <div className="p-4 space-y-2">
                <button
                  onClick={handleDeptHodApproveOnly}
                  disabled={approvalLoading}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all text-left group disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-200 transition-colors">
                    {approvalLoading
                      ? <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"/>
                      : <CheckCircle size={17} className="text-emerald-600"/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-black text-slate-800">Approve Only</p>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Approve without assigning or forwarding</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 flex-shrink-0 group-hover:text-emerald-400 transition-colors"/>
                </button>

                <button
                  onClick={handleSelectInternalMode}
                  disabled={approvalLoading}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-slate-200 hover:border-teal-300 hover:bg-teal-50/50 transition-all text-left group disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-teal-200 transition-colors">
                    <Users size={17} className="text-teal-600"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-black text-slate-800">Approve &amp; Assign Internal</p>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Approve and assign to people in your department</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 flex-shrink-0 group-hover:text-teal-400 transition-colors"/>
                </button>

                <button
                  onClick={() => setDeptHodMode("forward")}
                  disabled={approvalLoading}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-left group disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                    <Forward size={17} className="text-blue-600"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-black text-slate-800">Approve &amp; Forward Dept</p>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Approve and forward to another department</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 flex-shrink-0 group-hover:text-blue-400 transition-colors"/>
                </button>

                <button onClick={closeDeptHodModal} disabled={approvalLoading} className="w-full py-2.5 text-slate-400 font-black text-[12px] hover:text-slate-600 transition-colors disabled:opacity-50">
                  Cancel
                </button>
              </div>
            )}

            {/* Step 2a: Assign Internal — multi-select employee list */}
            {deptHodMode === "internal" && (
              <div className="flex flex-col" style={{ maxHeight: "400px" }}>
                <div className="px-3 py-2.5 border-b border-slate-100">
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                    <input
                      value={deptUsersSearch}
                      onChange={e => setDeptUsersSearch(e.target.value)}
                      placeholder="Search employees..."
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[12px] outline-none focus:ring-2 focus:ring-teal-400 transition-all"
                    />
                  </div>
                </div>

                <div className="overflow-y-auto flex-1 p-2">
                  {loadingDeptUsers ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="w-6 h-6 border-2 border-teal-400 border-t-transparent rounded-full animate-spin"/>
                    </div>
                  ) : (() => {
                    const term = deptUsersSearch.toLowerCase();
                    const filtered = deptUsersForApproval.filter(u =>
                      !term || u.name.toLowerCase().includes(term) || (u.designation || "").toLowerCase().includes(term)
                    );
                    return filtered.length === 0 ? (
                      <p className="text-center py-8 text-[12px] text-slate-400">No employees found</p>
                    ) : filtered.map(u => {
                      const selected = deptHodSelectedPersons.some(p => p.empId === u.empId);
                      return (
                        <button
                          key={u.empId}
                          onClick={() => setDeptHodSelectedPersons(prev =>
                            selected ? prev.filter(p => p.empId !== u.empId) : [...prev, { empId: u.empId, name: u.name }]
                          )}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-all text-left ${selected ? "bg-teal-50 border border-teal-200" : "hover:bg-slate-50 border border-transparent"}`}
                        >
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border-2 transition-all ${selected ? "bg-teal-500 border-teal-500" : "border-slate-300"}`}>
                            {selected && <CheckCircle size={11} className="text-white"/>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-bold text-slate-800 truncate">{u.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{u.designation || u.role}</p>
                          </div>
                        </button>
                      );
                    });
                  })()}
                </div>

                <div className="px-3 py-3 border-t border-slate-100 flex gap-2">
                  <button
                    onClick={() => { setDeptHodMode(null); setDeptHodSelectedPersons([]); setDeptUsersSearch(""); }}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-black text-[12px] transition-all active:scale-95"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleDeptHodApproveConfirm}
                    disabled={approvalLoading || deptHodSelectedPersons.length === 0}
                    className="flex-1 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white rounded-xl font-black text-[12px] transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    {approvalLoading
                      ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                      : <Send size={12}/>}
                    {deptHodSelectedPersons.length > 0
                      ? `Send to ${deptHodSelectedPersons.length} person${deptHodSelectedPersons.length > 1 ? "s" : ""}`
                      : "Send"}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2b: Forward Dept — single-select dept list */}
            {deptHodMode === "forward" && (
              <div className="flex flex-col" style={{ maxHeight: "400px" }}>
                <div className="overflow-y-auto flex-1 p-2">
                  {DEPARTMENTS.filter(d => d !== req?.assignedDept).map(d => (
                    <button
                      key={d}
                      onClick={() => setDeptHodForwardDept(d)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl mb-1 transition-all text-left border-2 ${deptHodForwardDept === d ? "bg-blue-50 border-blue-300" : "border-transparent hover:bg-slate-50 hover:border-slate-200"}`}
                    >
                      <div className={`w-5 h-5 rounded-full flex-shrink-0 border-2 flex items-center justify-center transition-all ${deptHodForwardDept === d ? "border-blue-500 bg-blue-500" : "border-slate-300"}`}>
                        {deptHodForwardDept === d && <div className="w-2 h-2 bg-white rounded-full"/>}
                      </div>
                      <p className="text-[12px] font-bold text-slate-700">{d} Department</p>
                    </button>
                  ))}
                </div>

                <div className="px-3 py-3 border-t border-slate-100 flex gap-2">
                  <button
                    onClick={() => { setDeptHodMode(null); setDeptHodForwardDept(""); }}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-black text-[12px] transition-all active:scale-95"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleDeptHodApproveConfirm}
                    disabled={approvalLoading || !deptHodForwardDept}
                    className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl font-black text-[12px] transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    {approvalLoading
                      ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                      : <Forward size={12}/>}
                    {deptHodForwardDept ? `Approve & Forward to ${deptHodForwardDept}` : "Approve & Forward"}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      <div className="fixed inset-0 z-50 flex md:bg-slate-900/70 md:backdrop-blur-sm md:items-center md:justify-center md:p-4">
        <div className="bg-white w-full h-full flex flex-col md:h-auto md:max-h-[95dvh] md:rounded-[2rem] md:max-w-4xl md:shadow-2xl md:border md:border-slate-200">

          {/* Header */}
          <div className="p-3 md:p-4 border-b flex justify-between items-center bg-slate-50/50 flex-shrink-0 md:rounded-t-[2rem]">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isRequestorMode?"bg-indigo-100 text-indigo-600":isManagement?"bg-rose-100 text-rose-600":"bg-blue-100 text-blue-600"}`}>
                {isRequestorMode ? <Bell size={15}/> : isManagement ? <ShieldCheck size={14}/> : <Send size={14}/>}
              </div>
              <h2 className="text-sm sm:text-lg font-black uppercase tracking-tighter text-slate-800 truncate max-w-[55vw] sm:max-w-none">#{req?.id} — {req?.purpose}</h2>
              {req?.forwarded && <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black"><Forward size={10}/> Forwarded</span>}
              {isClosed && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-black">🔒 Closed</span>}
              {isPendingAck && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black">⏳ Pending Acknowledgement</span>}
              {req?.reopenedAt && !isClosed && <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-[10px] font-black"><RefreshCw size={9}/> Reopened</span>}
              {req?.isRecurring && <span className="flex items-center gap-1 px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full text-[10px] font-black">🔁 Recurring</span>}
              {isOwnRequest && !isRequestorMode && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black">Your Request</span>}
              {isCcUser && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black">📋 CC Viewer</span>}
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${roleBadgeCls}`}>{currentUser?.dept} Department</span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => setShowChat(true)} className="md:hidden flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-full text-[11px] font-black transition-colors">
                <MessageSquare size={13}/>
                Activity
              </button>
              <button onClick={onClose} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors"><X size={20}/></button>
            </div>
          </div>

          {/* Body */}
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">

            {/* LEFT PANEL */}
            <div className={`overflow-y-auto overflow-x-hidden p-4 sm:p-5 space-y-3 pb-6 md:pb-8 min-h-0 md:flex md:flex-col md:w-[48%] md:flex-none md:border-r md:border-slate-200 ${showChat ? "hidden" : "flex flex-col flex-1 border-b border-slate-200"}`}>

              <ApprovalProgress
                rmStatus={req?.rmStatus}           hodStatus={req?.hodStatus}
                assignedRmStatus={req?.assignedRmStatus} assignedHodStatus={req?.assignedHodStatus}
                deptHodStatus={req?.deptHodStatus}  managementStatus={req?.managementStatus}
                isClosed={isClosed}
                dept={req?.dept}                   assignedDept={req?.assignedDept}
              />

              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1 pt-1"><User size={11}/> User Information</p>

              <div className="grid grid-cols-2 gap-2">
                {[{label:"Date",value:req?.date},{label:"User ID",value:req?.empId},{label:"Name",value:req?.name},{label:"Department",value:req?.dept},{label:"Designation",value:req?.designation},{label:"Location",value:req?.location}].map((item) => (
                  <div key={item.label} className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">{item.label}</p>
                    <p className="font-bold text-slate-800 text-[12px]">{item.value}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1 ml-0.5">Request Title</p>
                <div className="w-full bg-slate-200 p-3 rounded-xl text-center font-bold text-slate-500 text-[12px] border border-slate-300 cursor-not-allowed select-none break-all overflow-hidden">
                  <span className="text-slate-400 text-[11px]">🔒 </span>{req?.purpose}
                </div>
              </div>

              <div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1 ml-0.5">
                  Assigned Department
                  {deptChanged && (canChangeDept || canUserForward || canAssignedPersonActions) && <span className="ml-1 text-blue-600 normal-case font-bold text-[9px]">(<span className="line-through text-slate-400">{req?.assignedDept}</span> → <b>{selectedDept}</b>)</span>}
                </p>

                {(canChangeDept || canUserForward || canAssignedPersonActions) ? (() => {
                  const selCount = fwdPersons.size;
                  const users    = fwdDeptUsers[selectedDept] || [];
                  const filteredDepts   = DEPARTMENTS.filter(d => d.toLowerCase().includes(fwdDeptSearch.toLowerCase()));
                  const filteredPersons = users.filter(u =>
                    u.name?.toLowerCase().includes(fwdPersonSearch.toLowerCase()) ||
                    u.empId?.toLowerCase().includes(fwdPersonSearch.toLowerCase())
                  );
                  return (
                    <div>
                      {/* Trigger */}
                      <button
                        ref={fwdPickerRef}
                        type="button"
                        onClick={() => {
                          const r = fwdPickerRef.current?.getBoundingClientRect();
                          if (r) setFwdPickerRect(r);
                          setFwdPickerOpen(p => !p);
                        }}
                        className={`w-full flex items-center justify-between gap-2 p-3 rounded-xl font-bold text-sm border-none transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                          deptChanged ? "bg-blue-50 text-blue-700 ring-2 ring-blue-300" : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        <span className="truncate flex-1 text-left">
                          {selectedDept
                            ? selCount > 0 ? `${selectedDept} · ${selCount} person${selCount > 1 ? "s" : ""} selected` : selectedDept
                            : "Select department…"}
                        </span>
                        <span className="flex items-center gap-1 shrink-0">
                          {selectedDept && (
                            <span
                              role="button"
                              tabIndex={-1}
                              onMouseDown={e => { e.stopPropagation(); setSelectedDept(req?.assignedDept || ""); setFwdPersons(new Set()); setFwdPickerOpen(false); fwdDeptUsersRef.current = {}; setFwdDeptUsers({}); }}
                              className="text-slate-400 hover:text-red-400 transition-colors"
                            >
                              <X size={12} />
                            </span>
                          )}
                          <ChevronDown size={15} className={`text-slate-400 transition-transform duration-150 ${fwdPickerOpen ? "rotate-180" : ""}`} />
                        </span>
                      </button>

                      {/* Portal: two-column panel */}
                      {fwdPickerOpen && fwdPickerRect && createPortal(
                        (() => {
                          const spaceBelow = window.innerHeight - fwdPickerRect.bottom;
                          const panelH = 310;
                          const top = spaceBelow >= panelH ? fwdPickerRect.bottom + 4 : fwdPickerRect.top - panelH - 4;
                          const panelStyle = { position: "fixed", top, left: fwdPickerRect.left, width: Math.max(fwdPickerRect.width, 480), zIndex: 9999 };
                          return (
                            <div ref={fwdPickerPanelRef} style={panelStyle} className="bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex">

                              {/* Left: dept list */}
                              <div className="w-52 border-r border-slate-100 flex flex-col">
                                <div className="p-2 border-b border-slate-100">
                                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus-within:border-blue-400 transition-colors">
                                    <Search size={13} className="shrink-0 text-slate-400" />
                                    <input autoFocus type="text" value={fwdDeptSearch} onChange={e => setFwdDeptSearch(e.target.value)} placeholder="Search dept…"
                                      className="flex-1 text-[12px] font-medium bg-transparent outline-none text-slate-700 placeholder-slate-400 min-w-0" />
                                    {fwdDeptSearch && <button type="button" onClick={() => setFwdDeptSearch("")}><X size={11} className="text-slate-400 hover:text-slate-600" /></button>}
                                  </div>
                                </div>
                                <div className="overflow-y-auto max-h-64 py-1">
                                  {filteredDepts.length === 0
                                    ? <p className="text-[11px] text-slate-400 text-center py-4">No results</p>
                                    : filteredDepts.map(dept => {
                                      const isSel = selectedDept === dept;
                                      return (
                                        <button key={dept} type="button"
                                          onClick={() => selectFwdDept(dept)}
                                          className={`w-full flex items-center gap-2 text-left px-3 py-2.5 text-[12px] transition-colors ${isSel ? "bg-blue-50 text-blue-700 font-black" : "text-slate-700 font-medium hover:bg-slate-50 hover:text-blue-700"}`}
                                        >
                                          <span className="truncate flex-1">{dept}</span>
                                          {isSel && <Check size={13} className="shrink-0 text-blue-600" strokeWidth={3} />}
                                        </button>
                                      );
                                    })
                                  }
                                </div>
                              </div>

                              {/* Right: person list */}
                              <div className="flex-1 flex flex-col min-w-0">
                                {!selectedDept ? (
                                  <div className="flex-1 flex items-center justify-center p-6">
                                    <p className="text-[11px] text-slate-300 italic text-center">Select a department<br/>to assign persons</p>
                                  </div>
                                ) : (
                                  <>
                                    <div className="p-2 border-b border-slate-100">
                                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus-within:border-blue-400 transition-colors">
                                        <Search size={13} className="shrink-0 text-slate-400" />
                                        <input type="text" value={fwdPersonSearch} onChange={e => setFwdPersonSearch(e.target.value)} placeholder="Search person…"
                                          className="flex-1 text-[12px] font-medium bg-transparent outline-none text-slate-700 placeholder-slate-400 min-w-0" />
                                        {fwdPersonSearch && <button type="button" onClick={() => setFwdPersonSearch("")}><X size={11} className="text-slate-400 hover:text-slate-600" /></button>}
                                      </div>
                                    </div>
                                    {selCount > 0 && (
                                      <div className="flex items-center justify-between px-3 py-1.5 bg-blue-50 border-b border-blue-100">
                                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-wide">{selCount} selected</span>
                                        <button type="button" onClick={() => setFwdPersons(new Set())} className="text-[10px] font-black text-red-500 hover:text-red-700">Clear all</button>
                                      </div>
                                    )}
                                    <div className="overflow-y-auto flex-1 max-h-52 py-1">
                                      {fwdLoadingDept ? (
                                        <div className="flex items-center gap-2 px-4 py-3 text-[11px] text-slate-400"><Spinner size={13} /> Loading…</div>
                                      ) : filteredPersons.length === 0 ? (
                                        <p className="text-[11px] text-slate-400 text-center py-4 italic">{fwdPersonSearch ? "No results" : "No RM/HOD users found."}</p>
                                      ) : filteredPersons.map(u => {
                                        const isChecked = fwdPersons.has(u.empId);
                                        return (
                                          <button key={u.empId} type="button"
                                            onClick={() => setFwdPersons(prev => { const n = new Set(prev); n.has(u.empId) ? n.delete(u.empId) : n.add(u.empId); return n; })}
                                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${isChecked ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"}`}
                                          >
                                            <span className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isChecked ? "bg-blue-600 border-blue-600" : "border-slate-300"}`}>
                                              {isChecked && <Check size={9} className="text-white" strokeWidth={3} />}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                              <p className="text-[12px] font-semibold truncate">{u.name}</p>
                                              <div className="flex items-center gap-1 flex-wrap mt-0.5">
                                                {(u.roles?.length ? [...new Set(u.roles.map(r => r.role))] : [u.role]).filter(Boolean).map(r => (
                                                  <span key={r} className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700">{r}</span>
                                                ))}
                                                {u.designation && <span className="text-[9px] text-slate-400 truncate">{u.designation}</span>}
                                              </div>
                                            </div>
                                            <span className="text-[9px] text-slate-300 flex-shrink-0">{u.empId}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                    <div className="p-2 border-t border-slate-100">
                                      <button type="button"
                                        onClick={() => { setFwdPickerOpen(false); setFwdDeptSearch(""); setFwdPersonSearch(""); }}
                                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-black rounded-xl transition-colors"
                                      >
                                        Done
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })(),
                        document.body
                      )}
                    </div>
                  );
                })() : (
                  <div className="p-3 rounded-xl font-bold text-sm text-center bg-slate-100 text-slate-500">
                    {selectedDept || "—"}
                  </div>
                )}
              </div>

              {(req?.ccDepts || req?.ccPersonNames) && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-[9px] text-amber-600 font-black uppercase tracking-wider mb-1.5 flex items-center gap-1">📋 CC'd (Copy To — view &amp; chat only)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {req.ccDepts?.split(",").map(d => (
                      <span key={d} className="px-2.5 py-1 rounded-full text-[11px] font-bold border bg-amber-100 text-amber-700 border-amber-200">{d.trim()}</span>
                    ))}
                    {req.ccPersonNames?.split(",").map(n => (
                      <span key={n} className="px-2.5 py-1 rounded-full text-[11px] font-bold border bg-white text-amber-700 border-amber-200">{n.trim()}</span>
                    ))}
                  </div>
                </div>
              )}

              {req?.assignedDepts && req.assignedDepts.split(",").length > 1 && (
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1 ml-0.5">All Assigned Departments</p>
                  <div className="flex flex-wrap gap-1.5">
                    {req.assignedDepts.split(",").map((d) => (
                      <span key={d} className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${d.trim() === req.assignedDept ? "bg-indigo-100 text-indigo-700 border-indigo-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                        {d.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {req?.assignedPersonName && (
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1 ml-0.5">Assigned Person(s)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {req.assignedPersonName.split(",").map((name) => (
                      <span key={name} className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[11px] font-bold">
                        <User size={10}/> {name.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1 ml-0.5">Request Description</p>
                <div className="w-full bg-slate-50 p-3 rounded-xl text-slate-600 border border-slate-200 leading-relaxed text-[12px] break-words [&_ul]:list-disc [&_ul]:list-inside [&_ul]:my-0.5 [&_mark]:bg-yellow-200 [&_mark]:rounded-sm [&_b]:font-bold [&_strong]:font-bold [&_u]:underline [&_a]:text-blue-500 [&_a]:underline [&_a]:break-all [&_a:hover]:text-blue-700 [&_table]:w-full [&_table]:border-collapse [&_table]:my-2 [&_table]:text-[11px] [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-100 [&_th]:px-2 [&_th]:py-1.5 [&_th]:font-bold [&_th]:text-left [&_th]:whitespace-normal [&_td]:border [&_td]:border-slate-300 [&_td]:px-2 [&_td]:py-1.5 [&_td]:whitespace-normal whitespace-pre-wrap">
                  {req?.description
                    ? isHtmlContent(req.description)
                      ? <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(req.description) }} />
                      : renderRichText(req.description)
                    : "No description provided."}
                </div>
              </div>

              {/* ── Thread / Linked Requests ──────────────────────────────── */}
              {req?.requestorRole !== "broadcast" && (
                <div>
                  <div className="flex items-center justify-between mb-2 ml-0.5">
                    <div className="flex items-center gap-1.5">
                      <Link2 size={11} className="text-teal-500" />
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                        Linked Requests
                        {threadMembers.length > 0 && (
                          <span className="ml-1 text-teal-500 normal-case font-black">({threadMembers.length})</span>
                        )}
                      </p>
                    </div>
                    {onAddToThread && (
                      <button
                        onClick={() => onAddToThread(req.id)}
                        className="flex items-center gap-1 text-[10px] font-black text-teal-600 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2 py-1 rounded-lg transition-all active:scale-95"
                      >
                        <Plus size={10} /> Add to Thread
                      </button>
                    )}
                  </div>

                  {req?.threadParentId != null && (
                    <p className="text-[10px] text-teal-600 font-bold mb-1.5 ml-0.5">
                      ↳ Reply in thread #{threadRootId}
                    </p>
                  )}

                  {threadLoading ? (
                    <p className="text-[11px] text-slate-400 italic px-1">Loading…</p>
                  ) : threadMembers.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic px-1">No linked requests yet.</p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {threadMembers.map(m => (
                        <button
                          key={m.id}
                          onClick={() => onOpenRequest?.(m)}
                          className="w-full text-left flex items-center justify-between bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl px-3 py-2 transition-all active:scale-[0.99]"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {m.id === threadRootId && (
                              <span className="flex-shrink-0 text-[9px] font-black text-teal-700 bg-teal-200 px-1.5 py-0.5 rounded-full">ROOT</span>
                            )}
                            <span className="text-[10px] font-black text-teal-700 flex-shrink-0">#{m.id}</span>
                            <span className="text-[11px] font-bold text-slate-700 truncate">{m.purpose}</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                              m.isClosed ? "bg-slate-100 text-slate-500" :
                              m.assignedStatus === "Open" ? "bg-blue-100 text-blue-600" :
                              m.assignedStatus?.includes("Pending") ? "bg-amber-100 text-amber-600" :
                              "bg-green-100 text-green-600"
                            }`}>{m.assignedStatus}</span>
                            <ChevronRight size={11} className="text-teal-400" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1 ml-0.5">
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                    Attached Files {req?.fileUrls?.length > 0 && <span className="text-indigo-400 normal-case">({req.fileUrls.length})</span>}
                  </p>
                  {req?.fileUrls?.length > 1 && (
                    <button
                      onClick={handleBulkDownload}
                      disabled={bulkDownloading}
                      className="flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-2 py-1 rounded-lg font-black text-[10px] transition-all active:scale-95 disabled:opacity-60"
                    >
                      {bulkDownloading ? (
                        <><div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/> Zipping...</>
                      ) : (
                        <><Download size={11}/> Download All</>
                      )}
                    </button>
                  )}
                </div>
                <div className="border-2 border-dashed border-blue-100 p-3 flex justify-center items-center rounded-xl bg-blue-50/30 min-h-[90px]">
                  {req?.fileUrls?.length > 0 ? (
                    <div className="flex flex-wrap gap-3 justify-center">
                      {req.fileUrls.map((url, idx) => {
                        const name = req.fileNames?.[idx] || "";
                        return isImageFile(url, name) ? (
                          <div key={idx} className="relative group cursor-pointer" onClick={() => {
                            const imageUrls   = (req.fileUrls || []).filter((u, i) => isImageFile(u, req.fileNames?.[i] || ""));
                            const imageNames  = (req.fileUrls || []).map((u, i) => req.fileNames?.[i] || `Image ${i + 1}`).filter((_, i) => isImageFile((req.fileUrls || [])[i], req.fileNames?.[i] || ""));
                            setLightboxData({ urls: imageUrls, names: imageNames, index: imageUrls.indexOf(url) });
                          }}>
                            <img src={resolveFileUrl(url)} alt={name || "attachment"} className="h-24 w-24 object-cover rounded-xl shadow-md border-2 border-white group-hover:brightness-90 transition-all"/>
                            <div className="absolute inset-0 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl bg-black/20">
                              <div className="bg-black/60 rounded-full p-1"><ZoomIn size={14} className="text-white"/></div>
                              <a href={resolveFileUrl(url)} download={name || "image"} onClick={e => e.stopPropagation()} className="bg-black/60 hover:bg-emerald-600 rounded-full p-1 transition-colors" title="Download"><Download size={14} className="text-white"/></a>
                            </div>
                          </div>
                        ) : isSpreadsheetFile(url, name) ? (
                          <button
                            key={idx}
                            onClick={() => setSpreadsheetPreview({ url, fileName: name || "attachment" })}
                            className="flex items-center gap-2 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 font-bold text-[11px] px-3 py-2 rounded-xl transition-all active:scale-95"
                          >
                            <FileSpreadsheet size={14} className="text-teal-600 flex-shrink-0" />
                            <span className="truncate max-w-[160px]">{name || "View spreadsheet"}</span>
                            <Eye size={11} className="text-teal-400 flex-shrink-0" />
                          </button>
                        ) : isPdfFile(url, name) ? (
                          <button
                            key={idx}
                            onClick={() => setPdfPreview({ url, fileName: name || "document.pdf" })}
                            className="flex items-center gap-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-[11px] px-3 py-2 rounded-xl transition-all active:scale-95"
                          >
                            <FileText size={14} className="text-red-500 flex-shrink-0" />
                            <span className="truncate max-w-[160px]">{name || "View PDF"}</span>
                            <Eye size={11} className="text-red-400 flex-shrink-0" />
                          </button>
                        ) : (
                          <a key={idx} href={resolveFileUrl(url)} download={name || "attachment"} className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[11px] px-3 py-2 rounded-xl transition-all">
                            <Paperclip size={14} className="text-slate-400 flex-shrink-0" />
                            <span className="truncate max-w-[160px]">{name || "Download attachment"}</span>
                          </a>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-slate-300"><ImageOff size={28}/><span className="text-[10px] font-bold text-slate-400">No attachment</span></div>
                  )}
                </div>
              </div>

              {/* Approval action — hidden when isClosed */}
              {(canApprove || canUserCheck || canUserForward || canAssignedPersonActions) && (
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{canApprove ? actionLabel : (canUserForward || canAssignedPersonActions) ? "Forward Request" : "Team Action"}</p>

                  {canApprove ? (
                    <>
                      <div className={`grid gap-1.5 ${
                        req?.dept !== req?.assignedDept
                          ? (req?.managementStatus && req.managementStatus !== "--" ? "grid-cols-6" : "grid-cols-5")
                          : (req?.managementStatus && req.managementStatus !== "--" ? "grid-cols-4" : "grid-cols-3")
                      }`}>
                        {[
                          {label:"RM",status:req?.rmStatus,date:req?.rmDate},
                          {label:"HOD",status:req?.hodStatus,date:req?.hodDate},
                          ...(req?.dept !== req?.assignedDept ? [
                            {label:"Assign RM",status:req?.assignedRmStatus,date:req?.assignedRmDate},
                            {label:"Assign HOD",status:req?.assignedHodStatus,date:req?.assignedHodDate},
                          ] : []),
                          ...(req?.managementStatus && req.managementStatus !== "--" ? [{label:"Mgmt",status:req?.managementStatus,date:req?.managementDate}] : []),
                          {label:"DeptHOD",status:req?.deptHodStatus,date:req?.deptHodDate},
                        ].map((s) => (
                          <div key={s.label} className="bg-slate-50 rounded-xl p-2 border border-slate-100 text-center">
                            <p className="text-[8px] text-slate-600 font-bold uppercase mb-1">{s.label}</p>
                            <StatusBadge status={s.status} date={s.date}/>
                          </div>
                        ))}
                      </div>
                      <div
                        onKeyDown={(e) => {
                          if (e.key === "Tab" && currentUser?.dept === "TA Committee") {
                            e.preventDefault();
                            setApprovalComment("Kindly account and process the same and share ledger statement");
                          }
                        }}
                      >
                        <RichTextArea
                          value={approvalComment}
                          onChange={(e) => setApprovalComment(e.target.value)}
                          placeholder="Add your official comments here..."
                          rows={2}
                          disabled={approvalLoading}
                        />
                        {currentUser?.dept === "TA Committee" && !approvalComment && (
                          <button
                            type="button"
                            onClick={() => setApprovalComment("Kindly account and process the same and share ledger statement")}
                            className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-blue-600 transition-colors group"
                          >
                            <span className="px-1 py-0.5 rounded border border-slate-200 bg-slate-50 font-mono text-[9px] group-hover:border-blue-300 group-hover:bg-blue-50 transition-colors">Tab</span>
                            <span className="italic truncate max-w-[280px]">"Kindly account and process the same and share ledger statement"</span>
                          </button>
                        )}
                      </div>
                      <LinkPreview text={approvalComment} />
                      {(() => {
                        const isActedApproved = myApprovalStatus === "Approved" || myApprovalStatus === "Forwarded";
                        const isActedChecking = myApprovalStatus === "Checking";
                        // After Approved/Forwarded: hide Checking + Reject
                        // After Checking: hide Checking only
                        // After Rejected: ticket is closed → canApprove = false → section won't render
                        const showChecking = !isActedApproved && !isActedChecking;
                        const showReject   = !isActedApproved;
                        const cols = showChecking && showReject ? "grid-cols-3" : (showChecking || showReject) ? "grid-cols-2" : "grid-cols-1";
                        return (
                          <div className={`grid ${cols} gap-2`}>
                            {/* Approve / Forward */}
                            {deptChanged ? (
                              <button onClick={() => {
                                const selUsers = (fwdDeptUsers[selectedDept] || []).filter(u => fwdPersons.has(u.empId));
                                const extras = selUsers.length ? { assignedPersonEmpId: selUsers.map(u => u.empId).join(","), assignedPersonName: selUsers.map(u => u.name).join(",") } : {};
                                handleApproval("Forwarded", null, null, extras);
                              }} disabled={approvalLoading || isActedApproved} className="bg-blue-500 disabled:opacity-50 text-white py-2.5 rounded-xl font-black text-[11px] hover:bg-blue-600 shadow-md uppercase transition-all active:scale-95 flex items-center justify-center gap-1.5 relative">
                                {pendingDecision === "Forwarded" ? <Spinner size={13}/> : isActedApproved ? <CheckCircle size={13}/> : <Forward size={13}/>} Forward
                                {isActedApproved && <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center"><CheckCircle size={10} className="text-blue-500"/></span>}
                              </button>
                            ) : isDeptHOD ? (
                              <button onClick={() => setShowDeptHodApproveModal(true)} disabled={approvalLoading || isActedApproved} className="bg-emerald-500 disabled:opacity-50 text-white py-2.5 rounded-xl font-black text-[11px] hover:bg-emerald-600 shadow-md uppercase transition-all active:scale-95 flex items-center justify-center gap-1.5 relative">
                                <CheckCircle size={13}/> Approve
                                {isActedApproved && <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center"><CheckCircle size={10} className="text-emerald-500"/></span>}
                              </button>
                            ) : isHOD ? (
                              <button onClick={() => setShowHodApproveModal(true)} disabled={approvalLoading || isActedApproved} className="bg-emerald-500 disabled:opacity-50 text-white py-2.5 rounded-xl font-black text-[11px] hover:bg-emerald-600 shadow-md uppercase transition-all active:scale-95 flex items-center justify-center gap-1.5 relative">
                                {pendingDecision === "Approved" ? <Spinner size={13}/> : <CheckCircle size={13}/>} Approve
                                {isActedApproved && <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center"><CheckCircle size={10} className="text-emerald-500"/></span>}
                              </button>
                            ) : isAssignedDeptUser ? (
                              <button onClick={() => setShowDeptHodApproveModal(true)} disabled={approvalLoading || isActedApproved} className="bg-emerald-500 disabled:opacity-50 text-white py-2.5 rounded-xl font-black text-[11px] hover:bg-emerald-600 shadow-md uppercase transition-all active:scale-95 flex items-center justify-center gap-1.5 relative">
                                <CheckCircle size={13}/> Approve
                                {isActedApproved && <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center"><CheckCircle size={10} className="text-emerald-500"/></span>}
                              </button>
                            ) : (
                              <button onClick={() => handleApproval("Approved")} disabled={approvalLoading || isActedApproved} className="bg-emerald-500 disabled:opacity-50 text-white py-2.5 rounded-xl font-black text-[11px] hover:bg-emerald-600 shadow-md uppercase transition-all active:scale-95 flex items-center justify-center gap-1.5 relative">
                                {pendingDecision === "Approved" ? <Spinner size={13}/> : <CheckCircle size={13}/>} Approve
                                {isActedApproved && <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center"><CheckCircle size={10} className="text-emerald-500"/></span>}
                              </button>
                            )}
                            {/* Checking — hidden after approve or already checking */}
                            {showChecking && (
                              <button onClick={() => setShowCheckingModal(true)} disabled={approvalLoading} className="bg-amber-500 disabled:opacity-50 text-white py-2.5 rounded-xl font-black text-[11px] hover:bg-amber-600 shadow-md uppercase transition-all active:scale-95 flex items-center justify-center gap-1.5">
                                {pendingDecision === "Checking" ? <Spinner size={13}/> : <Clock size={13}/>} Checking
                              </button>
                            )}
                            {/* Reject — hidden after approve */}
                            {showReject && (
                              <button onClick={() => handleApproval("Rejected")} disabled={approvalLoading} className="bg-red-500 disabled:opacity-50 text-white py-2.5 rounded-xl font-black text-[11px] hover:bg-red-600 shadow-md uppercase transition-all active:scale-95 flex items-center justify-center gap-1.5">
                                {pendingDecision === "Rejected" ? <Spinner size={13}/> : <XCircle size={13}/>} Reject
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </>
                  ) : canUserForward ? (
                    /* Facilities dept — forward incoming request to another dept */
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => {
                          const selUsers = (fwdDeptUsers[selectedDept] || []).filter(u => fwdPersons.has(u.empId));
                          const extras = selUsers.length
                            ? { assignedPersonEmpId: selUsers.map(u => u.empId).join(","), assignedPersonName: selUsers.map(u => u.name).join(",") }
                            : {};
                          handleApproval("Forwarded", null, null, extras);
                        }}
                        disabled={approvalLoading || !deptChanged}
                        className="bg-blue-500 disabled:opacity-50 text-white py-2.5 rounded-xl font-black text-[11px] hover:bg-blue-600 shadow-md uppercase transition-all active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        {pendingDecision === "Forwarded" ? <Spinner size={13}/> : <Forward size={13}/>} Forward
                      </button>
                      <button onClick={() => setShowCheckingModal(true)} disabled={approvalLoading} className="bg-amber-500 disabled:opacity-50 text-white py-2.5 rounded-xl font-black text-[11px] hover:bg-amber-600 shadow-md uppercase transition-all active:scale-95 flex items-center justify-center gap-1.5">
                        {pendingDecision === "Checking" ? <Spinner size={13}/> : <Clock size={13}/>} Checking
                      </button>
                      <button onClick={() => onOpenCloseTicket(req)} className="bg-red-500 text-white py-2.5 rounded-xl font-black text-[11px] hover:bg-red-600 shadow-md uppercase transition-all active:scale-95 flex items-center justify-center gap-1.5">
                        🔒 Close
                      </button>
                    </div>
                  ) : canAssignedPersonActions ? (
                    /* Directly-assigned person — Forward (to own dept flow) + Checking + Close */
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handleApproval("Forwarded", null, null, {})}
                        disabled={approvalLoading}
                        className="bg-blue-500 disabled:opacity-50 text-white py-2.5 rounded-xl font-black text-[11px] hover:bg-blue-600 shadow-md uppercase transition-all active:scale-95 flex items-center justify-center gap-1.5"
                        title="Release to your department's RM → HOD → DeptHOD approval flow"
                      >
                        {pendingDecision === "Forwarded" ? <Spinner size={13}/> : <Forward size={13}/>} Forward
                      </button>
                      <button onClick={() => setShowCheckingModal(true)} disabled={approvalLoading} className="bg-amber-500 disabled:opacity-50 text-white py-2.5 rounded-xl font-black text-[11px] hover:bg-amber-600 shadow-md uppercase transition-all active:scale-95 flex items-center justify-center gap-1.5">
                        {pendingDecision === "Checking" ? <Spinner size={13}/> : <Clock size={13}/>} Checking
                      </button>
                      <button onClick={() => onOpenCloseTicket(req)} disabled={approvalLoading} className="bg-red-500 disabled:opacity-50 text-white py-2.5 rounded-xl font-black text-[11px] hover:bg-red-600 shadow-md uppercase transition-all active:scale-95 flex items-center justify-center gap-1.5">
                        🔒 Close
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                       <button onClick={() => setShowCheckingModal(true)} className="bg-amber-500 text-white py-2.5 rounded-xl font-black text-[11px] hover:bg-amber-600 shadow-md uppercase transition-all active:scale-95 flex items-center justify-center gap-1.5"><Clock size={13}/> Checking</button>
                       <button onClick={() => onOpenCloseTicket(req)} className="bg-red-500 text-white py-2.5 rounded-xl font-black text-[11px] hover:bg-red-600 shadow-md uppercase transition-all active:scale-95 flex items-center justify-center gap-1.5">🔒 Close Ticket</button>
                    </div>
                  )}
                </div>
              )}

              {/* Forwarded-away notice — shown to RM/HOD/DeptHOD whose dept is no longer the assigned dept */}
              {isForwardedAway && (isRM || isHOD || isDeptHOD) && !isClosed && (
                <div className="border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                    <Forward size={16} className="text-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black text-blue-700 uppercase tracking-wide">Forwarded to {req?.assignedDept}</p>
                      <p className="text-[10px] text-blue-500 font-medium mt-0.5">
                        This ticket has been forwarded. {req?.assignedDept} team will take action next.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Due date / priority info */}
              {req?.dueDate && (
                <div className={`rounded-xl p-3 border flex items-center gap-3 ${
                  req.priority === "High" || req.priority === "Overdue"
                    ? "bg-red-50 border-red-200"
                    : req.priority === "Medium"
                    ? "bg-amber-50 border-amber-200"
                    : "bg-green-50 border-green-200"
                }`}>
                  <Calendar size={16} className={req.priority === "High" || req.priority === "Overdue" ? "text-red-500" : req.priority === "Medium" ? "text-amber-500" : "text-green-600"} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Due Date</p>
                    <p className="text-[12px] font-bold text-slate-800">{req.dueDate}</p>
                  </div>
                  {req.priority && (
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      req.priority === "Overdue" ? "bg-red-600 text-white" :
                      req.priority === "High"    ? "bg-red-100 text-red-700" :
                      req.priority === "Medium"  ? "bg-amber-100 text-amber-700" :
                                                   "bg-green-100 text-green-700"}`}>
                      {req.priority === "Overdue" ? "⚠ Overdue" : `${req.priority} Urgency`}
                    </span>
                  )}
                  {req.daysUntilDue != null && req.daysUntilDue >= 0 && (
                    <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">{req.daysUntilDue}d left</span>
                  )}
                </div>
              )}

              {/* Checking deadline info */}
              {req?.checkingDeadline && !isClosed && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
                  <Clock size={16} className="text-amber-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-600">Checking Deadline</p>
                    <p className="text-[12px] font-bold text-slate-800">{req.checkingDeadline}</p>
                    {req.checkingReason && <p className="text-[11px] text-slate-500 mt-0.5">{req.checkingReason}</p>}
                  </div>
                  {req.checkingDaysLeft != null && (
                    <span className={`text-[11px] font-black px-2 py-0.5 rounded-full whitespace-nowrap ${req.checkingDaysLeft < 0 ? "bg-red-100 text-red-700" : req.checkingDaysLeft <= 2 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                      {req.checkingDaysLeft < 0 ? "Overdue!" : `${req.checkingDaysLeft}d left`}
                    </span>
                  )}
                </div>
              )}

              {/* Acknowledgement — shown when pending (requestor action) or already done */}
              {(isPendingAck || isClosed) && isOwnRequest && (
                <div className={`border rounded-2xl p-4 space-y-2 ${isPendingAck || isDirectlyClosed ? "border-amber-200 bg-amber-50/40" : "border-slate-200"}`}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                    <ThumbsUp size={12} /> Acknowledgement
                  </p>
                  {req.acknowledgement ? (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-black ${(req.acknowledgement === "Resolved" || req.acknowledgement === "Received") ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {(req.acknowledgement === "Resolved" || req.acknowledgement === "Received") ? <ThumbsUp size={14}/> : <ThumbsDown size={14}/>}
                      {req.acknowledgement === "Received" ? "Resolved" : req.acknowledgement}
                      {req.acknowledgedAt && <span className="ml-auto text-[10px] font-medium opacity-70">{req.acknowledgedAt}</span>}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[11px] text-amber-700 font-bold">The team has resolved your request. Did you receive what was requested?</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcknowledge("Resolved")}
                          disabled={!!pendingAck}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-500 text-white rounded-xl font-black text-[11px] transition-all ${
                            pendingAck === "Resolved"
                              ? "cursor-wait"
                              : pendingAck
                              ? "opacity-40 cursor-not-allowed"
                              : "hover:bg-emerald-600 active:scale-95"
                          }`}
                        >
                          {pendingAck === "Resolved" ? <Spinner size={13}/> : <ThumbsUp size={13}/>} Resolved
                        </button>
                        <button
                          onClick={() => handleAcknowledge("Not Resolved")}
                          disabled={!!pendingAck}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-500 text-white rounded-xl font-black text-[11px] transition-all ${
                            pendingAck === "Not Resolved"
                              ? "cursor-wait"
                              : pendingAck
                              ? "opacity-40 cursor-not-allowed"
                              : "hover:bg-red-600 active:scale-95"
                          }`}
                        >
                          {pendingAck === "Not Resolved" ? <Spinner size={13}/> : <ThumbsDown size={13}/>} Not Resolved
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Pending ack notice for non-requestors */}
              {isPendingAck && !isOwnRequest && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                  <AlertTriangle size={14} className="text-amber-500 flex-shrink-0"/>
                  <p className="text-[11px] text-amber-700 font-bold">Waiting for requestor to confirm receipt. Ticket will close upon confirmation.</p>
                </div>
              )}

              {/* Closure data display */}
              {isClosed && req.closeData && (
                <div className="border border-emerald-200 bg-emerald-50 rounded-2xl p-4 space-y-2">
                   <p className="text-[10px] text-emerald-700 font-black uppercase tracking-widest flex items-center gap-1"><ShieldCheck size={12}/> Closure Details</p>
                   <div className="space-y-1">
                      <p className="text-[11px] text-slate-700 font-bold leading-relaxed whitespace-pre-wrap break-words">
                        {isHtmlContent(req.closeData.description)
                          ? <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(req.closeData.description) }} />
                          : renderRichText(req.closeData.description)}
                      </p>
                      <p className="text-[9px] text-slate-400 font-medium">Closed on {req.closeData.closedDate}</p>
                   </div>
                   {/* Multiple closure attachments */}
                   {req.closeData.fileUrls?.length > 0 && (
                      <div className="pt-1 space-y-1.5">
                        {req.closeData.fileUrls.map((url, idx) => {
                          const name     = req.closeData.fileNames?.[idx] || `attachment-${idx + 1}`;
                          const resolved = resolveFileUrl(url);
                          return isImageFile(url, name) ? (
                            <div key={idx} className="relative group w-fit">
                              <img src={resolved} onClick={() => setLightboxData({ urls: req.closeData.fileUrls, names: req.closeData.fileNames || [], index: idx })} className="h-20 w-auto rounded-lg border-2 border-white shadow-sm cursor-pointer hover:brightness-90 transition-all"/>
                              <div className="absolute inset-0 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg bg-black/20">
                                <div className="bg-black/60 rounded-full p-1"><ZoomIn size={13} className="text-white"/></div>
                                <a href={resolved} download={name} onClick={e => e.stopPropagation()} className="bg-black/60 hover:bg-emerald-600 rounded-full p-1 transition-colors" title="Download"><Download size={13} className="text-white"/></a>
                              </div>
                            </div>
                          ) : isSpreadsheetFile(url, name) ? (
                            <button key={idx} onClick={() => setSpreadsheetPreview({ url, fileName: name })} className="flex items-center gap-1.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 font-bold text-[10px] px-2.5 py-1.5 rounded-lg transition-all">
                              <FileSpreadsheet size={12} className="text-teal-600" /> {name} <Eye size={10} className="text-teal-400" />
                            </button>
                          ) : isPdfFile(url, name) ? (
                            <button key={idx} onClick={() => setPdfPreview({ url, fileName: name })} className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-[10px] px-2.5 py-1.5 rounded-lg transition-all">
                              <FileText size={12} className="text-red-500" /> {name} <Eye size={10} className="text-red-400" />
                            </button>
                          ) : (
                            <a key={idx} href={resolved} download={name} className="text-slate-600 font-bold text-[10px] flex items-center gap-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg transition-all">
                              <Paperclip size={11} className="text-slate-400" /> {name}
                            </a>
                          );
                        })}
                      </div>
                   )}
                </div>
              )}

              {/* Closed notice — all roles (hidden for own requestor who can still acknowledge) */}
              {isClosed && !req.closeData && !(isOwnRequest && isDirectlyClosed) && (
                <div className="border border-slate-200 bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-slate-500 font-black text-[11px] uppercase tracking-wider">🔒 Ticket Closed — All actions disabled</p>
                </div>
              )}

              {/* Own request notice */}
              {isOwnRequest && (isRM||isHOD||isDeptHOD||isManagement) && !isClosed && (
                <div className="border border-amber-200 bg-amber-50 rounded-xl p-3 text-center">
                  <p className="text-amber-700 font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1"><Bell size={13} className="text-amber-500"/> Your Own Request</p>
                  <p className="text-amber-600 text-[10px] mt-0.5">You cannot approve your own submission.</p>
                </div>
              )}

              {/* Admin read-only notice */}
              {isAdmin && (
                <div className="border border-orange-200 bg-orange-50 rounded-xl p-3 text-center">
                  <p className="text-orange-600 font-black text-[11px] uppercase tracking-wider">👁 Admin — Read Only Access</p>
                  <p className="text-orange-500 text-[10px] mt-0.5">You can view all details but cannot take any actions.</p>
                </div>
              )}

              {/* Close Ticket button — only show at bottom if NOT already in the action section above */}
              {canClose && !canUserCheck && !canAssignedPersonActions && (
                <div className="mt-2">
                  <button onClick={() => onOpenCloseTicket(req)} className="w-full py-3 rounded-2xl font-black text-[12px] transition-all shadow-md bg-red-500 text-white hover:bg-red-600 active:scale-95">
                    🔒 Close Ticket
                  </button>
                </div>
              )}

              {/* Close Ticket disabled */}
              {(isDeptHOD||isManagement) && !isOwnRequest && isClosed && (
                <div className="mt-2">
                  <button disabled className="w-full py-3 rounded-2xl font-black text-[12px] bg-slate-200 text-slate-400 cursor-not-allowed">🔒 Ticket Closed</button>
                </div>
              )}

              {/* Stop Recurring — DeptHOD of assigned dept, OR RM/HOD of requestor's own dept */}
              {req?.isRecurring && !isClosed && (
                (isDeptHOD && req?.assignedDept === currentUser?.dept) ||
                ((isRM || isHOD) && req?.dept === currentUser?.dept && !isAssignedDeptUser)
              ) && (
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-2 flex items-center gap-1">
                    <StopCircle size={10}/> Recurring Control
                  </p>
                  <button
                    onClick={handleStopRecurring}
                    disabled={stopRecurringLoading}
                    className="w-full py-2.5 rounded-2xl font-black text-[12px] bg-violet-600 hover:bg-violet-700 text-white shadow-md transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {stopRecurringLoading ? <span className="animate-spin">⟳</span> : <StopCircle size={14}/>}
                    Stop Recurring
                  </button>
                  <p className="text-[10px] text-slate-400 text-center mt-1.5 font-medium">Ticket will no longer auto-reopen after each resolution.</p>
                </div>
              )}
            </div>

            {/* RIGHT PANEL — Chat */}
            <div className={`min-h-0 md:flex md:flex-col md:flex-1 ${showChat ? "flex flex-col flex-1" : "hidden"}`}>
              <div className="md:hidden flex items-center px-4 py-2.5 border-b border-slate-100 bg-white flex-shrink-0">
                <button onClick={() => setShowChat(false)} className="flex items-center gap-1.5 text-indigo-600 font-black text-[12px]">
                  ← Back to Details
                </button>
              </div>
              <ChatPanel reqId={req?.id} logs={logs} currentUser={currentUser} onSendMessage={onSendMessage} isClosed={isClosed} canChat={canChat} onRefreshChat={onRefreshChat} canAttachPostClose={canAttachPostClose} onAttachPostClose={handleAttachPostClose} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
