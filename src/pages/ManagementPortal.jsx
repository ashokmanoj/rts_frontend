/**
 * ManagementPortal.jsx
 * Dedicated portal for Management users to review and act on
 * requests that are pending HOD-level approval.
 *
 * Approval here writes to hodStatus — reflected immediately in the
 * main request table's HOD Status column.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchHodPendingRequests, submitHodApproval } from "../services/managementService";
import { post } from "../services/api";
import {
  LogOut, RefreshCw, CheckCircle2, XCircle, Clock,
  ChevronDown, ChevronUp, ShieldCheck, AlertCircle,
} from "lucide-react";

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
  const [decision,  setDecision]  = useState(null); // "Approved" | "Rejected"
  const [comment,   setComment]   = useState("");

  const handleConfirm = () => {
    if (!decision) return;
    onSubmit(row.id, decision, comment);
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
      <p className="text-xs font-black text-amber-800 uppercase tracking-wide">
        HOD Decision — {row.purpose}
      </p>

      <div className="flex gap-3">
        <button
          onClick={() => setDecision("Approved")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black transition-all border-2 ${
            decision === "Approved"
              ? "bg-emerald-600 text-white border-emerald-600 shadow"
              : "bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50"
          }`}
        >
          <CheckCircle2 size={14} /> Approve
        </button>
        <button
          onClick={() => setDecision("Rejected")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black transition-all border-2 ${
            decision === "Rejected"
              ? "bg-red-600 text-white border-red-600 shadow"
              : "bg-white text-red-700 border-red-300 hover:bg-red-50"
          }`}
        >
          <XCircle size={14} /> Reject
        </button>
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
function RequestRow({ row, index, onActionComplete }) {
  const [expanded,   setExpanded]   = useState(false);
  const [actioning,  setActioning]  = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isPending = !row.hodStatus || row.hodStatus === "--" || row.hodStatus === "Checking";

  const handleSubmit = async (id, decision, comment) => {
    setSubmitting(true);
    try {
      await submitHodApproval(id, decision, comment);
      setActioning(false);
      onActionComplete();
    } catch {
      setSubmitting(false);
    }
  };

  const rowBg = row.hodStatus === "Approved"
    ? "bg-emerald-50/40"
    : row.hodStatus === "Rejected"
    ? "bg-red-50/40"
    : "";

  return (
    <>
      <tr className={`border-b border-slate-100 hover:bg-amber-50/30 transition-colors ${rowBg}`}>
        {/* Sl */}
        <td className="px-3 py-3 text-center text-xs text-slate-500 font-bold">{index + 1}</td>
        {/* Date */}
        <td className="px-3 py-3 text-xs text-slate-600 whitespace-nowrap">{row.date}</td>
        {/* Requestor */}
        <td className="px-3 py-3">
          <p className="text-xs font-black text-slate-800">{row.name}</p>
          <p className="text-[10px] text-slate-500">{row.empId} · {row.dept}</p>
          <p className="text-[10px] text-slate-400">{row.designation}</p>
        </td>
        {/* Purpose */}
        <td className="px-3 py-3">
          <button
            onClick={() => setExpanded(p => !p)}
            className="text-left group"
          >
            <p className="text-xs font-bold text-blue-600 underline group-hover:text-blue-800 flex items-center gap-1">
              {row.purpose}
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </p>
            {row.description && !expanded && (
              <p className="text-[10px] text-slate-400 truncate max-w-[200px]">{row.description}</p>
            )}
          </button>
          {expanded && row.description && (
            <p className="text-[11px] text-slate-600 mt-1 bg-slate-50 rounded-lg p-2 border border-slate-100 max-w-xs">
              {row.description}
            </p>
          )}
        </td>
        {/* RM Status */}
        <td className="px-3 py-3 text-center">
          <RmBadge status={row.rmStatus} />
        </td>
        {/* HOD Status */}
        <td className="px-3 py-3 text-center">
          <HodBadge status={row.hodStatus} />
        </td>
        {/* Actions */}
        <td className="px-3 py-3 text-center">
          {isPending ? (
            actioning ? (
              <button
                onClick={() => setActioning(false)}
                className="text-[10px] text-slate-500 hover:text-slate-700 font-bold underline"
              >
                Cancel
              </button>
            ) : (
              <button
                onClick={() => setActioning(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-[11px] font-black rounded-lg transition-all active:scale-95 mx-auto whitespace-nowrap"
              >
                <ShieldCheck size={13} /> Take Action
              </button>
            )
          ) : (
            <span className="text-[10px] text-slate-400 font-medium">—</span>
          )}
        </td>
      </tr>

      {actioning && (
        <tr>
          <td colSpan={7} className="px-4 pb-3">
            <ActionPanel
              row={row}
              onSubmit={handleSubmit}
              onCancel={() => setActioning(false)}
              loading={submitting}
            />
          </td>
        </tr>
      )}
    </>
  );
}

