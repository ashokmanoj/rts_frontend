/**
 * pages/AdminReportPage.jsx
 */

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { get } from "../services/api";
import {
  ArrowLeft, Clock, Search, Calendar, X, ChevronDown,
  BarChart3, Users, ChevronRight,
} from "lucide-react";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const TODAY = new Date().toLocaleDateString("en-IN", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function fmtDate(dateStr) {
  if (!dateStr) return "Never";
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtDuration(minutes) {
  if (!minutes || minutes <= 0) return "0 min";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} hrs ${m} min` : `${h} hrs`;
}

function fmtDay(isoDate) {
  const d = new Date(isoDate);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function dayName(isoDate) {
  return DAY_NAMES[new Date(isoDate).getDay()];
}

export default function AdminReportPage() {
  const [activeTab,    setActiveTab]    = useState("users");
  const [report,       setReport]       = useState([]);
  const [deptReport,   setDeptReport]   = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [filters, setFilters] = useState({
    search: "", status: "all", empId: "all", dept: "all",
    startDate: null, endDate: null,
  });

  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    const endpoint = activeTab === "users" ? "/admin/user-log-report" : "/admin/dept-tracking-report";
    get(endpoint)
      .then(data => {
        if (activeTab === "users") setReport(data);
        else setDeptReport(data);
      })
      .catch(err => console.error("Failed to load report", err))
      .finally(() => setLoading(false));
  }, [activeTab]);

  const toggleRow = (empId) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(empId)) next.delete(empId); else next.add(empId);
      return next;
    });
  };

  const dropdownOptions = useMemo(() => {
    const depts = [...new Set(report.map(u => u.dept))].sort();
    const users = report
      .map(u => ({ id: u.empId, name: `${u.name} (${u.empId})` }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return { depts, users };
  }, [report]);

  const filteredReport = useMemo(() => {
    if (activeTab !== "users") return [];
    return report.filter(user => {
      const term = filters.search.toLowerCase().trim();
      const matchesSearch = !term ||
        user.name.toLowerCase().includes(term) ||
        user.empId.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term);
      const matchesStatus = filters.status === "all" ||
        (filters.status === "active" && user.isActive) ||
        (filters.status === "inactive" && !user.isActive);
      const matchesUser = filters.empId === "all" || user.empId === filters.empId;
      const matchesDept = filters.dept === "all" || user.dept === filters.dept;
      let matchesDate = true;
      if (user.lastLogin && (filters.startDate || filters.endDate)) {
        const loginDate = new Date(user.lastLogin);
        if (filters.startDate) { const s = new Date(filters.startDate); s.setHours(0,0,0,0); if (loginDate < s) matchesDate = false; }
        if (filters.endDate)   { const e = new Date(filters.endDate);   e.setHours(23,59,59,999); if (loginDate > e) matchesDate = false; }
      } else if (!user.lastLogin && (filters.startDate || filters.endDate)) {
        matchesDate = false;
      }
      return matchesSearch && matchesStatus && matchesUser && matchesDept && matchesDate;
    });
  }, [report, filters, activeTab]);

  const filteredDeptReport = useMemo(() => {
    if (activeTab !== "depts") return [];
    const term = filters.search.toLowerCase().trim();
    return deptReport.filter(d => !term || d.deptName.toLowerCase().includes(term));
  }, [deptReport, filters.search, activeTab]);

  const resetFilters = () =>
    setFilters({ search: "", status: "all", empId: "all", dept: "all", startDate: null, endDate: null });

  const hasFilter = filters.search || filters.status !== "all" || filters.empId !== "all" ||
                    filters.dept !== "all" || filters.startDate;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8fafc]">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans flex flex-col">

      {/* ══════════════════════════════════════════════════════════
          STICKY HEADER
      ══════════════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-30 bg-[#f8fafc] pt-4 sm:pt-6 px-3 sm:px-8 border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto">

          {/* Title row */}
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/")}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <ArrowLeft size={22} className="text-slate-600" />
              </button>
              <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">
                  Admin Analytics
                </h1>
                <p className="text-slate-500 text-[11px] font-bold uppercase mt-0.5 tracking-wider">
                  System Activity &amp; Performance
                </p>
                {/* ── Current Date ── */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Calendar size={11} className="text-indigo-400" />
                  <span className="text-[11px] font-black text-indigo-600">{TODAY}</span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                onClick={() => setActiveTab("users")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
                  activeTab === "users" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Users size={13} /> User Logs
              </button>
              <button
                onClick={() => setActiveTab("depts")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
                  activeTab === "depts" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <BarChart3 size={13} /> Dept Performance
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-slate-100 mb-4 flex flex-wrap items-end gap-3">
            {/* Search */}
            <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Search</label>
              <div className="relative">
                <input
                  type="text"
                  value={filters.search}
                  onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
                  placeholder={activeTab === "users" ? "Name, ID or Email..." : "Search Department..."}
                  className="w-full bg-slate-50 border border-slate-200 py-1.5 pl-8 pr-4 rounded-xl text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
              </div>
            </div>

            {activeTab === "users" && (
              <>
                <div className="flex flex-col gap-1 min-w-[130px] flex-1 sm:flex-none sm:min-w-[160px]">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Select User</label>
                  <div className="relative">
                    <select
                      value={filters.empId}
                      onChange={e => setFilters(p => ({ ...p, empId: e.target.value }))}
                      className="w-full appearance-none bg-slate-50 border border-slate-200 py-1.5 pl-3 pr-8 rounded-xl text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
                    >
                      <option value="all">All Users</option>
                      {dropdownOptions.users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
                  </div>
                </div>

                <div className="flex flex-col gap-1 min-w-[110px] flex-1 sm:flex-none sm:min-w-[130px]">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Department</label>
                  <div className="relative">
                    <select
                      value={filters.dept}
                      onChange={e => setFilters(p => ({ ...p, dept: e.target.value }))}
                      className="w-full appearance-none bg-slate-50 border border-slate-200 py-1.5 pl-3 pr-8 rounded-xl text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
                    >
                      <option value="all">All Dept</option>
                      {dropdownOptions.depts.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
                  </div>
                </div>

                <div className="flex flex-col gap-1 w-24">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Status</label>
                  <div className="relative">
                    <select
                      value={filters.status}
                      onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}
                      className="w-full appearance-none bg-slate-50 border border-slate-200 py-1.5 pl-3 pr-8 rounded-xl text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
                    >
                      <option value="all">All</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
                  </div>
                </div>

                <div className="flex flex-col gap-1 min-w-[210px]">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Date Range (Last Login)</label>
                  <div className="relative">
                    <DatePicker
                      selectsRange={true}
                      startDate={filters.startDate}
                      endDate={filters.endDate}
                      onChange={([start, end]) => setFilters(p => ({ ...p, startDate: start, endDate: end }))}
                      isClearable={true}
                      placeholderText="Select Date Range"
                      className="w-full bg-slate-50 border border-slate-200 py-1.5 pl-8 pr-4 rounded-xl text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
                    />
                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                  </div>
                </div>
              </>
            )}

            {hasFilter && (
              <button
                onClick={resetFilters}
                className="h-8 px-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-black text-[10px] transition-all flex items-center gap-1 border border-red-100"
              >
                <X size={13} /> CLEAR
              </button>
            )}
          </div>

        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          SCROLLABLE TABLE BODY
      ══════════════════════════════════════════════════════════ */}
      <div className="flex-1 px-3 sm:px-8 py-4 sm:py-6">
        <div className="max-w-7xl mx-auto">

          <div className="bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden mb-8">
            {/* Table wrapper — fixed height + both-axis scroll so thead sticky works */}
            <div className="overflow-auto" style={{ maxHeight: "calc(100vh - 310px)" }}>

              {activeTab === "users" ? (
                <table className="w-full text-left border-collapse min-w-[820px]">
                  <thead className="sticky top-0 z-20">
                    <tr className="bg-slate-50 border-b-2 border-slate-200">
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest w-10">#</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">User ID</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">User Details</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Dept</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Contact</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Last Login</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Total Usage</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Daily</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-[11px]">
                    {filteredReport.length > 0 ? (
                      filteredReport.map((user, idx) => {
                        const isExpanded = expandedRows.has(user.empId);
                        const maxHours = Math.max(...(user.dailyUsage || []).map(d => d.hours), 0.1);
                        return (
                          <>
                            {/* ── Main row ── */}
                            <tr key={user.empId} className={`hover:bg-slate-50/60 transition-all group ${isExpanded ? "bg-indigo-50/30" : ""}`}>
                              <td className="px-4 py-3 font-bold text-slate-400">{idx + 1}</td>
                              <td className="px-4 py-3">
                                <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-lg font-bold text-[9px]">
                                  {user.empId}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-col">
                                  <span className="font-black text-slate-800 group-hover:text-indigo-600 transition-colors">{user.name}</span>
                                  <span className="text-slate-400 text-[10px]">{user.email}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 font-bold text-slate-600">{user.dept}</td>
                              <td className="px-4 py-3 text-slate-500 font-medium">{user.phone}</td>
                              <td className="px-4 py-3 text-slate-500 font-medium whitespace-nowrap">{fmtDate(user.lastLogin)}</td>
                              <td className="px-4 py-3 text-center">
                                <div className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-black text-[10px] border border-indigo-100">
                                  <Clock size={10} />
                                  {fmtDuration(user.totalUsageMinutes)}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <span className={`inline-flex w-2 h-2 rounded-full ${user.isActive ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" : "bg-slate-300"}`} />
                                  <span className={`font-black uppercase text-[9px] ${user.isActive ? "text-green-600" : "text-slate-400"}`}>
                                    {user.isActive ? "Active" : "Inactive"}
                                  </span>
                                </div>
                              </td>
                              {/* ── Expand toggle ── */}
                              <td className="px-4 py-3 text-center">
                                {user.dailyUsage?.length > 0 ? (
                                  <button
                                    onClick={() => toggleRow(user.empId)}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-black text-[9px] border transition-all ${
                                      isExpanded
                                        ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                                        : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200"
                                    }`}
                                  >
                                    <ChevronRight
                                      size={11}
                                      className={`transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                                    />
                                    {user.dailyUsage.length}d
                                  </button>
                                ) : (
                                  <span className="text-slate-300 text-[10px]">—</span>
                                )}
                              </td>
                            </tr>

                            {/* ── Expanded day-wise breakdown ── */}
                            {isExpanded && (
                              <tr key={`${user.empId}-expand`} className="bg-indigo-50/20">
                                <td colSpan={9} className="px-6 py-0">
                                  <div className="py-3 pl-10 pr-4">
                                    <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                      <Clock size={10} /> Daily Usage — {user.name}
                                    </p>
                                    <div className="overflow-x-auto rounded-xl border border-indigo-100">
                                      <table className="w-full text-left min-w-[420px]">
                                        <thead>
                                          <tr className="bg-indigo-100/60 text-[9px] font-black text-indigo-600 uppercase tracking-widest">
                                            <th className="px-4 py-2">Date</th>
                                            <th className="px-4 py-2">Day</th>
                                            <th className="px-4 py-2 text-center">Hours Used</th>
                                            <th className="px-4 py-2 text-center">Minutes</th>
                                            <th className="px-4 py-2 min-w-[140px]">Usage Bar</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {user.dailyUsage.map((d, i) => {
                                            const pct = Math.min((d.hours / maxHours) * 100, 100);
                                            const color = d.hours >= 4 ? "bg-green-500" : d.hours >= 2 ? "bg-indigo-500" : d.hours >= 1 ? "bg-amber-400" : "bg-slate-300";
                                            return (
                                              <tr
                                                key={d.date}
                                                className={`border-t border-indigo-50 text-[11px] ${i % 2 === 0 ? "bg-white" : "bg-indigo-50/30"}`}
                                              >
                                                <td className="px-4 py-2 font-bold text-slate-700 whitespace-nowrap">{fmtDay(d.date)}</td>
                                                <td className="px-4 py-2">
                                                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[9px] font-black">
                                                    {dayName(d.date)}
                                                  </span>
                                                </td>
                                                <td className="px-4 py-2 text-center">
                                                  <span className="font-black text-indigo-700">{fmtDuration(d.minutes)}</span>
                                                </td>
                                                <td className="px-4 py-2 text-center text-slate-500 font-medium">{d.minutes} min</td>
                                                <td className="px-4 py-2">
                                                  <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                                      <div
                                                        className={`h-full rounded-full transition-all duration-500 ${color}`}
                                                        style={{ width: `${pct}%` }}
                                                      />
                                                    </div>
                                                    <span className="text-[9px] text-slate-400 font-bold w-8 text-right">{Math.round(pct)}%</span>
                                                  </div>
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                        <tfoot>
                                          <tr className="bg-indigo-100/50 border-t-2 border-indigo-200 text-[10px] font-black">
                                            <td className="px-4 py-2 text-slate-600" colSpan={2}>Total ({user.dailyUsage.length} days)</td>
                                            <td className="px-4 py-2 text-center text-indigo-700">{fmtDuration(user.totalUsageMinutes)}</td>
                                            <td className="px-4 py-2 text-center text-slate-500">
                                              {user.dailyUsage.reduce((s, d) => s + d.minutes, 0)} min
                                            </td>
                                            <td className="px-4 py-2" />
                                          </tr>
                                        </tfoot>
                                      </table>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={9} className="px-6 py-20 text-center text-slate-400 uppercase font-black text-[11px]">
                          No matching records
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

              ) : (

                /* ── Dept Performance table ── */
                <table className="w-full text-left border-collapse min-w-[640px]">
                  <thead className="sticky top-0 z-20">
                    <tr className="bg-slate-50 border-b-2 border-slate-200">
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Department</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Total</th>
                      <th className="px-6 py-4 text-[9px] font-black text-blue-500 uppercase tracking-widest text-center">Open</th>
                      <th className="px-6 py-4 text-[9px] font-black text-orange-500 uppercase tracking-widest text-center">Pending</th>
                      <th className="px-6 py-4 text-[9px] font-black text-green-600 uppercase tracking-widest text-center">Resolved</th>
                      <th className="px-6 py-4 text-[9px] font-black text-red-500 uppercase tracking-widest text-center">Rejected</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Avg. Res. Time</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Efficiency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-[11px]">
                    {filteredDeptReport.length > 0 ? (
                      filteredDeptReport.map(dept => (
                        <tr key={dept.deptName} className="hover:bg-slate-50/50 transition-all">
                          <td className="px-6 py-4 font-black text-slate-800">{dept.deptName}</td>
                          <td className="px-6 py-4 text-center font-bold text-slate-600">{dept.total}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`font-black ${dept.open > 5 ? "text-red-500 underline decoration-wavy" : "text-blue-600"}`}>
                              {dept.open}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-orange-500">{dept.pending}</td>
                          <td className="px-6 py-4 text-center font-bold text-green-600">{dept.closed}</td>
                          <td className="px-6 py-4 text-center font-bold text-red-400">{dept.rejected}</td>
                          <td className="px-6 py-4 text-center text-slate-500 font-medium">
                            {dept.avgResolutionDays === "N/A" ? "—" : `${dept.avgResolutionDays} days`}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                <div
                                  className={`h-full transition-all duration-700 ${
                                    dept.efficiency > 80 ? "bg-green-500" : dept.efficiency > 50 ? "bg-orange-400" : "bg-red-500"
                                  }`}
                                  style={{ width: `${dept.efficiency}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-black text-slate-700">{dept.efficiency}%</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-6 py-20 text-center text-slate-400 uppercase font-black text-[11px]">
                          No data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

            </div>{/* end overflow-auto */}
          </div>

          <div className="flex items-center justify-between px-2 pb-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {activeTab === "users"
                ? `Showing ${filteredReport.length} of ${report.length} users`
                : `Tracking performance across ${filteredDeptReport.length} departments`}
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
