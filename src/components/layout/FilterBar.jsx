/**
 * components/layout/FilterBar.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Top filter bar with live dropdowns, labels, search, and user menu.
 * Now includes a range date picker and better user selection.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, ChevronDown, LogOut, BookOpen, X, Calendar, BarChart3, User, Users, Shield, Building2, Briefcase, Settings, Heart, UtensilsCrossed, CheckCircle2, RefreshCw, Bell, BellOff } from "lucide-react";
import { usePushNotifications } from "../../hooks/usePushNotifications";

// React Datepicker
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const ROLE_META = {
  Requestor:     { label: "Requestor",         icon: User,          color: "text-sky-600",    bg: "bg-sky-50",    border: "border-sky-200"    },
  RM:            { label: "Reporting Manager",  icon: Users,         color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200" },
  HOD:           { label: "Head of Dept",       icon: Shield,        color: "text-amber-600",  bg: "bg-amber-50",  border: "border-amber-200"  },
  DeptHOD:       { label: "Dept HOD",           icon: Building2,     color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200" },
  Management:    { label: "Management",         icon: Briefcase,     color: "text-emerald-600",bg: "bg-emerald-50",border: "border-emerald-200"},
  Admin:         { label: "Admin",              icon: Settings,      color: "text-rose-600",   bg: "bg-rose-50",   border: "border-rose-200"   },
  HR:            { label: "HR",                 icon: Heart,         color: "text-pink-600",   bg: "bg-pink-50",   border: "border-pink-200"   },
  FoodCommittee: { label: "Food Committee",     icon: UtensilsCrossed,color:"text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
};

export default function FilterBar({
  currentUser,
  filters: activeFilters = {},
  searchTerm = "",
  filterOptions = { names: [], depts: [], assignedDepts: [], assignedStatuses: [] },
  requestCount,
  onFilterChange,
  onSearchChange,
  onAddRequest,
  onShowInstructions,
  onLogout,
  onSwitchRole,
}) {
  const [showProfile,  setShowProfile]  = useState(false);
  const [localSearch,  setLocalSearch]  = useState(searchTerm);
  const [switchingTo,  setSwitchingTo]  = useState(null); // { role, dept } while switching
  const navigate = useNavigate();

  const handleRoleSwitch = async (role, dept) => {
    if (switchingTo) return;
    setSwitchingTo({ role, dept });
    try {
      await onSwitchRole(role, dept);
    } finally {
      setSwitchingTo(null);
    }
  };

  // Sync local search with external searchTerm (e.g. when filters are cleared)
  useEffect(() => {
    setLocalSearch(searchTerm);
  }, [searchTerm]);

  const updateFilter = (key, value) => {
    onFilterChange({ ...activeFilters, [key]: value });
  };

  const handleLocalSearchChange = (val) => {
    setLocalSearch(val);
    onSearchChange(val); 
  };

  const resetFilters = () => {
    setLocalSearch("");
    onSearchChange("");
    onFilterChange({
      name:           "",
      dept:           "",
      assignedDept:   "",
      assignedStatus: "",
      type:           "",
      priority:       "",
      startDate:      null,
      endDate:        null,
      search:         "",
    });
  };

  const hasActiveFilter = Object.values(activeFilters).some(Boolean) || !!searchTerm;

  const {
    names            = [],
    depts            = [],
    assignedDepts    = [],
    assignedStatuses = ["Open", "Checking", "Closed"]
  } = filterOptions;

  const initials = (currentUser?.name || "??").slice(0, 2).toUpperCase();
  const isAdmin  = currentUser?.role === "Admin";
  const isApproverRole = ["RM", "HOD", "DeptHOD"].includes(currentUser?.role);

  const { isSupported: pushSupported, isSecure, isChecked, isSubscribed, permission, loading: pushLoading, subscribe: pushSubscribe, unsubscribe: pushUnsubscribe } = usePushNotifications();
  const isInternsDept = currentUser?.dept?.toLowerCase() === 'interns';

  // Auto-subscribe on login — fires once after the initial subscription check completes
  const autoSubAttemptedRef = useRef(false);
  useEffect(() => {
    if (!isChecked || autoSubAttemptedRef.current) return;
    autoSubAttemptedRef.current = true;
    if (pushSupported && isSecure && !isSubscribed && permission !== "denied") {
      pushSubscribe();
    }
  }, [isChecked, pushSupported, isSecure, isSubscribed, permission, pushSubscribe]);

  // Shared select style
  const selectStyle = "w-full appearance-none bg-white border border-slate-200 py-1.5 pl-2 pr-6 rounded-lg text-slate-700 text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer transition-all hover:border-slate-300";

  return (
    <div className="mb-4 sm:mb-6 space-y-3 relative z-40">
      {/* ── Main bar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-2 sm:gap-3 bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-slate-200">

        {/* Filter Groups */}
        {!isInternsDept && (
          <div className="flex flex-wrap items-end gap-2 sm:gap-3 w-full sm:flex-1">

            {/* Requestor Name */}
            <div className="flex flex-col gap-1 min-w-[120px] flex-1 sm:flex-none sm:min-w-[150px]">
              <label className="text-[11px] font-black text-slate-600 uppercase tracking-tight ml-1">Requestor</label>
              <div className="relative">
                <select
                  value={activeFilters.name || ""}
                  onChange={(e) => updateFilter("name", e.target.value)}
                  className={selectStyle}
                >
                  <option value="">All (Requestor)</option>
                  {names.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={12} />
              </div>
            </div>

            {/* Requested Department */}
            <div className="flex flex-col gap-1 min-w-[110px] flex-1 sm:flex-none sm:min-w-[140px]">
              <label className="text-[11px] font-black text-slate-600 uppercase tracking-tight ml-1">Requested Dept</label>
              <div className="relative">
                <select
                  value={activeFilters.dept || ""}
                  onChange={(e) => updateFilter("dept", e.target.value)}
                  className={selectStyle}
                >
                  <option value="">All Depts</option>
                  {depts.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
              </div>
            </div>

            {/* Assigned Department */}
            <div className="flex flex-col gap-1 min-w-[110px] flex-1 sm:flex-none sm:min-w-[140px]">
              <label className="text-[11px] font-black text-slate-600 uppercase tracking-tight ml-1">Assigned Dept</label>
              <div className="relative">
                <select
                  value={activeFilters.assignedDept || ""}
                  onChange={(e) => updateFilter("assignedDept", e.target.value)}
                  className={selectStyle}
                >
                  <option value="">All Depts</option>
                  {assignedDepts.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
              </div>
            </div>

            {/* Request Type */}
            <div className="flex flex-col gap-1 min-w-[80px] flex-1 sm:flex-none sm:min-w-[100px]">
              <label className="text-[11px] font-black text-slate-600 uppercase tracking-tight ml-1">Type</label>
              <div className="relative">
                <select
                  value={activeFilters.type || ""}
                  onChange={(e) => updateFilter("type", e.target.value)}
                  className={selectStyle}
                >
                  <option value="">All</option>
                  <option value="sent">Sent</option>
                  <option value="received">Received</option>
                </select>
                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
              </div>
            </div>

            {/* Request Status */}
            <div className="flex flex-col gap-1 min-w-[90px] flex-1 sm:flex-none sm:min-w-[110px]">
              <label className="text-[11px] font-black text-slate-600 uppercase tracking-tight ml-1">Status</label>
              <div className="relative">
                <select
                  value={activeFilters.assignedStatus || ""}
                  onChange={(e) => updateFilter("assignedStatus", e.target.value)}
                  className={selectStyle}
                >
                  <option value="">All</option>
                  {assignedStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
              </div>
            </div>

            {/* Urgency Level */}
            <div className="flex flex-col gap-1 min-w-[90px] flex-1 sm:flex-none sm:min-w-[110px]">
              <label className="text-[11px] font-black text-slate-600 uppercase tracking-tight ml-1">Urgency</label>
              <div className="relative">
                <select
                  value={activeFilters.priority || ""}
                  onChange={(e) => updateFilter("priority", e.target.value)}
                  className={selectStyle}
                >
                  <option value="">All</option>
                  <option value="Overdue">Overdue</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
              </div>
            </div>

            {/* Date Picker (Range) */}
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

            {/* Clear Button */}
            {hasActiveFilter && (
              <button
                onClick={resetFilters}
                className="h-[30px] flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 rounded-lg text-[11px] font-black transition-all active:scale-95 shadow-sm mb-0.5"
              >
                <X size={14} /> CLEAR
              </button>
            )}
          </div>
        )}

        {/* Search & Actions */}
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto sm:ml-auto flex-wrap">
          {!isInternsDept && (
            <div className="relative flex-1 sm:flex-none">
              <input
                type="search"
                value={localSearch}
                onChange={(e) => handleLocalSearchChange(e.target.value)}
                className="pl-3 pr-9 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 rounded-xl text-[12px] w-full sm:w-48 font-medium shadow-inner"
                placeholder="Search anything..."
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            </div>
          )}

          {!isAdmin && !isInternsDept && !isApproverRole && (
            <button
              onClick={onAddRequest}
              className="bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2 rounded-xl font-black flex items-center gap-1.5 shadow-md transition-all active:scale-95 text-[12px] whitespace-nowrap"
            >
              <Plus size={16} /> <span className="hidden xs:inline">ADD </span>REQUEST
            </button>
          )}

          {/* Notification Bell */}
          {pushSupported && permission !== "denied" && (
            <button
              onClick={isSubscribed ? pushUnsubscribe : pushSubscribe}
              disabled={pushLoading}
              title={isSubscribed ? "Notifications on — click to turn off" : "Turn on notifications"}
              className={`relative flex items-center justify-center w-9 h-9 rounded-xl border transition-all active:scale-95 disabled:opacity-50 ${
                isSubscribed
                  ? "bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100"
                  : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              }`}
            >
              {pushLoading
                ? <RefreshCw size={15} className="animate-spin" />
                : isSubscribed
                ? <Bell size={15} />
                : <BellOff size={15} />
              }
              {isSubscribed && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-indigo-500 rounded-full border border-white" />
              )}
            </button>
          )}

          {/* Profile Dropdown */}
          <div className="relative flex-shrink-0 ml-0 sm:ml-1 pl-3 border-l border-slate-200">
            <button
              onClick={() => setShowProfile((v) => !v)}
              className="flex items-center gap-3 group focus:outline-none"
            >
              <div className="text-right hidden sm:block">
                <p className="text-[12px] font-black text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">
                  {currentUser?.name}
                </p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                  {currentUser?.empId}
                </p>
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
                <div className="fixed inset-0 z-10" onClick={() => setShowProfile(false)} />
                <div className="absolute right-0 top-13 w-[calc(100vw-2rem)] max-w-[288px] bg-white rounded-2xl shadow-2xl border border-slate-100 z-20 overflow-hidden">

                  {/* ── User card header ───────────────────────────────────── */}
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

                  {/* ── Switch Role section ────────────────────────────────── */}
                  {onSwitchRole && currentUser?.availableRoles?.length > 1 && (
                    <div className="p-3 border-b border-slate-100">
                      <div className="flex items-center gap-1.5 mb-2 px-1">
                        <RefreshCw size={10} className={`text-slate-400 ${switchingTo ? "animate-spin" : ""}`} />
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Switch Role</p>
                        {switchingTo && <span className="text-[9px] text-indigo-500 font-bold ml-auto">Switching...</span>}
                      </div>
                      <div className="space-y-1.5">
                        {currentUser.availableRoles.map(({ role, dept }) => {
                          const isActive    = role === currentUser.role && dept === currentUser.dept;
                          const isSwitching = switchingTo?.role === role && switchingTo?.dept === dept;
                          const meta        = ROLE_META[role] || {};
                          const Icon        = meta.icon || User;
                          return (
                            <button
                              key={`${role}-${dept}`}
                              onClick={() => { if (!isActive && !switchingTo) handleRoleSwitch(role, dept); }}
                              disabled={isActive || !!switchingTo}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
                                isActive
                                  ? `${meta.bg || "bg-indigo-50"} ${meta.border || "border-indigo-200"} cursor-default`
                                  : isSwitching
                                  ? `${meta.bg || "bg-indigo-50"} ${meta.border || "border-indigo-200"} opacity-80`
                                  : switchingTo
                                  ? "bg-slate-50 border-slate-100 opacity-40 cursor-not-allowed"
                                  : "bg-slate-50 border-slate-100 hover:bg-white hover:border-slate-300 hover:shadow-sm active:scale-[0.98]"
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive || isSwitching ? (meta.bg || "bg-indigo-100") : "bg-white border border-slate-200"}`}>
                                {isSwitching
                                  ? <RefreshCw size={14} className={`animate-spin ${meta.color || "text-indigo-600"}`} />
                                  : <Icon size={14} className={isActive ? (meta.color || "text-indigo-600") : "text-slate-400"} />
                                }
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-[11px] font-black leading-tight ${isActive || isSwitching ? (meta.color || "text-indigo-700") : "text-slate-700"}`}>
                                  {meta.label || role}
                                </p>
                                <p className="text-[9px] text-slate-400 font-medium truncate mt-0.5">{dept}</p>
                              </div>
                              {isActive && !isSwitching && <CheckCircle2 size={14} className={meta.color || "text-indigo-500"} />}
                              {isSwitching && <span className="text-[9px] font-black text-indigo-500">•••</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── Logout ─────────────────────────────────────────────── */}
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

      {/* ── Sub-bar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 sm:px-2">
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
              <BarChart3 size={15} className="group-hover:animate-pulse" /> <span className="hidden sm:inline">USERS </span>ANALYTICS
            </button>
          )}
          <button
            onClick={onShowInstructions}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-3 sm:px-5 py-2 rounded-full font-black text-[11px] shadow-md transition-all active:scale-95 whitespace-nowrap"
          >
            <BookOpen size={15} /> <span className="hidden sm:inline">MANUAL / </span>INSTRUCTIONS
          </button>
        </div>
      </div>
    </div>
  );
}
