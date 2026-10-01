/**
 * ManagementPortal.jsx
 * Dedicated portal for Management users to review and act on
 * requests that are pending HOD-level approval.
 *
 * Approval here writes to hodStatus — reflected immediately in the
 * main request table's HOD Status column.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { fetchHodPendingRequests, submitHodApproval } from "../services/managementService";
import { post } from "../services/api";
import {
  LogOut, RefreshCw, CheckCircle2, XCircle, Clock,
  ChevronDown, ChevronUp, ShieldCheck, AlertCircle,
  Search, X, SlidersHorizontal, LayoutDashboard, MessageSquare, EyeOff,
} from "lucide-react";
import SearchableSelect  from "../components/ui/SearchableSelect";
import { fetchChat, sendText, sendFile, sendVoice } from "../services/chatService";
import { submitApproval, closeRequest, markRequestSeen, markRequestUnread } from "../services/requestService";
import DetailsModal      from "../components/modals/DetailsModal";
import CloseTicketModal  from "../components/modals/CloseTicketModal";

// ── Status badge ──────────────────────────────────────────────────────────────
function RmBadge({ status }) {
  if (!status || status === "--")
    return <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Pending</span>;
  if (status === "Approved")
    return <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Approved</span>;
  if (status === "Rejected")
    return <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">Rejected</span>;
  return <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">{status}</span>;
}

// ── Approval action panel (inline, per row) ───────────────────────────────────
function ActionPanel({ row, onSubmit, onCancel, loading }) {
  const isGnRow = row.isGnRoute;
  const [decision, setDecision] = useState(null);
  const [comment,  setComment]  = useState("");

  const handleConfirm = () => {
    if (!decision) return;
    onSubmit(row.id, decision, comment);
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
      <p className="text-xs font-black text-amber-800 uppercase tracking-wide">
        Management Decision — {row.purpose}
      </p>

      <div className="flex flex-wrap gap-2">
        {[
          { key: "Approved", label: "Approve",      icon: <CheckCircle2 size={14} />, active: "bg-emerald-600 text-white border-emerald-600 shadow", idle: "bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50" },
          ...(isGnRow ? [{ key: "Checking", label: "Checking", icon: <Clock size={14} />, active: "bg-blue-600 text-white border-blue-600 shadow", idle: "bg-white text-blue-700 border-blue-300 hover:bg-blue-50" }] : []),
          { key: "Rejected", label: "Reject",       icon: <XCircle size={14} />,    active: "bg-red-600 text-white border-red-600 shadow",     idle: "bg-white text-red-700 border-red-300 hover:bg-red-50" },
          { key: "Close",    label: "Close Ticket", icon: <XCircle size={14} />,    active: "bg-slate-700 text-white border-slate-700 shadow",  idle: "bg-white text-slate-600 border-slate-300 hover:bg-slate-50" },
        ].map(({ key, label, icon, active, idle }) => {
          const isCurrentStatus = row.hodStatus === key;
          const isSelected      = decision === key;
          return (
            <button
              key={key}
              onClick={() => !isCurrentStatus && setDecision(key)}
              disabled={isCurrentStatus}
              title={isCurrentStatus ? "Already selected" : undefined}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black transition-all border-2 ${
                isCurrentStatus
                  ? "opacity-40 cursor-not-allowed bg-slate-100 text-slate-500 border-slate-200"
                  : isSelected
                  ? active
                  : idle
              }`}
            >
              {icon} {label}
            </button>
          );
        })}
      </div>

      <textarea
        rows={2}
        placeholder="Add a comment (optional)..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="w-full text-xs border border-amber-200 rounded-lg p-2.5 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
      />

      <div className="flex gap-2">
        <button
          onClick={handleConfirm}
          disabled={!decision || loading}
          className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-black rounded-lg transition-all active:scale-95"
        >
          {loading ? "Submitting…" : "Confirm"}
        </button>
        <button
          onClick={onCancel}
          disabled={loading}
          className="px-5 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-black rounded-lg hover:bg-slate-50 transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── HOD status badge ──────────────────────────────────────────────────────────
function HodBadge({ status }) {
  if (!status || status === "--")
    return (
      <span className="text-xs font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1 justify-center w-fit mx-auto">
        <Clock size={11} /> Pending
      </span>
    );
  if (status === "Approved")
    return <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Approved</span>;
  if (status === "Rejected")
    return <span className="text-xs font-black text-red-700 bg-red-100 px-2 py-0.5 rounded-full">Rejected</span>;
  return <span className="text-xs font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">{status}</span>;
}

// ── Request row ───────────────────────────────────────────────────────────────
function RequestRow({ row, index, onViewDetails, onMarkUnread }) {
  const isGnRow  = row.isGnRoute;
  const isUnread = !row.seen;

  const rowBg = isUnread
    ? "bg-blue-50"
    : row.isClosed
    ? "bg-emerald-50/40"
    : row.hodStatus === "Rejected"
    ? "bg-red-50/40"
    : "";

  return (
    <tr
      className={`border-b border-slate-100 hover:bg-amber-50/30 transition-colors cursor-pointer ${rowBg}`}
      onClick={() => onViewDetails(row)}
    >
      {/* Ticket No */}
      <td className="px-3 py-3 text-center text-xs text-slate-500 font-bold">#{row.id}</td>
      {/* Date */}
      <td className={`px-3 py-3 text-xs whitespace-nowrap ${isUnread ? "text-slate-800 font-black" : "text-slate-600"}`}>{row.date}</td>
      {/* Requestor */}
      <td className="px-3 py-3">
        <p className={`text-xs font-black text-slate-800 flex items-center gap-1.5`}>
          {row.name}
          {isGnRow && (
            <span className="text-[9px] font-black bg-purple-600 text-white px-1.5 py-0.5 rounded-full leading-none">GN</span>
          )}
        </p>
        <p className="text-[10px] text-slate-500">{row.empId} · {row.dept}</p>
        <p className="text-[10px] text-slate-400">{row.designation}</p>
      </td>
      {/* Purpose */}
      <td className="px-3 py-3">
        <p className={`text-xs flex items-center gap-1.5 ${isUnread ? "font-black text-blue-700" : "font-bold text-blue-600"}`}>
          {isUnread && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
          {row.purpose}
        </p>
        {row.description && (
          <p className="text-[10px] text-slate-400 truncate max-w-[200px]">{row.description}</p>
        )}
      </td>
      {/* RM Status */}
      <td className="px-3 py-3 text-center">
        <RmBadge status={row.rmStatus} />
      </td>
      {/* HOD Status — assigned dept HOD's action */}
      <td className="px-3 py-3 text-center">
        <HodBadge status={row.deptHodStatus} />
      </td>
      {/* Assigned Dept */}
      <td className="px-3 py-3 text-xs text-slate-700 font-bold whitespace-nowrap">
        {row.assignedDept || <span className="text-slate-300">—</span>}
      </td>
      {/* Actions */}
      <td className="px-3 py-3 text-center" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-center gap-1.5">
          {row.isClosed ? (
            <button
              onClick={() => onViewDetails(row)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-black rounded-lg transition-all active:scale-95 whitespace-nowrap"
            >
              <MessageSquare size={13} /> View Details
            </button>
          ) : (
            <button
              onClick={() => onViewDetails(row)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-[11px] font-black rounded-lg transition-all active:scale-95 whitespace-nowrap"
            >
              <ShieldCheck size={13} /> Take Action
            </button>
          )}
          {!isUnread && (
            <button
              title="Mark as unread"
              onClick={() => onMarkUnread(row.id)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <EyeOff size={13} />
            </button>
          )}
        </div>
      </td>
      {/* My Status */}
      <td className="px-3 py-3 text-center">
        <HodBadge status={row.managementStatus} />
      </td>
    </tr>
  );
}

// ── Main Portal ───────────────────────────────────────────────────────────────
export default function ManagementPortal({ currentUser, onLogout }) {
  const navigate = useNavigate();
  const [requests,      setRequests]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [lastRefresh,   setLastRefresh]   = useState(null);
  const [refreshing,    setRefreshing]    = useState(false);
  const [selectedReq,   setSelectedReq]   = useState(null);
  const [chatLogs,      setChatLogs]      = useState({});
  const [closeTicketReq, setCloseTicketReq] = useState(null);

  // ── Filters ──
  const [search,        setSearch]        = useState("");
  const [statusFilter,  setStatusFilter]  = useState("all");   // all | pending | approved | rejected
  const [rmFilter,      setRmFilter]      = useState("all");   // all | pending | approved | rejected | checking
  const [deptFilter,    setDeptFilter]    = useState("all");   // all | <dept name>

  const [portalPage,      setPortalPage]      = useState(1);
  const [readTimestamps,  setReadTimestamps]  = useState({}); // { [id]: Date.now() } when opened
  const PAGE_SIZE = 15;

  const pollRef = useRef(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const data = await fetchHodPendingRequests();
      setRequests(Array.isArray(data) ? data : (data?.data ?? []));
      setLastRefresh(new Date());
    } catch (err) {
      if (!silent) setError("Failed to load requests. Check your connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load + 30-second auto-refresh
  useEffect(() => {
    load();
    pollRef.current = setInterval(() => load(true), 30000);
    return () => clearInterval(pollRef.current);
  }, [load]);

  // Heartbeat every 2 min to keep session alive
  useEffect(() => {
    const hb = setInterval(() => post("/auth/heartbeat", {}).catch(() => {}), 120000);
    return () => clearInterval(hb);
  }, []);

  // Presence heartbeat for chat tick marks
  useEffect(() => {
    post("/users/heartbeat", {}).catch(() => {});
    const interval = setInterval(() => post("/users/heartbeat", {}).catch(() => {}), 30_000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefreshChat = useCallback(async (reqId) => {
    try {
      const result = await fetchChat(reqId);
      setChatLogs(prev => ({ ...prev, [reqId]: result?.data ?? result }));
    } catch {}
  }, []);

  const handleActionComplete = useCallback(() => {
    load(true);
  }, [load]);

  const handleViewDetails = useCallback(async (row) => {
    setSelectedReq(row);
    // Always clear chat badge immediately when user opens the modal
    setRequests(prev => prev.map(r => r.id === row.id ? { ...r, seen: true, unreadChatCount: 0 } : r));
    if (!row.seen) {
      markRequestSeen(row.id).catch(() => {});
    }
    setReadTimestamps(prev => ({ ...prev, [row.id]: Date.now() }));
    try {
      const result = await fetchChat(row.id);
      setChatLogs(prev => ({ ...prev, [row.id]: result?.data ?? result }));
    } catch {}
  }, []);

  const handleMarkUnread = useCallback((reqId) => {
    markRequestUnread(reqId).catch(() => {});
    setRequests(prev => prev.map(r => r.id === reqId ? { ...r, seen: false } : r));
    setReadTimestamps(prev => { const n = { ...prev }; delete n[reqId]; return n; });
    setPortalPage(1);
  }, []);

  const handleSendMessage = async (reqId, message) => {
    setChatLogs(prev => ({ ...prev, [reqId]: [...(prev[reqId] || []), message] }));
    try {
      let saved;
      if      (message.type === "message")                           saved = await sendText(reqId, message.text, message.replyTo);
      else if (message.type === "voice")                             saved = await sendVoice(reqId, message.voiceBlob, message.duration, message.replyTo);
      else if (message.type === "file" || message.type === "mixed")  saved = await sendFile(reqId, message.fileBlob, message.text, message.replyTo);
      if (saved) setChatLogs(prev => ({ ...prev, [reqId]: (prev[reqId] || []).map(m => m === message ? saved : m) }));
    } catch {}
  };

  const handleApproval = async (reqId, decision, dateTime, user, comment, newDept, checkingDeadline, checkingReason, extras = {}) => {
    const updated = await submitApproval(reqId, decision, comment, newDept, checkingDeadline, checkingReason, extras);
    setRequests(prev => prev.map(r => r.id === reqId ? { ...updated, seen: true } : r));
    if (selectedReq?.id === reqId) setSelectedReq({ ...updated, seen: true });
    try {
      const result = await fetchChat(reqId);
      setChatLogs(prev => ({ ...prev, [reqId]: result?.data ?? result }));
    } catch {}
    load(true);
  };

  const handleConfirmCloseTicket = async (reqId, note, file) => {
    try {
      const updated = await closeRequest(reqId, note, file);
      setRequests(prev => prev.map(r => r.id === reqId ? { ...updated, seen: true } : r));
      if (selectedReq?.id === reqId) setSelectedReq({ ...updated, seen: true });
      const result = await fetchChat(reqId);
      setChatLogs(prev => ({ ...prev, [reqId]: result?.data ?? result }));
    } finally {
      setCloseTicketReq(null);
    }
  };

  const pendingCount = requests.filter(r =>
    !r.isClosed && (!r.hodStatus || r.hodStatus === "--" || r.hodStatus === "Checking")
  ).length;

  const unreadCount = requests.filter(r => !r.seen).length;

  // Unique sorted dept list derived from loaded requests
  const deptOptions = useMemo(() =>
    [...new Set(requests.map(r => r.dept).filter(Boolean))].sort()
  , [requests]);

  const filteredRequests = useMemo(() => {
    const filtered = requests.filter(r => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const match = [r.name, r.empId, r.dept, r.purpose, r.description]
          .some(v => v?.toLowerCase().includes(q));
        if (!match) return false;
      }
      const isPend = !r.isClosed && (!r.hodStatus || r.hodStatus === "--" || r.hodStatus === "Checking");
      if (statusFilter === "pending"  && !isPend) return false;
      if (statusFilter === "approved" && r.hodStatus !== "Approved") return false;
      if (statusFilter === "rejected" && r.hodStatus !== "Rejected") return false;
      if (rmFilter === "pending"  && r.rmStatus && r.rmStatus !== "--") return false;
      if (rmFilter === "approved" && r.rmStatus !== "Approved") return false;
      if (rmFilter === "rejected" && r.rmStatus !== "Rejected") return false;
      if (rmFilter === "checking" && r.rmStatus !== "Checking") return false;
      if (deptFilter !== "all" && r.dept !== deptFilter) return false;
      return true;
    });
    // Unread first, then read sorted by when they were opened this session (last opened = last)
    const unread = filtered.filter(r => !r.seen);
    const read   = filtered.filter(r =>  r.seen).sort((a, b) => (readTimestamps[a.id] ?? 0) - (readTimestamps[b.id] ?? 0));
    return [...unread, ...read];
  }, [requests, search, statusFilter, rmFilter, deptFilter, readTimestamps]);

  const activeFilterCount = [
    search.trim() !== "",
    statusFilter !== "all",
    rmFilter     !== "all",
    deptFilter   !== "all",
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setRmFilter("all");
    setDeptFilter("all");
    setPortalPage(1);
  };

  // Reset to page 1 whenever filters change
  useEffect(() => { setPortalPage(1); }, [search, statusFilter, rmFilter, deptFilter]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 font-sans flex flex-col" style={{height:"100dvh"}}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 bg-gradient-to-r from-amber-600 to-orange-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <ShieldCheck size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-white font-black text-lg tracking-tight leading-tight">Management Portal</h1>
              <p className="text-amber-100 text-[11px] font-medium">HOD Approval Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-white text-xs font-black">{currentUser?.name}</p>
              <p className="text-amber-200 text-[10px]">{currentUser?.empId} · {currentUser?.dept}</p>
            </div>
            {currentUser?.role === "SuperUser" && (
              <button
                onClick={() => navigate("/super")}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white px-4 py-2 rounded-xl text-xs font-black transition-all active:scale-95"
              >
                <LayoutDashboard size={14} /> Hub
              </button>
            )}
            <button
              onClick={onLogout}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white px-4 py-2 rounded-xl text-xs font-black transition-all active:scale-95"
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-5 pb-6 flex flex-col gap-4 overflow-hidden">

        {/* ── Stats bar ──────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-4 flex items-center gap-4">
            <div className="w-11 h-11 bg-amber-100 rounded-xl flex items-center justify-center">
              <Clock size={22} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">
                {pendingCount}
                <span className="text-base font-bold text-slate-400"> / {requests.length}</span>
              </p>
              <p className="text-xs text-slate-500 font-bold">Pending Approval</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
            <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center">
              <RefreshCw size={20} className={`text-slate-500 ${refreshing ? "animate-spin" : ""}`} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-700">Last Refreshed</p>
              <p className="text-xs text-slate-500 font-medium">
                {lastRefresh
                  ? lastRefresh.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                  : "—"}
              </p>
              <p className="text-[10px] text-slate-400">Auto-refresh every 30 s</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-4 flex items-center gap-4">
            <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center">
              <EyeOff size={20} className="text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">{unreadCount}</p>
              <p className="text-xs text-slate-500 font-bold">Unread</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
            <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center">
              <AlertCircle size={20} className="text-blue-500" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-700">Role</p>
              <p className="text-sm font-black text-blue-600">Management</p>
              <p className="text-[10px] text-slate-400">HOD approver</p>
            </div>
          </div>
        </div>

        {/* ── Toolbar ────────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-black text-slate-700 uppercase tracking-wide flex items-center gap-2 flex-wrap">
            Management Approval Requests
            {pendingCount > 0 && (
              <span className="bg-amber-100 text-amber-700 text-[11px] font-black px-2 py-0.5 rounded-full">
                {pendingCount} Pending
              </span>
            )}
            {requests.length > 0 && (
              <span className="bg-slate-100 text-slate-500 text-[11px] font-black px-2 py-0.5 rounded-full">
                {activeFilterCount > 0 ? `${filteredRequests.length} / ${requests.length}` : `${requests.length} Total`}
              </span>
            )}
          </h2>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-black rounded-xl hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* ── Filter bar ─────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 bg-white border border-slate-200 rounded-2xl shadow-sm px-4 py-3 flex flex-wrap gap-3 items-center">
          <SlidersHorizontal size={15} className="text-amber-500 flex-shrink-0" />

          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, ID, dept, purpose…"
              className="w-full pl-8 pr-3 py-2 text-[12px] font-medium bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={12} />
              </button>
            )}
          </div>

          {/* HOD Status */}
          <SearchableSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "all", label: "HOD Status: All" },
              { value: "pending", label: "Pending" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
            ]}
            triggerClassName={`px-3 py-2 text-[12px] font-bold rounded-xl border ${statusFilter !== "all" ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-slate-50 border-slate-200 text-slate-600"}`}
          />

          {/* RM Status */}
          <SearchableSelect
            value={rmFilter}
            onChange={setRmFilter}
            options={[
              { value: "all", label: "RM Status: All" },
              { value: "pending", label: "Pending" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
              { value: "checking", label: "Checking" },
            ]}
            triggerClassName={`px-3 py-2 text-[12px] font-bold rounded-xl border ${rmFilter !== "all" ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-slate-50 border-slate-200 text-slate-600"}`}
          />

          {/* Department */}
          <SearchableSelect
            value={deptFilter}
            onChange={setDeptFilter}
            options={[{ value: "all", label: "Department: All" }, ...deptOptions.map(d => ({ value: d, label: d }))]}
            triggerClassName={`px-3 py-2 text-[12px] font-bold rounded-xl border ${deptFilter !== "all" ? "bg-purple-50 border-purple-300 text-purple-700" : "bg-slate-50 border-slate-200 text-slate-600"}`}
          />

          {/* Clear */}
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-[11px] font-black rounded-xl transition-all active:scale-95 whitespace-nowrap"
            >
              <X size={11} /> Clear ({activeFilterCount})
            </button>
          )}
        </div>

        {/* ── Content ────────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-500 font-medium">Loading pending requests…</p>
          </div>
        ) : error ? (
          <div className="flex-1 bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <AlertCircle size={32} className="text-red-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-red-700">{error}</p>
            <button
              onClick={() => load()}
              className="mt-3 px-4 py-2 bg-red-600 text-white text-xs font-black rounded-lg hover:bg-red-700 transition-all"
            >
              Retry
            </button>
          </div>
        ) : requests.length === 0 ? (
          <div className="flex-1 bg-white border border-slate-100 rounded-2xl shadow-sm p-16 flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle2 size={32} className="text-emerald-500" />
            </div>
            <p className="text-base font-black text-slate-700">No pending requests found.</p>
            <p className="text-sm text-slate-400">HOD requests and GN employee tickets will appear here.</p>
          </div>
        ) : (
          (() => {
            const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
            const safePage   = Math.min(portalPage, totalPages);
            const pageSlice  = filteredRequests.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
            return (
              <div className="flex-1 min-h-0 flex flex-col gap-2">
                <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-auto">
                  <table className="w-full border-collapse">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-amber-600 text-white text-[11px] font-black uppercase tracking-wide">
                        <th className="px-3 py-3 text-center w-10">Ticket #</th>
                        <th className="px-3 py-3 text-left">Date</th>
                        <th className="px-3 py-3 text-left">Requestor</th>
                        <th className="px-3 py-3 text-left">Purpose / Description</th>
                        <th className="px-3 py-3 text-center">RM Status</th>
                        <th className="px-3 py-3 text-center">HOD Status</th>
                        <th className="px-3 py-3 text-left">Assigned Dept</th>
                        <th className="px-3 py-3 text-center">Action</th>
                        <th className="px-3 py-3 text-center">My Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRequests.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-16 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <Search size={28} className="text-slate-300" />
                              <p className="text-sm font-black text-slate-500">No results match your filters.</p>
                              <button onClick={clearFilters} className="text-xs text-amber-600 font-bold underline hover:text-amber-800">
                                Clear filters
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        pageSlice.map((row, idx) => (
                          <RequestRow
                            key={row.id}
                            row={row}
                            index={(safePage - 1) * PAGE_SIZE + idx}
                            onViewDetails={handleViewDetails}
                            onMarkUnread={handleMarkUnread}
                          />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* ── Pagination ── */}
                {totalPages > 1 && (
                  <div className="flex-shrink-0 flex items-center justify-between gap-3 px-1">
                    <p className="text-[11px] text-slate-500 font-bold">
                      Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredRequests.length)} of {filteredRequests.length}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPortalPage(p => Math.max(1, p - 1))}
                        disabled={safePage === 1}
                        className="px-3 py-1.5 rounded-lg text-xs font-black border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        ‹ Prev
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                        <button
                          key={p}
                          onClick={() => setPortalPage(p)}
                          className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${p === safePage ? "bg-amber-600 text-white shadow" : "bg-white border border-slate-200 text-slate-600 hover:bg-amber-50"}`}
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        onClick={() => setPortalPage(p => Math.min(totalPages, p + 1))}
                        disabled={safePage === totalPages}
                        className="px-3 py-1.5 rounded-lg text-xs font-black border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        Next ›
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()
        )}
      </main>

      {selectedReq && (
        <DetailsModal
          req={selectedReq}
          chatLogs={chatLogs}
          currentUser={currentUser}
          onClose={() => setSelectedReq(null)}
          onSendMessage={handleSendMessage}
          onApproval={handleApproval}
          onOpenCloseTicket={(req) => { setCloseTicketReq(req); setSelectedReq(null); }}
          onAcknowledge={() => {}}
          onRefreshChat={handleRefreshChat}
        />
      )}
      {closeTicketReq && (
        <CloseTicketModal
          req={closeTicketReq}
          onClose={() => setCloseTicketReq(null)}
          onConfirmClose={handleConfirmCloseTicket}
        />
      )}
    </div>
  );
}