// ── Main Portal ───────────────────────────────────────────────────────────────
export default function ManagementPortal({ currentUser, onLogout }) {
  const [requests,   setRequests]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [lastRefresh, setLastRefresh] = useState(null);
  const [refreshing, setRefreshing]  = useState(false);

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

  const handleActionComplete = useCallback(() => {
    load(true);
  }, [load]);

  const pendingCount = requests.filter(r => !r.hodStatus || r.hodStatus === "--" || r.hodStatus === "Checking").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 font-sans">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-gradient-to-r from-amber-600 to-orange-600 shadow-lg">
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

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-white text-xs font-black">{currentUser?.name}</p>
              <p className="text-amber-200 text-[10px]">{currentUser?.empId} · {currentUser?.dept}</p>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white px-4 py-2 rounded-xl text-xs font-black transition-all active:scale-95"
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5">

        {/* ── Stats bar ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-4 flex items-center gap-4">
            <div className="w-11 h-11 bg-amber-100 rounded-xl flex items-center justify-center">
              <Clock size={22} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">{pendingCount}</p>
              <p className="text-xs text-slate-500 font-bold">Pending HOD Approval</p>
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

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
            <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center">
              <AlertCircle size={20} className="text-blue-500" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-700">Role</p>
              <p className="text-sm font-black text-blue-600">Management</p>
              <p className="text-[10px] text-slate-400">Acting as HOD approver</p>
            </div>
          </div>
        </div>

        {/* ── Toolbar ────────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-black text-slate-700 uppercase tracking-wide flex items-center gap-2 flex-wrap">
            HOD Approval Requests
            {pendingCount > 0 && (
              <span className="bg-amber-100 text-amber-700 text-[11px] font-black px-2 py-0.5 rounded-full">
                {pendingCount} Pending
              </span>
            )}
            {requests.length > 0 && (
              <span className="bg-slate-100 text-slate-500 text-[11px] font-black px-2 py-0.5 rounded-full">
                {requests.length} Total
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

        {/* ── Content ────────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-500 font-medium">Loading pending requests…</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
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
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-16 flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle2 size={32} className="text-emerald-500" />
            </div>
            <p className="text-base font-black text-slate-700">No HOD requests found.</p>
            <p className="text-sm text-slate-400">Requests from HOD-role users will appear here.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-amber-600 text-white text-[11px] font-black uppercase tracking-wide">
                    <th className="px-3 py-3 text-center w-10">Sl.</th>
                    <th className="px-3 py-3 text-left">Date</th>
                    <th className="px-3 py-3 text-left">Requestor</th>
                    <th className="px-3 py-3 text-left">Purpose / Description</th>
                    <th className="px-3 py-3 text-center">RM Status</th>
                    <th className="px-3 py-3 text-center">HOD Status</th>
                    <th className="px-3 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((row, idx) => (
                    <RequestRow
                      key={row.id}
                      row={row}
                      index={idx}
                      onActionComplete={handleActionComplete}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
