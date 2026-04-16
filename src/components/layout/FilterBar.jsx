/**
 * components/layout/FilterBar.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Top filter bar with live dropdowns, date picker, search, and user menu.
 *
 * FIX: Profile dropdown was rendered INSIDE the avatar <button>, so any click
 * inside it (including Logout) also triggered the button's onClick toggle,
 * causing the dropdown to immediately reopen after closing.
 * Fixed by moving the dropdown outside the <button> into a sibling wrapper div.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useCallback } from "react";
import { Search, Plus, ChevronDown, LogOut, BookOpen, X } from "lucide-react";

export default function FilterBar({
  currentUser,
  requests = [],
  requestCount,
  onFilterChange,
  onAddRequest,
  onShowInstructions,
  onLogout,
}) {
  const [showProfile, setShowProfile] = useState(false);

  // ── Filter state ──────────────────────────────────────────────────────────
  const [filters, setFilters] = useState({
    name:         "",
    dept:         "",
    assignedDept: "",
    status:       "",
    type:         "",
    date:         "",
    search:       "",
  });

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      onFilterChange(next);
      return next;
    });
  }, [onFilterChange]);

  const resetFilters = () => {
    const empty = { name: "", dept: "", assignedDept: "", status: "", type: "", date: "", search: "" };
    setFilters(empty);
    onFilterChange(empty);
  };

  const hasActiveFilter = Object.values(filters).some(Boolean);

  // Build unique dropdown option lists from the unfiltered request array
  const unique = (arr, key) => [...new Set(arr.map((r) => r[key]).filter(Boolean))].sort();
  const names         = unique(requests, "name");
  const depts         = unique(requests, "dept");
  const assignedDepts = unique(requests, "assignedDept");

  const initials = (currentUser?.name || "??").slice(0, 2).toUpperCase();
  const isAdmin  = currentUser?.role === "Admin";

  return (
    <div className="mb-6 space-y-3">

      {/* ── Main bar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-2xl shadow-sm border border-slate-200">

        {/* Filter dropdowns */}
        <div className="flex flex-wrap gap-2 flex-1">

          {/* Requestor Name */}
          <div className="relative min-w-[140px]">
            <select
              value={filters.name}
              onChange={(e) => updateFilter("name", e.target.value)}
              className="w-full appearance-none bg-white border border-slate-200 py-2 pl-3 pr-7 rounded-lg text-slate-700 text-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
            >
              <option value="">Requestor Name</option>
              {names.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 text-slate-400 pointer-events-none" size={13} />
          </div>

          {/* Requested Department */}
          <div className="relative min-w-[160px]">
            <select
              value={filters.dept}
              onChange={(e) => updateFilter("dept", e.target.value)}
              className="w-full appearance-none bg-white border border-slate-200 py-2 pl-3 pr-7 rounded-lg text-slate-700 text-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
            >
              <option value="">Requested Department</option>
              {depts.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 text-slate-400 pointer-events-none" size={13} />
          </div>

          {/* Assigned Department */}
          <div className="relative min-w-[160px]">
            <select
              value={filters.assignedDept}
              onChange={(e) => updateFilter("assignedDept", e.target.value)}
              className="w-full appearance-none bg-white border border-slate-200 py-2 pl-3 pr-7 rounded-lg text-slate-700 text-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
            >
              <option value="">Assigned Department</option>
              {assignedDepts.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 text-slate-400 pointer-events-none" size={13} />
          </div>

          {/* Request Type */}
          <div className="relative min-w-[120px]">
            <select
              value={filters.type}
              onChange={(e) => updateFilter("type", e.target.value)}
              className="w-full appearance-none bg-white border border-slate-200 py-2 pl-3 pr-7 rounded-lg text-slate-700 text-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
            >
              <option value="">Request Type</option>
              <option value="sent">Sent</option>
              <option value="received">Received</option>
            </select>
            <ChevronDown className="absolute right-2 top-2.5 text-slate-400 pointer-events-none" size={13} />
          </div>

          {/* Status */}
          <div className="relative min-w-[140px]">
            <select
              value={filters.status}
              onChange={(e) => updateFilter("status", e.target.value)}
              className="w-full appearance-none bg-white border border-slate-200 py-2 pl-3 pr-7 rounded-lg text-slate-700 text-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
            <ChevronDown className="absolute right-2 top-2.5 text-slate-400 pointer-events-none" size={13} />
          </div>

          {/* Date picker */}
          <input
            type="date"
            value={filters.date}
            onChange={(e) => updateFilter("date", e.target.value)}
            className="bg-white border border-slate-200 py-2 px-3 rounded-lg text-[12px] text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 min-w-[150px]"
          />

          {/* Clear all filters — only visible when at least one filter is active */}
          {hasActiveFilter && (
            <button
              onClick={resetFilters}
              title="Clear all filters"
              className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 px-3 py-2 rounded-lg text-[11px] font-bold transition-colors"
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="search"
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-4 pr-9 py-2 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 rounded-lg text-[12px] w-44"
            placeholder="Search..."
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
        </div>

        {/* Add Request — hidden for Admin */}
        {!isAdmin && (
          <button
            onClick={onAddRequest}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-1 shadow-sm transition-all active:scale-95 whitespace-nowrap text-[12px]"
          >
            <Plus size={15} /> Add Request
          </button>
        )}

        {/* ── Avatar + profile dropdown ─────────────────────────────────── */}
        {/*
          FIX: The dropdown is now a SIBLING of the avatar button, not a child.
          Previously the dropdown was rendered inside <button>, so clicking
          Logout (or anywhere in the dropdown) also fired the button's onClick
          toggle — causing the dropdown to immediately reopen after closing.
          Now: button toggles open/close; overlay closes on outside click;
          dropdown sits next to the button, not inside it.
        */}
        <div className="flex items-center gap-3 ml-1 border-l pl-3 border-slate-200">
          {/* User name + role display */}
          <div className="text-right hidden sm:block">
            <p className="text-[12px] font-black text-slate-800 leading-none">{currentUser?.name}</p>
            <p className="text-[11px] text-slate-500">{currentUser?.role} · {currentUser?.dept}</p>
            <p className="text-[11px] text-slate-900">ID : {currentUser?.empId}</p>
          </div>

          {/* Avatar button + dropdown wrapper — position:relative contains the dropdown */}
          <div className="relative flex-shrink-0">

            {/* Avatar button — only toggles open/close, nothing else */}
            <button
              onClick={() => setShowProfile((v) => !v)}
              className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center border-2 border-white shadow-sm hover:bg-indigo-200 transition-colors"
            >
              <span className="font-bold text-sm">{initials}</span>
            </button>

            {/* Dropdown menu — sibling of button, NOT inside it */}
            {showProfile && (
              <>
                {/* Full-screen overlay — click anywhere outside to close */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowProfile(false)}
                />

                {/* Dropdown card */}
                <div className="absolute right-0 top-12 w-52 bg-white rounded-xl shadow-xl border border-slate-100 z-20 overflow-hidden">

                 

                  {/* Admin read-only badge */}
                  {isAdmin && (
                    <div className="px-4 py-2 bg-orange-50 border-b border-orange-100">
                      <p className="text-[10px] font-black text-orange-600 uppercase tracking-wide">
                        👁 Read-Only Access
                      </p>
                    </div>
                  )}

                  {/* Logout button — e.stopPropagation() is NOT needed here
                      because the dropdown is no longer inside the toggle button */}
                  <button
                    onClick={() => {
                      setShowProfile(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-red-500 hover:bg-red-50 transition-colors font-bold text-[12px]"
                  >
                    <LogOut size={15} /> Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Sub-bar: count + instructions ────────────────────────────────── */}
      <div className="flex items-center justify-between px-1">
        <p className="text-[14px] text-green-600 font-bold">
          {requestCount} {requestCount === 1 ? "request" : "requests"}
          {hasActiveFilter && (
            <span className="text-slate-400 font-normal text-[12px] ml-1">(filtered)</span>
          )}
        </p>
        <button
          onClick={onShowInstructions}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-black text-[12px] shadow-md transition-all active:scale-95"
        >
          <BookOpen size={14} /> Instructions
        </button>
      </div>
    </div>
  );
}