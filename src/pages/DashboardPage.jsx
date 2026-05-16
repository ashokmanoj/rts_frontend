import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchRequests, fetchFilterOptions, createRequest, submitApproval, acknowledgeRequest, markRequestSeen, markRequestUnread, closeRequest } from "../services/requestService";
import { fetchChat, sendText, sendFile, sendVoice } from "../services/chatService";
import { getStoredUser } from "../services/authService";
import FilterBar         from "../components/layout/FilterBar";
import RequestTable      from "../components/table/RequestTable";
import DetailsModal      from "../components/modals/DetailsModal";
import CloseTicketModal  from "../components/modals/CloseTicketModal";
import AddRequestModal   from "../components/modals/AddRequestModal";
import InstructionsModal from "../components/modals/InstructionsModal";
import FoodPage          from "./FoodPage";
import UserManagementPage from "./UserManagementPage";
import { UtensilsCrossed, ClipboardList, LogOut, Users } from "lucide-react";

export default function DashboardPage({ currentUser: currentUserProp, onLogout, onSwitchRole }) {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [requests,         setRequests]         = useState([]);
  const [filterOptions,    setFilterOptions]    = useState({ names: [], depts: [], assignedDepts: [] });
  const [pagination,       setPagination]       = useState({ total: 0, page: 1, limit: 50, totalPages: 1, hasNext: false, hasPrev: false });
  const [chatLogs,         setChatLogs]         = useState({});
  
  // Consolidate filters into one state object, initialized from URL
  const [filters, setFilters] = useState({
    name:           searchParams.get("name") || "",
    dept:           searchParams.get("dept") || "",
    assignedDept:   searchParams.get("assignedDept") || "",
    assignedStatus: searchParams.get("assignedStatus") || "",
    type:           searchParams.get("type") || "",
    priority:       searchParams.get("priority") || "",
    startDate:      searchParams.get("startDate") ? new Date(searchParams.get("startDate")) : null,
    endDate:        searchParams.get("endDate") ? new Date(searchParams.get("endDate")) : null,
    search:         searchParams.get("search") || "",
  });

  const [selectedReq,      setSelectedReq]      = useState(null);
  const [activeModal,      setActiveModal]      = useState(null);
  const [closeTicketReq,   setCloseTicketReq]   = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [loadingReqs,      setLoadingReqs]      = useState(true);
  const [isFiltering,      setIsFiltering]      = useState(false); // For subtle loading state
  const [fetchError,       setFetchError]       = useState("");
  const [currentPage,      setCurrentPage]      = useState(Number(searchParams.get("page")) || 1);
  
  const pollTimerRef = useRef(null);
  const chatPollTimerRef = useRef(null);
  const selectedReqRef = useRef(null);
  const isFetchingRef = useRef(false);
  const debounceTimerRef = useRef(null);
  const prevRoleKeyRef = useRef(null);

  const currentUser = currentUserProp || getStoredUser();

  const isIntern = currentUser?.role === 'Intern';

  const initialTab = searchParams.get("tab") || (isIntern ? "food" : "requests");
  const [activeTab, setActiveTab] = useState(initialTab);

  // ── Fetch Filter Options ──────────────────────────────────────────────────
  const loadFilterOptions = useCallback(async () => {
    try {
      const options = await fetchFilterOptions();
      setFilterOptions(options);
    } catch (err) {
      console.error("Failed to load filter options:", err);
    }
  }, []);

  // ── Core Fetch Request ────────────────────────────────────────────────────
  const loadRequests = useCallback(async (page = 1, currentFilters = {}, silent = false) => {
    if (isFetchingRef.current && !silent) return;
    if (!silent) setIsFiltering(true);
    isFetchingRef.current = true;
    
    try {
      // Map frontend keys to backend query params
      const params = {
        page,
        limit: 50,
        ...currentFilters
      };

      const result = await fetchRequests(params);
      
      if (result && result.data) {
        setRequests(result.data);
        setPagination(result.pagination);
        
        if (selectedReqRef.current) {
          const updated = result.data.find(r => r.id === selectedReqRef.current.id);
          if (updated) setSelectedReq(updated);
        }
      } else {
        setRequests(Array.isArray(result) ? result : []);
      }
      setCurrentPage(page);
    } catch (err) {
      if (!silent) setFetchError("Failed to load requests.");
    } finally {
      setIsFiltering(false);
      setLoadingReqs(false);
      isFetchingRef.current = false;
    }
  }, []);

  // ── Select-to-Filter + URL Sync Logic ─────────────────────────────────────
  useEffect(() => {
    // Update URL whenever filters or page changes
    const newParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val) newParams.set(key, val);
    });
    if (currentPage > 1) newParams.set("page", currentPage);
    setSearchParams(newParams);

    // Automatic Fetching
    // Note: Search debouncing happens before this state update
    loadRequests(currentPage, filters);
  }, [filters, currentPage, loadRequests, setSearchParams]);

  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  // ── Role Switch Re-fetch ──────────────────────────────────────────────────
  useEffect(() => {
    const newKey = `${currentUserProp?.role}-${currentUserProp?.dept}`;
    if (prevRoleKeyRef.current !== null && prevRoleKeyRef.current !== newKey) {
      const cleared = { name: "", dept: "", assignedDept: "", assignedStatus: "", type: "", priority: "", startDate: null, endDate: null, search: "" };
      setFilters(cleared);
      setCurrentPage(1);
      loadFilterOptions();
    }
    prevRoleKeyRef.current = newKey;
  }, [currentUserProp?.role, currentUserProp?.dept, loadFilterOptions]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleFilterChange = (newFilters) => {
    setCurrentPage(1); // Reset to page 1 on filter change
    setFilters(newFilters);
  };

  const handleSearchChange = (val) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setCurrentPage(1);
      setFilters(prev => ({ ...prev, search: val }));
    }, 300);
  };

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
      setChatLogs((prev) => ({ ...prev, [row.id]: result?.data ?? result }));
    } catch (err) {}
  };

  const handleSendMessage = async (reqId, message) => {
    setChatLogs((prev) => ({ ...prev, [reqId]: [...(prev[reqId] || []), message] }));
    try {
      let saved;
      if      (message.type === "message")                          saved = await sendText(reqId, message.text, message.replyTo);
      else if (message.type === "voice")                            saved = await sendVoice(reqId, message.voiceBlob, message.duration, message.replyTo);
      else if (message.type === "file" || message.type === "mixed") saved = await sendFile(reqId, message.fileBlob, message.text, message.replyTo);
      
      if (saved) {
        setChatLogs((prev) => ({ ...prev, [reqId]: (prev[reqId] || []).map((m) => (m === message ? saved : m)) }));
      }
      loadRequests(currentPage, filters, true);
    } catch (err) {}
  };

  const handleApproval = async (reqId, decision, dateTime, user, comment, newDept, checkingDeadline, checkingReason) => {
    try {
      const updated = await submitApproval(reqId, decision, comment, newDept, checkingDeadline, checkingReason);
      setRequests((prev) => prev.map((r) => (r.id === reqId ? { ...updated, seen: true } : r)));
      if (selectedReq?.id === reqId) setSelectedReq({ ...updated, seen: true });
      const result = await fetchChat(reqId);
      setChatLogs((prev) => ({ ...prev, [reqId]: result?.data ?? result }));
    } catch (err) {}
  };

  const handleAcknowledge = async (reqId, status) => {
    try {
      const updated = await acknowledgeRequest(reqId, status);
      setRequests((prev) => prev.map((r) => (r.id === reqId ? { ...updated, seen: true } : r)));
      if (selectedReq?.id === reqId) setSelectedReq({ ...updated, seen: true });
    } catch (err) {}
  };

  const handleAddRequest = async (data) => {
    const saved = await createRequest(data);
    setRequests((prev) => [saved, ...prev]);
    setActiveModal(null);
  };

  const handleConfirmCloseTicket = async (reqId, note, file) => {
    try {
      const updated = await closeRequest(reqId, note, file);
      setRequests((prev) => prev.map((r) => (r.id === reqId ? { ...updated, seen: true } : r)));
      setSelectedReq({ ...updated, seen: true });
      const result = await fetchChat(reqId);
      setChatLogs((prev) => ({ ...prev, [reqId]: result?.data ?? result }));
    } finally { setCloseTicketReq(null); }
  };

  if (loadingReqs && !isFiltering) return (
    <div className="flex items-center justify-center min-h-screen bg-[#f8fafc]">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 font-medium">Loading Dashboard...</p>
      </div>
    </div>
  );

  return (
    <div className="h-dvh bg-[#f8fafc] font-sans text-[12px] flex flex-col overflow-hidden">

      {/* ── Header: intern bar or FilterBar (shrinks to content) ────────────── */}
      <div className="flex-shrink-0 px-3 sm:px-6 pt-3 sm:pt-5">
        {isIntern ? (
          <div className="flex flex-wrap justify-between items-center gap-3 mb-3 bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-700 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                <span className="font-black text-xs">{(currentUser?.name || "??").slice(0, 2).toUpperCase()}</span>
              </div>
              <div>
                <p className="text-[12px] font-black text-slate-800 leading-tight">{currentUser?.name}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">User ID: {currentUser?.empId}</p>
                <p className="text-[10px] text-indigo-500 font-black uppercase tracking-tight">{currentUser?.dept}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2 rounded-xl text-[12px] font-black transition-all active:scale-95 shadow-sm"
            >
              <LogOut size={16} /> LOGOUT
            </button>
          </div>
        ) : (
          <FilterBar
            currentUser={currentUser}
            filters={filters}
            filterOptions={filterOptions}
            requestCount={pagination.total}
            onFilterChange={handleFilterChange}
            onSearchChange={handleSearchChange}
            onAddRequest={() => setActiveModal("add")}
            onShowInstructions={() => setShowInstructions(true)}
            onLogout={onLogout}
            onSwitchRole={onSwitchRole}
          />
        )}
      </div>

      {/* ── Tab Navigation (shrinks to content) ─────────────────────────────── */}
      <div className="flex-shrink-0 px-3 sm:px-6 pt-2 pb-1">
        {(() => {
          const loc             = currentUser?.location?.toLowerCase() || '';
          const isBengaluru     = loc.includes('bangalore') || loc.includes('bengaluru') || loc.includes('ngal');
          const isInternRole    = currentUser?.role === 'Intern';
          const isRequestorRole = currentUser?.role === 'Requestor';
          const isFoodReportHOD = currentUser?.role === 'DeptHOD' &&
                                   ['HR', 'Food Committee'].includes(currentUser?.dept);
          const showFoodTab     = ((isRequestorRole || isInternRole) && isBengaluru) || isFoodReportHOD;
          const isHRDeptHOD     = currentUser?.role === 'DeptHOD' && currentUser?.dept === 'HR';
          const showMgmtTab     = isHRDeptHOD;

          return (
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit max-w-full overflow-x-auto shadow-sm">
              {!isInternRole && (
                <button
                  onClick={() => setActiveTab("requests")}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-black text-[11px] transition-all ${
                    activeTab === "requests" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <ClipboardList size={14} /> Requests
                </button>
              )}
              {showFoodTab && (
                <button
                  onClick={() => setActiveTab("food")}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-black text-[11px] transition-all ${
                    activeTab === "food" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <UtensilsCrossed size={14} /> {isFoodReportHOD ? "Food Report" : "Food Request"}
                </button>
              )}
              {showMgmtTab && (
                <button
                  onClick={() => setActiveTab("management")}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-black text-[11px] transition-all ${
                    activeTab === "management" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <Users size={14} /> User Management
                </button>
              )}
            </div>
          );
        })()}
      </div>

      {/* ── Main content: takes all remaining height ─────────────────────────── */}
      <div className="flex-1 min-h-0 px-3 sm:px-6 pb-7 sm:pb-9 overflow-hidden">

        {/* User Management Tab */}
        {activeTab === "management" && (
          <div className="h-full overflow-y-auto">
            <UserManagementPage currentUser={currentUser} />
          </div>
        )}

        {/* Food Tab */}
        {activeTab === "food" && (
          <div className="h-full overflow-y-auto">
            <FoodPage currentUser={currentUser} />
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === "requests" && (
          <div className="h-full flex flex-col gap-2">

            {/* Table — flex-1 so it fills remaining space above pagination */}
            <div className={`flex-1 min-h-0 transition-opacity duration-200 ${isFiltering ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
              <RequestTable
                requests={requests}
                currentUser={currentUser}
                onOpenDetails={handleOpenDetails}
                onMarkUnread={(id) => markRequestUnread(id).then(() => loadRequests(currentPage, filters, true))}
                onAcknowledge={handleAcknowledge}
              />
            </div>

            {/* Pagination — always visible above taskbar */}
            {pagination.totalPages > 1 && (
              <div className="flex-shrink-0 flex items-center justify-center gap-3 py-2 pb-3">
                <button
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  disabled={!pagination.hasPrev}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all"
                >
                  ← Prev
                </button>
                <span className="text-slate-500 font-medium">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={!pagination.hasNext}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all"
                >
                  Next →
                </button>
              </div>
            )}

            {/* Modals — fixed position, no layout impact */}
            {activeModal === "details" && selectedReq && (
              <DetailsModal
                req={selectedReq} chatLogs={chatLogs} currentUser={currentUser}
                onClose={() => { setActiveModal(null); setSelectedReq(null); }}
                onSendMessage={handleSendMessage} onApproval={handleApproval}
                onAcknowledge={handleAcknowledge}
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
        )}

      </div>
    </div>
  );
}
