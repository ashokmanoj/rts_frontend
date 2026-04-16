import { useState, useEffect, useMemo, useCallback } from "react";
import { fetchRequests, createRequest, submitApproval, markRequestSeen, markRequestUnread, closeRequest } from "../services/requestService";
import { fetchChat, sendText, sendFile, sendVoice } from "../services/chatService";
import { getStoredUser } from "../services/authService";
import FilterBar         from "../components/layout/FilterBar";
import RequestTable      from "../components/table/RequestTable";
import DetailsModal      from "../components/modals/DetailsModal";
import CloseTicketModal  from "../components/modals/CloseTicketModal";
import AddRequestModal   from "../components/modals/AddRequestModal";
import InstructionsModal from "../components/modals/InstructionsModal";

function applyFilters(requests, filters, currentUser) {
  return requests.filter((r) => {
    if (filters.name && !r.name?.toLowerCase().includes(filters.name.toLowerCase())) return false;
    if (filters.dept && r.dept !== filters.dept) return false;
    if (filters.assignedDept && r.assignedDept !== filters.assignedDept) return false;
    if (filters.status === "open"   && r.isClosed)  return false;
    if (filters.status === "closed" && !r.isClosed) return false;

    // Request Type filter (Sent vs Received)
    if (filters.type === "sent") {
      // Sent: I am the owner
      if (r.empId !== currentUser?.empId) return false;
    }
    if (filters.type === "received") {
      // Received: Assigned to my department and NOT sent by me
      if (r.assignedDept !== currentUser?.dept || r.empId === currentUser?.empId) return false;
    }

    if (filters.date) {
      const [y, m, d] = filters.date.split("-");
      if (r.date !== `${parseInt(d)}/${parseInt(m)}/${y}`) return false;
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!`${r.purpose} ${r.name} ${r.empId} ${r.dept} ${r.assignedDept}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

export default function DashboardPage({ currentUser: currentUserProp, onLogout }) {
  const [requests,         setRequests]         = useState([]);
  const [pagination,       setPagination]       = useState({ total: 0, page: 1, limit: 50, totalPages: 1, hasNext: false, hasPrev: false });
  const [chatLogs,         setChatLogs]         = useState({});
  const [filters,          setFilters]          = useState({});
  const [selectedReq,      setSelectedReq]      = useState(null);
  const [activeModal,      setActiveModal]      = useState(null);
  const [closeTicketReq,   setCloseTicketReq]   = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [loadingReqs,      setLoadingReqs]      = useState(true);
  const [fetchError,       setFetchError]       = useState("");
  const [currentPage,      setCurrentPage]      = useState(1);

  const currentUser = currentUserProp || getStoredUser();
  const filteredRequests = useMemo(() => applyFilters(requests, filters, currentUser), [requests, filters, currentUser]);

  const loadRequests = useCallback(async (page = 1) => {
    setLoadingReqs(true);
    try {
      const result = await fetchRequests({ page, limit: 50 });
      if (result && result.data) {
        setRequests(result.data);
        setPagination(result.pagination);
      } else {
        setRequests(Array.isArray(result) ? result : []);
      }
      setCurrentPage(page);
    } catch (err) {
      setFetchError("Failed to load requests. Is the backend running?");
    } finally {
      setLoadingReqs(false);
    }
  }, []);

  useEffect(() => { loadRequests(1); }, [loadRequests]);

  const handleOpenDetails = async (row) => {
    setSelectedReq(row);
    setActiveModal("details");
    if (!row.seen) {
      setTimeout(async () => {
        setRequests((prev) => prev.map((r) => (r.id === row.id ? { ...r, seen: true } : r)));
        await markRequestSeen(row.id).catch(() => {});
      }, 300);
    }
    try {
      const result = await fetchChat(row.id);
      const messages = result?.data ?? result;
      setChatLogs((prev) => ({ ...prev, [row.id]: messages }));
    } catch (err) { console.error("Failed to load chat:", err); }
  };

  const handleMarkUnread = async (rowId) => {
    setRequests((prev) => prev.map((r) => (r.id === rowId ? { ...r, seen: false } : r)));
    await markRequestUnread(rowId).catch(() => {});
  };

  const handleSendMessage = async (reqId, message) => {
    setChatLogs((prev) => ({ ...prev, [reqId]: [...(prev[reqId] || []), message] }));
    try {
      let saved;
      if      (message.type === "message")                      saved = await sendText(reqId, message.text);
      else if (message.type === "voice")                        saved = await sendVoice(reqId, message.voiceBlob, message.duration);
      else if (message.type === "file" || message.type === "mixed") saved = await sendFile(reqId, message.fileBlob, message.text);
      else return;
      if (saved) {
        setChatLogs((prev) => ({ ...prev, [reqId]: (prev[reqId] || []).map((m) => (m === message ? saved : m)) }));
      }
    } catch (err) { console.error("Failed to send:", err); }
  };

  const handleApproval = async (reqId, decision, dateTime, user, comment, newDept) => {
    const updater = (r) => {
      if (r.id !== reqId) return r;
      const u = { ...r };
      if      (decision === "Forwarded")     { u.forwarded = true; u.forwardedBy = user.name; u.forwardedAt = dateTime; u.assignedDept = newDept; }
      else if (user.role === "RM")           { u.rmStatus      = decision; u.rmDate      = dateTime; }
      else if (user.role === "HOD")          { u.hodStatus     = decision; u.hodDate     = dateTime; }
      else if (user.role === "DeptHOD")      { u.deptHodStatus = decision; u.deptHodDate = dateTime; }
      else if (user.role === "Management")   { u.mgmtStatus    = decision; u.mgmtDate    = dateTime; }
      u.seen = false;
      return u;
    };
    setRequests((prev) => prev.map(updater));
    setSelectedReq((prev) => (prev?.id === reqId ? updater(prev) : prev));
    try {
      const updated = await submitApproval(reqId, decision, comment, newDept);
      setRequests((prev) => prev.map((r) => (r.id === reqId ? updated : r)));
      setSelectedReq((prev) => (prev?.id === reqId ? updated : prev));
      const result = await fetchChat(reqId);
      setChatLogs((prev) => ({ ...prev, [reqId]: result?.data ?? result }));
    } catch (err) { console.error("Approval failed:", err); }
  };

  const handleAddRequest = async ({ purpose, assignedDept, description, file }) => {
    const saved = await createRequest({ purpose, assignedDept, description, file });
    setRequests((prev) => [{ ...saved, seen: true }, ...prev]);
  };

  const handleConfirmCloseTicket = async (reqId, note, file) => {
    try {
      const updated = await closeRequest(reqId, note, file);
      setRequests((prev) => prev.map((r) => (r.id === reqId ? updated : r)));
      setSelectedReq(updated);
      const result = await fetchChat(reqId);
      setChatLogs((prev) => ({ ...prev, [reqId]: result?.data ?? result }));
    } finally { setCloseTicketReq(null); }
  };

  if (loadingReqs) return (
    <div className="flex items-center justify-center min-h-screen bg-[#f8fafc] font-sans">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 font-medium">Loading requests...</p>
      </div>
    </div>
  );

  if (fetchError) return (
    <div className="flex items-center justify-center min-h-screen bg-[#f8fafc] font-sans">
      <div className="text-center bg-white p-10 rounded-3xl shadow-xl border border-red-100">
        <p className="text-red-500 font-bold text-lg mb-2">⚠ Connection Error</p>
        <p className="text-slate-500 text-sm mb-4">{fetchError}</p>
        <button onClick={() => window.location.reload()} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-indigo-700 transition">Retry</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 font-sans text-[12px]">
      <FilterBar
        currentUser={currentUser}
        requests={requests}
        requestCount={filteredRequests.length}
        onFilterChange={setFilters}
        onAddRequest={() => setActiveModal("add")}
        onShowInstructions={() => setShowInstructions(true)}
        onLogout={onLogout}
      />

      <RequestTable
        requests={filteredRequests}
        currentUser={currentUser}
        onOpenDetails={handleOpenDetails}
        onMarkUnread={handleMarkUnread}
      />

      {/* Pagination controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button onClick={() => loadRequests(currentPage - 1)} disabled={!pagination.hasPrev}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 font-bold text-[12px] text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all">
            ← Prev
          </button>
          <span className="text-[12px] text-slate-500 font-medium">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
          </span>
          <button onClick={() => loadRequests(currentPage + 1)} disabled={!pagination.hasNext}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 font-bold text-[12px] text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all">
            Next →
          </button>
        </div>
      )}

      {activeModal === "details" && selectedReq && (
        <DetailsModal
          req={selectedReq} chatLogs={chatLogs} currentUser={currentUser}
          onClose={() => { setActiveModal(null); setSelectedReq(null); }}
          onSendMessage={handleSendMessage} onApproval={handleApproval}
          onOpenCloseTicket={(req) => setCloseTicketReq(req)}
        />
      )}

      {closeTicketReq && (
        <CloseTicketModal req={closeTicketReq} onClose={() => setCloseTicketReq(null)} onConfirmClose={handleConfirmCloseTicket} />
      )}

      {activeModal === "add" && (
        <AddRequestModal onClose={() => setActiveModal(null)} onSubmit={handleAddRequest} currentUser={currentUser} />
      )}

      {showInstructions && <InstructionsModal onClose={() => setShowInstructions(false)} />}
    </div>
  );
}
