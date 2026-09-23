import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Plus, LogOut, BookOpen, X, Calendar,
  BarChart3, User, Users, Shield, Building2, Briefcase, Settings,
  Heart, UtensilsCrossed, CheckCircle2, RefreshCw, Bell, BellOff,
  SlidersHorizontal, ChevronRight, ChevronLeft, MapPin, Clock,
} from "lucide-react";
import { usePushNotifications } from "../../hooks/usePushNotifications";
import { fetchRoleCounts } from "../../services/requestService";
import SearchableSelect from "../ui/SearchableSelect";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const ROLE_META = {
  Requestor:     { label: "Requestor",        icon: User,           color: "text-sky-600",     bg: "bg-sky-50",     border: "border-sky-200"     },
  RM:            { label: "Reporting Manager", icon: Users,          color: "text-violet-600",  bg: "bg-violet-50",  border: "border-violet-200"  },
  HOD:           { label: "Head of Dept",      icon: Shield,         color: "text-amber-600",   bg: "bg-amber-50",   border: "border-amber-200"   },
  DeptHOD:       { label: "Dept Login",         icon: Building2,      color: "text-indigo-600",  bg: "bg-indigo-50",  border: "border-indigo-200"  },
  Management:    { label: "Management",        icon: Briefcase,      color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
  Admin:         { label: "Admin",             icon: Settings,       color: "text-rose-600",    bg: "bg-rose-50",    border: "border-rose-200"    },
  HR:            { label: "HR",                icon: Heart,          color: "text-pink-600",    bg: "bg-pink-50",    border: "border-pink-200"    },
  FoodCommittee: { label: "Food Committee",    icon: UtensilsCrossed,color: "text-orange-600",  bg: "bg-orange-50",  border: "border-orange-200"  },
};

export default function FilterBar({
  currentUser,
  filters: activeFilters = {},
  searchTerm = "",
  filterOptions = { names: [], depts: [], assignedDepts: [], assignedStatuses: [] },
  requestCount,
  onFilterChange,
  onSearchChange,
  onClearFilters,
  onAddRequest,
  onShowInstructions,
  onLogout,
  onSwitchRole,
  activeTab = "requests",
}) {
  const [showProfile,    setShowProfile]    = useState(false);
  const [showFilters,    setShowFilters]    = useState(false);
  const [localSearch,    setLocalSearch]    = useState(searchTerm);
  const RECENT_KEY = `rts_recent_searches_${currentUser?.empId || "guest"}`;
  const [recentSearches, setRecentSearches] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
  });
  const [showRecent, setShowRecent] = useState(false);
  const searchWrapRef = useRef(null);
  const [switchingTo,    setSwitchingTo]    = useState(null);
  const [switchCategory, setSwitchCategory] = useState(null);
  const [roleCounts,     setRoleCounts]     = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    if (!showProfile || !currentUser?.availableRoles?.length) return;
    fetchRoleCounts()
      .then(counts => {
        const map = {};
        counts.forEach(({ role, dept, count }) => { map[`${role}::${dept}`] = count; });
        setRoleCounts(map);
      })
      .catch(() => {});
  }, [showProfile]);

  const handleRoleSwitch = async (role, dept) => {
    if (switchingTo) return;
    setSwitchingTo({ role, dept });
    try { await onSwitchRole(role, dept); }
    finally { setSwitchingTo(null); }
  };

  useEffect(() => { setLocalSearch(searchTerm); }, [searchTerm]);

  const updateFilter = (key, value) => onFilterChange({ ...activeFilters, [key]: value });

  const saveRecentSearch = (term) => {
    const t = term.trim();
    if (!t) return;
    setRecentSearches(prev => {
      const next = [t, ...prev.filter(s => s !== t)].slice(0, 5);
      try { sessionStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const handleLocalSearchChange = (val) => {
    setLocalSearch(val);
    onSearchChange(val);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter" && localSearch.trim()) {
      saveRecentSearch(localSearch);
      setShowRecent(false);
    }
    if (e.key === "Escape") setShowRecent(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) setShowRecent(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const resetFilters = () => {
    setLocalSearch("");
    onSearchChange("");
    onFilterChange({ name: [], dept: [], assignedDept: [], rmStatus: [], deptHodStatus: [], type: [], priority: [], unread: false, latest: false, sortMode: "default", sortOrder: "default", startDate: null, endDate: null, search: "" });
    onClearFilters?.();
  };

  const IGNORED_KEYS = new Set(["sortOrder", "sortMode"]);
  const hasActiveFilter   = Object.entries(activeFilters).some(([k, v]) => IGNORED_KEYS.has(k) ? false : Array.isArray(v) ? v.length > 0 : Boolean(v)) || !!searchTerm;
  const activeFilterCount = Object.entries(activeFilters).filter(([k, v]) => IGNORED_KEYS.has(k) ? false : Array.isArray(v) ? v.length > 0 : Boolean(v)).length + (searchTerm ? 1 : 0);

  const { names = [], depts = [], assignedDepts = [], assignedStatuses = ["Open", "Checking", "Closed"] } = filterOptions;

  const initials       = (currentUser?.name || "??").slice(0, 2).toUpperCase();
  const isAdmin        = currentUser?.role === "Admin";
  const isApproverRole = ["RM", "HOD", "DeptHOD"].includes(currentUser?.role);
  const isInternsDept  = currentUser?.dept?.toLowerCase() === "interns";
  const isFoodTab      = activeTab === "food";

  const { isSupported: pushSupported, isSecure, isChecked, isSubscribed, permission, loading: pushLoading, subscribe: pushSubscribe, unsubscribe: pushUnsubscribe } = usePushNotifications();

  const autoSubAttemptedRef = useRef(false);
  useEffect(() => {
    if (!isChecked || autoSubAttemptedRef.current) return;
    autoSubAttemptedRef.current = true;
    if (pushSupported && isSecure && !isSubscribed && permission !== "denied") pushSubscribe();
  }, [isChecked, pushSupported, isSecure, isSubscribed, permission, pushSubscribe]);

  const filterTrigger = "py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-[11px] font-bold hover:border-slate-300";

  return (
    <div className="mb-4 sm:mb-6 space-y-3 relative z-40">

      {/* ── Main bar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-2 sm:gap-3 bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-slate-200">

        {/* ── Filter groups — hidden on mobile until toggle, always visible on sm+ ── */}
        {!isInternsDept && !isFoodTab && (
          <div className={`flex flex-wrap items-end gap-2 sm:gap-3 w-full sm:flex-1 ${showFilters ? "flex" : "hidden sm:flex"}`}>

            {/* Requestor Name */}
            <div className="flex flex-col gap-1 flex-1 min-w-[130px] sm:flex-none sm:min-w-[150px]">
              <label className="text-[11px] font-black text-slate-600 uppercase tracking-tight ml-1">Requestor</label>
              <SearchableSelect
                multiSelect
                value={activeFilters.name || []}
                onChange={val => updateFilter("name", val)}
                options={names.map(n => ({ value: n, label: n }))}
                placeholder="All Requestors"
                triggerClassName={filterTrigger}
              />
            </div>

            {/* Requested Dept */}
            <div className="flex flex-col gap-1 flex-1 min-w-[120px] sm:flex-none sm:min-w-[140px]">
              <label className="text-[11px] font-black text-slate-600 uppercase tracking-tight ml-1">Requested Dept</label>
              <SearchableSelect
                multiSelect
                value={activeFilters.dept || []}
                onChange={val => updateFilter("dept", val)}
                options={depts.map(d => ({ value: d, label: d }))}
                placeholder="All Depts"
                triggerClassName={filterTrigger}
              />
            </div>

            {/* Assigned Dept */}
            <div className="flex flex-col gap-1 flex-1 min-w-[120px] sm:flex-none sm:min-w-[140px]">
              <label className="text-[11px] font-black text-slate-600 uppercase tracking-tight ml-1">Assigned Dept</label>
              <SearchableSelect
                multiSelect
                value={activeFilters.assignedDept || []}
                onChange={val => updateFilter("assignedDept", val)}
                options={assignedDepts.map(d => ({ value: d, label: d }))}
                placeholder="All Depts"
                triggerClassName={filterTrigger}
              />
            </div>

            {/* Type */}
            <div className="flex flex-col gap-1 flex-1 min-w-[90px] sm:flex-none sm:min-w-[100px]">
              <label className="text-[11px] font-black text-slate-600 uppercase tracking-tight ml-1">Type</label>
              <SearchableSelect
                multiSelect
                value={activeFilters.type || []}
                onChange={val => updateFilter("type", val)}
                options={[{ value: "sent", label: "Sent" }, { value: "received", label: "Received" }]}
                placeholder="All"
                triggerClassName={filterTrigger}
              />
            </div>

            {/* Requestor Dept Status */}
            <div className="flex flex-col gap-1 flex-1 min-w-[100px] sm:flex-none sm:min-w-[120px]">
              <label className="text-[11px] font-black text-slate-600 uppercase tracking-tight ml-1">Req. Dept Status</label>
              <SearchableSelect
                multiSelect
                value={activeFilters.rmStatus || []}
                onChange={val => updateFilter("rmStatus", val)}
                options={[
                  { value: "--",           label: "Open" },
                  { value: "Approved",     label: "Approved" },
                  { value: "not_approved", label: "Not Approved" },
                  { value: "Rejected",     label: "Rejected" },
                  { value: "Checking",     label: "Checking" },
                  { value: "Forwarded",    label: "Forwarded" },
                  { value: "ack_pending",  label: "Ack. Pending" },
                  { value: "closed",       label: "Closed" },
                ]}
                placeholder="All"
                triggerClassName={filterTrigger}
              />
            </div>

            {/* Assigned Dept Status */}
            <div className="flex flex-col gap-1 flex-1 min-w-[100px] sm:flex-none sm:min-w-[120px]">
              <label className="text-[11px] font-black text-slate-600 uppercase tracking-tight ml-1">Assign Dept Status</label>
              <SearchableSelect
                multiSelect
                value={activeFilters.deptHodStatus || []}
                onChange={val => updateFilter("deptHodStatus", val)}
                options={[
                  { value: "--",           label: "Open" },
                  { value: "Approved",     label: "Approved" },
                  { value: "not_approved", label: "Not Approved" },
                  { value: "Rejected",     label: "Rejected" },
                  { value: "Checking",     label: "Checking" },
                  { value: "ack_pending",  label: "Ack. Pending" },
                  { value: "closed",       label: "Closed" },
                ]}
                placeholder="All"
                triggerClassName={filterTrigger}
              />
            </div>

            {/* Urgency */}
            <div className="flex flex-col gap-1 flex-1 min-w-[90px] sm:flex-none sm:min-w-[110px]">
              <label className="text-[11px] font-black text-slate-600 uppercase tracking-tight ml-1">Urgency</label>
              <SearchableSelect
                multiSelect
                value={activeFilters.priority || []}
                onChange={val => updateFilter("priority", val)}
                options={[
                  { value: "Overdue", label: "Overdue" },
                  { value: "High", label: "High" },
                  { value: "Medium", label: "Medium" },
                  { value: "Low", label: "Low" },
                ]}
                placeholder="All"
                triggerClassName={filterTrigger}
              />
            </div>


            {/* Date Range */}
            <div className="flex flex-col gap-1 w-full sm:w-auto sm:min-w-[210px]">
              <label className="text-[11px] font-black text-slate-600 uppercase tracking-tight ml-1">Created Date Range</label>
              <div className="relative">
                <DatePicker
                  selectsRange={true}
                  startDate={activeFilters.startDate}
                  endDate={activeFilters.endDate}
                  onChange={(update) => {
                    const [start, end] = update;
                    onFilterChange({ ...activeFilters, startDate: start, endDate: end });
                  }}
                  isClearable={true}
                  placeholderText="Select Date Range"
                  className="w-full bg-white border border-slate-200 py-1.5 pl-8 pr-4 rounded-lg text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all hover:border-slate-300 h-[30px]"
                  calendarClassName="custom-beautiful-calendar"
                  dayClassName={() => "custom-beautiful-day"}
                />
                <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
              </div>
            </div>

            {/* Clear */}
            {hasActiveFilter && (
              <button
                onClick={resetFilters}
                className="h-[30px] flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 rounded-lg text-[11px] font-black transition-all active:scale-95 shadow-sm self-end"
              >
                <X size={14} /> CLEAR
              </button>
            )}
          </div>
        )}

        {/* ── Search & Actions ─────────────────────────────────────────── */}
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto sm:ml-auto">

          {/* Filter toggle — mobile only */}
          {!isInternsDept && !isFoodTab && (
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`sm:hidden flex items-center gap-1.5 h-9 px-3 rounded-xl border text-[11px] font-black transition-all active:scale-95 flex-shrink-0 ${
                showFilters
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <SlidersHorizontal size={13} />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-indigo-500 text-white rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center text-[9px] font-black leading-none">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}

          {/* Search */}
          {!isInternsDept && !isFoodTab && (
            <div className="relative flex-1 sm:flex-none" ref={searchWrapRef}>
              <input
                type="search"
                value={localSearch}
                onChange={e => handleLocalSearchChange(e.target.value)}
                onFocus={() => setShowRecent(true)}
                onKeyDown={handleSearchKeyDown}
                onBlur={() => { if (localSearch.trim()) saveRecentSearch(localSearch); }}
                className="pl-3 pr-9 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 rounded-xl text-[12px] w-full sm:w-48 font-medium shadow-inner"
                placeholder="Search ticket #, name…"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />

              {/* Recent searches dropdown */}
              {showRecent && recentSearches.length > 0 && (
                <div className="absolute top-full left-0 mt-1 w-full sm:w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Recent Searches</span>
                    <button
                      onMouseDown={e => { e.preventDefault(); setRecentSearches([]); try { sessionStorage.removeItem(RECENT_KEY); } catch {} }}
                      className="text-[10px] text-slate-400 hover:text-red-500 font-bold transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  {recentSearches.map((term, i) => (
                    <button
                      key={i}
                      onMouseDown={e => { e.preventDefault(); handleLocalSearchChange(term); setShowRecent(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-indigo-50 transition-colors group"
                    >
                      <Clock size={12} className="text-slate-300 group-hover:text-indigo-400 flex-shrink-0" />
                      <span className="text-[12px] text-slate-600 group-hover:text-indigo-700 font-medium truncate">{term}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Add Request */}
          {!isAdmin && !isInternsDept && !isApproverRole && !isFoodTab && (
            <button
              onClick={onAddRequest}
              className="bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2 rounded-xl font-black flex items-center gap-1.5 shadow-md transition-all active:scale-95 text-[12px] whitespace-nowrap flex-shrink-0"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">ADD </span>REQUEST
            </button>
          )}

          {/* Notification Bell */}
          {pushSupported && permission !== "denied" && !isFoodTab && (
            <button
              onClick={isSubscribed ? pushUnsubscribe : pushSubscribe}
              disabled={pushLoading}
              title={isSubscribed ? "Notifications on — click to turn off" : "Turn on notifications"}
              className={`relative flex items-center justify-center w-9 h-9 rounded-xl border transition-all active:scale-95 disabled:opacity-50 flex-shrink-0 ${
                isSubscribed
                  ? "bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100"
                  : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              }`}
            >
              {pushLoading
                ? <RefreshCw size={15} className="animate-spin" />
                : isSubscribed ? <Bell size={15} /> : <BellOff size={15} />}
              {isSubscribed && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-indigo-500 rounded-full border border-white" />
              )}
            </button>
          )}

          {/* Profile Dropdown */}
          <div className="relative flex-shrink-0 ml-0 sm:ml-1 pl-3 border-l border-slate-200">
            <button onClick={() => setShowProfile(v => !v)} className="flex items-center gap-3 group focus:outline-none">
              <div className="text-right hidden sm:block">
                <p className="text-[12px] font-black text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">
                  {currentUser?.name}
                </p>
                <p className="text-[10px] text-black font-bold uppercase tracking-tighter">{currentUser?.empId}</p>
                <p className={`text-[10px] font-black uppercase tracking-tighter ${ROLE_META[currentUser?.role]?.color || "text-indigo-500"}`}>
                  {ROLE_META[currentUser?.role]?.label || currentUser?.role}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 border-white shadow-sm transition-all group-hover:scale-105 active:scale-95 ${ROLE_META[currentUser?.role]?.bg || "bg-indigo-50"}`}>
                <span className={`font-black text-xs ${ROLE_META[currentUser?.role]?.color || "text-indigo-700"}`}>{initials}</span>
              </div>
            </button>

            {showProfile && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => { setShowProfile(false); setSwitchCategory(null); }} />
                <div className="absolute right-0 top-13 w-[calc(100vw-2rem)] max-w-[288px] bg-white rounded-2xl shadow-2xl border border-slate-100 z-20 overflow-hidden">

                  {/* User card header */}
                  <div className="bg-gradient-to-br from-slate-800 to-slate-900 px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-inner ${ROLE_META[currentUser?.role]?.bg || "bg-indigo-50"}`}>
                        <span className={`font-black text-sm ${ROLE_META[currentUser?.role]?.color || "text-indigo-700"}`}>{initials}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-black text-[13px] leading-tight truncate">{currentUser?.name}</p>
                        <p className="text-slate-400 text-[10px] font-bold mt-0.5">{currentUser?.empId}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          {(() => {
                            const meta = ROLE_META[currentUser?.role];
                            const Icon = meta?.icon;
                            return (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide border ${meta?.bg || "bg-indigo-50"} ${meta?.color || "text-indigo-600"} ${meta?.border || "border-indigo-200"}`}>
                                {Icon && <Icon size={9} />}
                                {meta?.label || currentUser?.role}
                              </span>
                            );
                          })()}
                          <span className="text-slate-500 text-[9px] font-bold truncate">{currentUser?.dept}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Switch Role — 2-step: category → department */}
                  {onSwitchRole && currentUser?.availableRoles?.length > 1 && (
                    <div className="p-3 border-b border-slate-100">

                      {/* Header */}
                      <div className="flex items-center gap-1.5 mb-2 px-1">
                        {switchCategory ? (
                          <button
                            onClick={() => setSwitchCategory(null)}
                            className="flex items-center gap-1 text-slate-400 hover:text-indigo-600 transition-colors"
                          >
                            <ChevronLeft size={11} />
                            <span className="text-[9px] font-black uppercase tracking-widest">Back</span>
                          </button>
                        ) : (
                          <>
                            <RefreshCw size={10} className={`text-slate-400 ${switchingTo ? "animate-spin" : ""}`} />
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Switch Role</p>
                          </>
                        )}
                        {switchingTo && <span className="text-[9px] text-indigo-500 font-bold ml-auto">Switching...</span>}
                        {switchCategory && !switchingTo && (
                          <span className={`ml-auto text-[9px] font-black uppercase ${ROLE_META[switchCategory]?.color || "text-indigo-600"}`}>
                            {ROLE_META[switchCategory]?.label || switchCategory}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 max-h-[200px] overflow-y-auto pr-0.5">

                        {/* Step 1: category list */}
                        {!switchCategory && (() => {
                          const uniqueRoles = [...new Set(currentUser.availableRoles.map(r => r.role))];
                          return uniqueRoles.map(role => {
                            const depts    = currentUser.availableRoles.filter(r => r.role === role);
                            const isActive = role === currentUser.role;
                            const multi    = depts.length > 1;
                            const meta     = ROLE_META[role] || {};
                            const Icon     = meta.icon || User;
                            return (
                              <button
                                key={role}
                                onClick={() => {
                                  if (switchingTo) return;
                                  if (multi) {
                                    setSwitchCategory(role);
                                  } else {
                                    if (!isActive) handleRoleSwitch(role, depts[0].dept);
                                  }
                                }}
                                disabled={!!switchingTo || (!multi && isActive)}
                                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all text-left ${
                                  isActive && !multi
                                    ? `${meta.bg || "bg-indigo-50"} ${meta.border || "border-indigo-200"} cursor-default`
                                    : switchingTo
                                    ? "bg-slate-50 border-slate-100 opacity-40 cursor-not-allowed"
                                    : "bg-slate-50 border-slate-100 hover:bg-white hover:border-slate-300 hover:shadow-sm active:scale-[0.98]"
                                }`}
                              >
                                <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${isActive ? (meta.bg || "bg-indigo-100") : "bg-white border border-slate-200"}`}>
                                  <Icon size={12} className={isActive ? (meta.color || "text-indigo-600") : "text-slate-400"} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-[11px] font-black leading-tight ${isActive ? (meta.color || "text-indigo-700") : "text-slate-700"}`}>
                                    {meta.label || role}
                                  </p>
                                  <p className="text-[9px] text-slate-400 font-medium">
                                    {multi ? `${depts.length} departments` : depts[0].dept}
                                  </p>
                                </div>
                                {!multi && (() => {
                                  const c = roleCounts[`${role}::${depts[0].dept}`] || 0;
                                  return c > 0 ? (
                                    <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-black leading-none">
                                      {c > 99 ? "99+" : c}
                                    </span>
                                  ) : null;
                                })()}
                                {isActive && !multi && <CheckCircle2 size={12} className={meta.color || "text-indigo-500"} />}
                                {multi && <ChevronRight size={12} className="text-slate-300 flex-shrink-0" />}
                              </button>
                            );
                          });
                        })()}

                        {/* Step 2: department list within a category */}
                        {switchCategory && currentUser.availableRoles
                          .filter(r => r.role === switchCategory)
                          .map(({ dept }) => {
                            const isActive    = dept === currentUser.dept && switchCategory === currentUser.role;
                            const isSwitching = switchingTo?.role === switchCategory && switchingTo?.dept === dept;
                            const meta        = ROLE_META[switchCategory] || {};
                            return (
                              <button
                                key={dept}
                                onClick={() => { if (!isActive && !switchingTo) handleRoleSwitch(switchCategory, dept); }}
                                disabled={isActive || !!switchingTo}
                                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all text-left ${
                                  isActive
                                    ? `${meta.bg || "bg-indigo-50"} ${meta.border || "border-indigo-200"} cursor-default`
                                    : isSwitching
                                    ? `${meta.bg || "bg-indigo-50"} ${meta.border || "border-indigo-200"} opacity-80`
                                    : switchingTo
                                    ? "bg-slate-50 border-slate-100 opacity-40 cursor-not-allowed"
                                    : "bg-slate-50 border-slate-100 hover:bg-white hover:border-slate-300 hover:shadow-sm active:scale-[0.98]"
                                }`}
                              >
                                <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${isActive || isSwitching ? (meta.bg || "bg-indigo-100") : "bg-white border border-slate-200"}`}>
                                  {isSwitching
                                    ? <RefreshCw size={12} className={`animate-spin ${meta.color || "text-indigo-600"}`} />
                                    : <MapPin size={12} className={isActive ? (meta.color || "text-indigo-600") : "text-slate-400"} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-[11px] font-black leading-tight ${isActive || isSwitching ? (meta.color || "text-indigo-700") : "text-slate-700"}`}>
                                    {dept}
                                  </p>
                                </div>
                                {(() => {
                                  const c = roleCounts[`${switchCategory}::${dept}`] || 0;
                                  return c > 0 ? (
                                    <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-black leading-none">
                                      {c > 99 ? "99+" : c}
                                    </span>
                                  ) : null;
                                })()}
                                {isActive    && !isSwitching && <CheckCircle2 size={12} className={meta.color || "text-indigo-500"} />}
                                {isSwitching && <span className="text-[9px] font-black text-indigo-500">•••</span>}
                              </button>
                            );
                          })}

                      </div>
                    </div>
                  )}

                  {/* Logout */}
                  <div className="p-3">
                    <button
                      onClick={() => { setShowProfile(false); onLogout(); }}
                      className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 px-4 py-2.5 rounded-xl font-black text-[12px] transition-all active:scale-95"
                    >
                      <LogOut size={14} /> Sign Out
                    </button>
                  </div>

                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Sub-bar ───────────────────────────────────────────────────────── */}
      {!isFoodTab && <div className="flex flex-wrap items-center justify-between gap-2 px-1 sm:px-2">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[11px] font-black shadow-sm">
            {requestCount} {requestCount === 1 ? "REQUEST" : "REQUESTS"}
          </span>
          {hasActiveFilter && (
            <span className="text-slate-400 font-bold text-[10px] italic underline tracking-tight hidden sm:inline">Filtering active records</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {["Admin", "Management"].includes(currentUser?.role) && (
            <button
              onClick={() => navigate("/admin/report")}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-3 sm:px-5 py-2 rounded-full font-black text-[11px] shadow-md hover:shadow-lg transition-all active:scale-95 group whitespace-nowrap"
            >
              <BarChart3 size={15} className="group-hover:animate-pulse" />
              <span className="hidden sm:inline">USERS </span>ANALYTICS
            </button>
          )}
          <button
            onClick={onShowInstructions}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-3 sm:px-5 py-2 rounded-full font-black text-[11px] shadow-md transition-all active:scale-95 whitespace-nowrap"
          >
            <BookOpen size={15} />
            <span className="hidden sm:inline">MANUAL / </span>INSTRUCTIONS
          </button>
        </div>
      </div>}

    </div>
  );
}
