import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchRequests, fetchRequestCounts, fetchFilterOptions, createRequest, submitApproval, acknowledgeRequest, markRequestSeen, markRequestUnread, closeRequest, fetchRequestById } from "../services/requestService";
import { fetchChat, sendText, sendFile, sendVoice } from "../services/chatService";
import { post } from "../services/api";
import { getStoredUser } from "../services/authService";
import FilterBar         from "../components/layout/FilterBar";
import RequestTable      from "../components/table/RequestTable";
import DetailsModal      from "../components/modals/DetailsModal";
import CloseTicketModal  from "../components/modals/CloseTicketModal";
import AddRequestModal   from "../components/modals/AddRequestModal";
import InstructionsModal from "../components/modals/InstructionsModal";
import BroadcastModal    from "../components/modals/BroadcastModal";
import BroadcastSendModal from "../components/modals/BroadcastSendModal";
import FoodPage            from "./FoodPage";
import UserManagementPage  from "./UserManagementPage";
import RoleManagementPage  from "./RoleManagementPage";
import { UtensilsCrossed, ClipboardList, LogOut, Users, CheckCircle2, XCircle, RefreshCw, ChevronDown, Megaphone, ShieldCheck, Headphones, Radio } from "lucide-react";
import DashboardSkeleton  from "../components/ui/DashboardSkeleton";
import TableSkeleton      from "../components/ui/TableSkeleton";
import AppInstallBanner   from "../components/ui/AppInstallBanner";

// ── Filter persistence helpers ────────────────────────────────────────────────
const FILTER_KEY = (empId) => `rts_filters_${empId}`;

function loadFiltersFromStorage(empId) {
  try {
    const raw = localStorage.getItem(FILTER_KEY(empId));
    if (!raw) return null;
    const f = JSON.parse(raw);
    if (f.startDate) f.startDate = new Date(f.startDate);
    if (f.endDate)   f.endDate   = new Date(f.endDate);
    return f;
  } catch { return null; }
}

function saveFiltersToStorage(empId, filters) {
  try { localStorage.setItem(FILTER_KEY(empId), JSON.stringify(filters)); } catch {}
}

function clearFiltersFromStorage(empId) {
  try { localStorage.removeItem(FILTER_KEY(empId)); } catch {}
}

export default function DashboardPage({ currentUser: currentUserProp, onLogout, onSwitchRole }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const [requests,         setRequests]         = useState([]);
  const [filterOptions,    setFilterOptions]    = useState({ names: [], depts: [], assignedDepts: [] });
  const [pagination,       setPagination]       = useState({ total: 0, page: 1, limit: 50, totalPages: 1, hasNext: false, hasPrev: false });
  const [chatLogs,         setChatLogs]         = useState({});
  
  // Parse multi-value URL param (comma-separated → array)
  const parseArr = (key) => {
    const v = searchParams.get(key);
    return v ? v.split(",").filter(Boolean) : [];
  };

  // Consolidate filters into one state object.
  // Priority: URL params → localStorage → defaults
  const [filters, setFilters] = useState(() => {
    const urlKeys = ["name","dept","assignedDept","rmStatus","deptHodStatus","type","priority","unread","sortOrder","sortMode","startDate","endDate","search"];
    const hasUrlFilters = urlKeys.some(k => searchParams.has(k));
    if (!hasUrlFilters) {
      const stored = loadFiltersFromStorage(currentUserProp?.empId);
      if (stored) return stored;
    }
    return {
      name:           parseArr("name"),
      dept:           parseArr("dept"),
      assignedDept:   parseArr("assignedDept"),
      rmStatus:       parseArr("rmStatus"),
      deptHodStatus:  parseArr("deptHodStatus"),
      type:           parseArr("type"),
      priority:       parseArr("priority"),
      unread:         searchParams.get("unread") === "true",
      latest:         searchParams.get("latest") === "true",
      sortOrder:      searchParams.get("sortOrder") || "default",
      sortMode:       searchParams.get("sortMode") || "default",
      startDate:      searchParams.get("startDate") ? new Date(searchParams.get("startDate")) : null,
      endDate:        searchParams.get("endDate") ? new Date(searchParams.get("endDate")) : null,
      search:         searchParams.get("search") || "",
      status:         searchParams.get("status") || undefined,
    };
  });

  const [selectedReq,      setSelectedReq]      = useState(null);
  const [activeModal,      setActiveModal]      = useState(null);
  const [closeTicketReq,   setCloseTicketReq]   = useState(null);
  const [threadParentId,   setThreadParentId]   = useState(null);   // set when opening AddRequestModal from a thread
  const [detailsKey,       setDetailsKey]       = useState(0);      // increment to force DetailsModal remount
  const returnAfterThreadRef = useRef(null);                        // req to reopen after thread add
  const [showInstructions, setShowInstructions] = useState(false);
  const [showBroadcast,     setShowBroadcast]     = useState(false);
  const [showBroadcastSend, setShowBroadcastSend] = useState(false);
  const [showHelpModal,    setShowHelpModal]    = useState(false);
  const [foodRefreshKey,   setFoodRefreshKey]   = useState(0);
  const [loadingReqs,      setLoadingReqs]      = useState(true);
  const [isFiltering,      setIsFiltering]      = useState(false); // For subtle loading state
  const [reqCounts,        setReqCounts]        = useState({ open: 0, closed: 0, ackPending: 0, broadcast: 0 });
  const [fetchError,       setFetchError]       = useState("");
  const [toast,            setToast]            = useState(null); // { type: "success"|"error", message: string }
  const toastTimerRef = useRef(null);
  const [currentPage,      setCurrentPage]      = useState(Number(searchParams.get("page")) || 1);
  
  const pollTimerRef = useRef(null);
  const chatPollTimerRef = useRef(null);
  const selectedReqRef = useRef(null);
  const isFetchingRef = useRef(false);
  const debounceTimerRef = useRef(null);
  const prevRoleKeyRef = useRef(null);
  const sortDropdownRef = useRef(null);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

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
  const loadCounts = useCallback(async () => {
    try {
      const c = await fetchRequestCounts();
      if (c) setReqCounts(c);
    } catch { /* silent */ }
  }, []);

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
      if (Array.isArray(val) && val.length > 0) newParams.set(key, val.join(","));
      else if (val === true) newParams.set(key, "true");
      else if (val && !Array.isArray(val)) newParams.set(key, val);
    });
    if (currentPage > 1) newParams.set("page", currentPage);
    setSearchParams(newParams);

    // Automatic Fetching
    // Note: Search debouncing happens before this state update
    loadRequests(currentPage, filters);
    loadCounts();
  }, [filters, currentPage, loadRequests, loadCounts, setSearchParams]);

  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  // ── Persist filters to localStorage on every change ───────────────────────
  useEffect(() => {
    if (currentUserProp?.empId) saveFiltersToStorage(currentUserProp.empId, filters);
  }, [filters, currentUserProp?.empId]);

  useEffect(() => {
    const close = (e) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target)) {
        setSortDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // ── Deep-link: ?openRequest=<id> (from push notification tap) ───────────
  useEffect(() => {
    const openId = searchParams.get("openRequest");
    if (!openId) return;
    // Remove param from URL immediately so refresh doesn't re-open
    setSearchParams(prev => { const p = new URLSearchParams(prev); p.delete("openRequest"); return p; }, { replace: true });
    fetchRequestById(Number(openId))
      .then(req => {
        if (!req) return;
        setActiveTab("requests");
        setSelectedReq(req);
        setActiveModal("details");
        if (!req.seen) {
          markRequestSeen(req.id).catch(() => {});
        }
        fetchChat(req.id)
          .then(result => setChatLogs(prev => ({ ...prev, [req.id]: result?.data ?? result })))
          .catch(() => {});
      })
      .catch(() => {});
  // Run once on mount — searchParams intentionally excluded from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Role Switch Re-fetch ──────────────────────────────────────────────────
  useEffect(() => {
    const newKey = `${currentUserProp?.role}-${currentUserProp?.dept}`;
    if (prevRoleKeyRef.current !== null && prevRoleKeyRef.current !== newKey) {
      const cleared = { name: [], dept: [], assignedDept: [], rmStatus: [], deptHodStatus: [], type: [], priority: [], unread: false, latest: false, sortMode: "default", sortOrder: "default", startDate: null, endDate: null, search: "" };
      setFilters(cleared);
      setCurrentPage(1);
      loadFilterOptions();
    }
    prevRoleKeyRef.current = newKey;
  }, [currentUserProp?.role, currentUserProp?.dept, loadFilterOptions]);

  // Heartbeat — tells the server this user is online (for chat tick marks)
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
    // Always clear chat badge immediately when user opens the modal
    setRequests((prev) => prev.map((r) => (r.id === row.id ? { ...r, seen: true, unreadChatCount: 0 } : r)));
    if (!row.seen) {
      markRequestSeen(row.id).catch(() => {});
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
        loadRequests(currentPage, filters, true);
      }
    } catch (err) {}
  };

  const handleApproval = async (reqId, decision, dateTime, user, comment, newDept, checkingDeadline, checkingReason, extras = {}) => {
    const updated = await submitApproval(reqId, decision, comment, newDept, checkingDeadline, checkingReason, extras);
    setRequests((prev) => prev.map((r) => (r.id === reqId ? { ...updated, seen: true } : r)));
    if (selectedReq?.id === reqId) setSelectedReq({ ...updated, seen: true });
    try {
      const result = await fetchChat(reqId);
      setChatLogs((prev) => ({ ...prev, [reqId]: result?.data ?? result }));
    } catch (_) {}
  };

  const handleAcknowledge = async (reqId, status) => {
    try {
      const updated = await acknowledgeRequest(reqId, status);
      setRequests((prev) => prev.map((r) => (r.id === reqId ? { ...updated, seen: true } : r)));
      if (selectedReq?.id === reqId) setSelectedReq({ ...updated, seen: true });
    } catch (err) {}
  };

  const showToast = (type, message) => {
    clearTimeout(toastTimerRef.current);
    setToast({ type, message });
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  };

  // ── Thread handlers ──────────────────────────────────────────────────────────
  const handleAddToThread = (parentReqId) => {
    returnAfterThreadRef.current = selectedReq;
    setThreadParentId(parentReqId);
    setActiveModal("add");
  };

  const handleOpenRequest = (memberReq) => {
    setSelectedReq(memberReq);
    setChatLogs(prev => ({ ...prev, [memberReq.id]: memberReq.chatMessages ?? [] }));
    setDetailsKey(k => k + 1);
    markRequestSeen(memberReq.id).catch(() => {});
  };

  const handleAddRequest = async (data) => {
    // No try/catch — errors propagate to AddRequestModal which shows them inline
    const saved = await createRequest(data);
    setRequests((prev) => [saved, ...prev]);
    setActiveModal(null);
    setThreadParentId(null);
    showToast("success", "Request added successfully.");
    // If this was added as a thread reply, re-open the parent request's DetailsModal
    if (returnAfterThreadRef.current) {
      const parent = returnAfterThreadRef.current;
      returnAfterThreadRef.current = null;
      setSelectedReq(parent);
      setDetailsKey(k => k + 1);
      setActiveModal("details");
    }
  };

  const handleConfirmCloseTicket = async (reqId, note, files) => {
    try {
      const updated = await closeRequest(reqId, note, files);
      setRequests((prev) => prev.map((r) => (r.id === reqId ? { ...updated, seen: true } : r)));
      setActiveModal(null);
      setSelectedReq(null);
      const result = await fetchChat(reqId);
      setChatLogs((prev) => ({ ...prev, [reqId]: result?.data ?? result }));
    } finally { setCloseTicketReq(null); }
  };

  if (loadingReqs && !isFiltering) return <DashboardSkeleton />;

  return (
    <div className="h-dvh bg-[#f8fafc] font-sans text-[12px] flex flex-col overflow-hidden">
      <AppInstallBanner currentUser={currentUser} />

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
            onClearFilters={() => clearFiltersFromStorage(currentUserProp?.empId)}
            onAddRequest={() => setActiveModal("add")}
            onShowInstructions={() => setShowInstructions(true)}
            onLogout={onLogout}
            onSwitchRole={onSwitchRole}
            activeTab={activeTab}
          />
        )}
      </div>

      {/* ── Tab Navigation ───────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-3 sm:px-6 pt-2 pb-1 flex items-center justify-between gap-3">
        {(() => {
          const loc             = currentUser?.location?.toLowerCase() || '';
          const isBengaluru     = loc.includes('bangalore') || loc.includes('bengaluru') || loc.includes('ngal');
          const isSuperUser     = currentUser?.role === 'SuperUser';
          const isInternRole    = currentUser?.role === 'Intern';
          const isRequestorRole = currentUser?.role === 'Requestor';
          const isFoodReportHOD = currentUser?.role === 'DeptHOD' &&
                                   ['HR', 'Food Committee'].includes(currentUser?.dept);
          const isDeptHOD       = currentUser?.role === 'DeptHOD';
          const showFoodTab     = isSuperUser || (isBengaluru && !isDeptHOD) || isFoodReportHOD;
          const isHRDeptHOD     = isDeptHOD && currentUser?.dept === 'HR';
          const showMgmtTab     = isSuperUser || isHRDeptHOD;
          const showRolesTab    = isSuperUser || isHRDeptHOD;

          return (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit max-w-full overflow-x-auto shadow-sm">
                {!isInternRole && (
                  <button
                    onClick={() => setActiveTab("requests")}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-black text-[12px] transition-all ${
                      activeTab === "requests" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <ClipboardList size={14} /> Requests
                  </button>
                )}
                {showFoodTab && (
                  <button
                    onClick={() => setActiveTab("food")}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-black text-[12px] transition-all ${
                      activeTab === "food" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <UtensilsCrossed size={14} /> {isFoodReportHOD ? "Food Report" : "Food Request"}
                  </button>
                )}
                {showMgmtTab && (
                  <button
                    onClick={() => setActiveTab("management")}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-black text-[12px] transition-all ${
                      activeTab === "management" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <Users size={14} /> User Management
                  </button>
                )}
                {showRolesTab && (
                  <button
                    onClick={() => setActiveTab("roles")}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-black text-[12px] transition-all ${
                      activeTab === "roles" ? "bg-violet-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <ShieldCheck size={14} /> Roles
                  </button>
                )}
              </div>

            </div>
          );
        })()}

        {/* Sort by dropdown */}
        {activeTab === "requests" && (() => {
          const sortOptions = [
            { key: "default", label: "Default" },
            { key: "desc",    label: "Descending Date" },
            { key: "asc",     label: "Ascending Date" },
            { key: "unread",  label: "Unread" },
          ];

          const applySort = (mode) => {
            let nf;
            if      (mode === "asc")    nf = { ...filters, sortMode: "asc",     sortOrder: "asc",  unread: false, latest: false };
            else if (mode === "desc")   nf = { ...filters, sortMode: "desc",    sortOrder: "desc", unread: false, latest: false };
            else if (mode === "unread") nf = { ...filters, sortMode: "unread",  sortOrder: "desc", unread: true,  latest: false };
            else                        nf = { ...filters, sortMode: "default", sortOrder: "default", unread: false, latest: false };
            setFilters(nf);
            isFetchingRef.current = false;
            loadRequests(currentPage, nf);
            setSortDropdownOpen(false);
          };

          const currentMode  = filters.sortMode || "default";
          const currentLabel = sortOptions.find(o => o.key === currentMode)?.label || "Default";
          const isActive     = currentMode !== "default";

          return (
            <div className="relative flex-shrink-0" ref={sortDropdownRef}>
              <button
                onClick={() => setSortDropdownOpen(prev => !prev)}
                className={`flex items-center gap-1.5 h-8 px-3 rounded-xl border text-[12px] font-black transition-all shadow-sm ${
                  isActive
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
              >
                <span className="text-[10px] font-bold opacity-70">Sort by</span>
                <span>{currentLabel}</span>
                <ChevronDown size={12} className={`transition-transform ${sortDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {sortDropdownOpen && (
                <div className="absolute top-full left-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden min-w-[170px]">
                  {sortOptions.map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => applySort(opt.key)}
                      className={`flex items-center w-full px-4 py-2.5 text-left text-[12px] font-bold transition-colors ${
                        currentMode === opt.key
                          ? "bg-indigo-50 text-indigo-700"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Broadcast button — HR / Food Committee / TA Committee / RTS Help Desk DeptHOD only */}
        {currentUser?.role === "DeptHOD" && ["HR", "Food Committee", "TA Committee", "RTS Help Desk"].includes(currentUser?.dept) && (
          <>
            <button
              onClick={() => setShowBroadcast(true)}
              title="Send Broadcast Notification"
              className="flex items-center gap-1.5 h-9 px-3 bg-violet-50 border border-violet-200 rounded-xl text-[12px] font-black text-violet-600 hover:bg-violet-100 hover:border-violet-300 transition-all active:scale-95 shadow-sm flex-shrink-0"
            >
              <Megaphone size={13} />
              <span className="hidden sm:inline">Broadcast</span>
            </button>
            <button
              onClick={() => setShowBroadcastSend(true)}
              title="Send Ticket to All Users"
              className="flex items-center gap-1.5 h-9 px-3 bg-indigo-50 border border-indigo-200 rounded-xl text-[12px] font-black text-indigo-600 hover:bg-indigo-100 hover:border-indigo-300 transition-all active:scale-95 shadow-sm flex-shrink-0"
            >
              <Radio size={13} />
              <span className="hidden sm:inline">Send to All</span>
            </button>
          </>
        )}

        {/* Refresh button */}
        <button
          onClick={() => activeTab === "food"
            ? setFoodRefreshKey(k => k + 1)
            : loadRequests(currentPage, filters, true)
          }
          disabled={activeTab !== "food" && (isFiltering || loadingReqs)}
          title="Refresh"
          className="flex items-center gap-1.5 h-9 px-3 bg-sky-50 border border-sky-200 rounded-xl text-[12px] font-black text-sky-600 hover:bg-sky-100 hover:border-sky-300 transition-all active:scale-95 shadow-sm disabled:opacity-50 flex-shrink-0"
        >
          <RefreshCw size={13} className={(activeTab !== "food" && (isFiltering || loadingReqs)) ? "animate-spin" : ""} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* ── Main content: takes all remaining height ─────────────────────────── */}
      <div className="flex-1 min-h-0 px-3 sm:px-6 pb-7 sm:pb-9 overflow-hidden">

        {/* User Management Tab */}
        {activeTab === "management" && (
          <div className="h-full overflow-y-auto">
            <UserManagementPage currentUser={currentUser} />
          </div>
        )}

        {/* Roles Tab */}
        {activeTab === "roles" && (
          <div className="h-full overflow-y-auto">
            <RoleManagementPage currentUser={currentUser} />
          </div>
        )}

        {/* Food Tab */}
        {activeTab === "food" && (
          <div className="h-full overflow-y-auto">
            <FoodPage currentUser={currentUser} refreshKey={foodRefreshKey} />
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === "requests" && (
          <div className="h-full flex flex-col gap-2">

            {/* Table — skeleton while loading, real table when ready */}
            <div className="flex-1 min-h-0">
              {isFiltering
                ? <TableSkeleton />
                : <RequestTable
                    requests={requests}
                    sortMode={filters.sortMode || "default"}
                    currentUser={currentUser}
                    onOpenDetails={handleOpenDetails}
                    onMarkUnread={(id) => markRequestUnread(id).then(() => loadRequests(currentPage, filters, true))}
                    onAcknowledge={handleAcknowledge}
                  />
              }
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
                key={`${selectedReq.id}-${detailsKey}`}
                req={selectedReq} chatLogs={chatLogs} currentUser={currentUser}
                onClose={() => { setActiveModal(null); setSelectedReq(null); }}
                onSendMessage={handleSendMessage} onApproval={handleApproval}
                onAcknowledge={handleAcknowledge}
                onOpenCloseTicket={(req) => { setCloseTicketReq(req); setActiveModal(null); setSelectedReq(null); }}
                onRefreshChat={handleRefreshChat}
                onAddToThread={handleAddToThread}
                onOpenRequest={handleOpenRequest}
              />
            )}
            {closeTicketReq && (
              <CloseTicketModal req={closeTicketReq} onClose={() => setCloseTicketReq(null)} onConfirmClose={handleConfirmCloseTicket} />
            )}
            {activeModal === "add" && (
              <AddRequestModal
                onClose={() => { setActiveModal(null); setThreadParentId(null); returnAfterThreadRef.current = null; }}
                onSubmit={handleAddRequest}
                currentUser={currentUser}
                threadParentId={threadParentId}
              />
            )}
            {showInstructions && <InstructionsModal onClose={() => setShowInstructions(false)} />}
            {showBroadcast     && <BroadcastModal     onClose={() => setShowBroadcast(false)} />}
            {showBroadcastSend && <BroadcastSendModal onClose={() => setShowBroadcastSend(false)} />}

          </div>
        )}

      </div>

      {/* ── RTS Help Desk modal — outside tab blocks so it works on any tab ── */}
      {showHelpModal && (
        <AddRequestModal
          onClose={() => setShowHelpModal(false)}
          onSubmit={async (data) => { await handleAddRequest(data); setShowHelpModal(false); }}
          currentUser={currentUser}
          initialDept="RTS Help Desk"
        />
      )}

      {/* ── RTS Help Desk Floating Button ───────────────────────────────────── */}
      {currentUser && (
        <button
          onClick={() => setShowHelpModal(true)}
          title="Contact RTS Help Desk"
          className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-full shadow-2xl shadow-indigo-300 flex items-center justify-center transition-all group"
        >
          <Headphones size={24} />
          <span className="absolute right-16 bg-slate-800 text-white text-[12px] font-black px-3 py-1.5 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
            RTS Help Desk
          </span>
        </button>
      )}

      {/* ── Toast Notification ──────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[9999] flex items-start gap-3.5 px-5 py-4 rounded-2xl shadow-2xl border min-w-[320px] max-w-[480px]
          ${toast.type === "success"
            ? "bg-white border-emerald-200"
            : "bg-white border-red-200"}`}>
          <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center
            ${toast.type === "success" ? "bg-emerald-50" : "bg-red-50"}`}>
            {toast.type === "success"
              ? <CheckCircle2 size={20} className="text-emerald-500" />
              : <XCircle size={20} className="text-red-500" />}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <p className={`text-[13px] font-bold leading-tight ${toast.type === "success" ? "text-emerald-700" : "text-red-700"}`}>
              {toast.type === "success" ? "Success" : "Error"}
            </p>
            <p className="text-[12px] text-slate-500 mt-0.5 leading-snug">{toast.message}</p>
          </div>
          <button onClick={() => setToast(null)} className="flex-shrink-0 mt-0.5 text-slate-300 hover:text-slate-500 transition-colors">
            <XCircle size={16} />
          </button>
        </div>
      )}

    </div>
  );
}
