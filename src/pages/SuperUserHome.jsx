import { useState, useEffect, useCallback, useRef } from "react";
import { LogOut, Zap, ClipboardList, ShieldCheck, ShieldOff, Users, UtensilsCrossed, BarChart2, RefreshCw, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, ChevronRight, Pencil, Trash2, AlertTriangle, UserPlus, KeyRound, Search, X, Plus, MessageSquare, Mail, Building2, Check, Upload, Paperclip, ChevronLeft, MapPin, Smartphone } from "lucide-react";

import { fetchRequests, fetchFilterOptions, createRequest, submitApproval, acknowledgeRequest, markRequestSeen, markRequestUnread, closeRequest, editRequest, deleteRequest } from "../services/requestService";
import { fetchUserRoles, addUserRole, updateUserRole, toggleUserRole, deleteUserRole } from "../services/userRoleService";
import { fetchHodPendingRequests, submitHodApproval } from "../services/managementService";
import { fetchChat, sendText, sendFile, sendVoice } from "../services/chatService";
import { get, post, patch, del } from "../services/api";
import { adminGetFoodSubscriptions, adminSubscribeUser, adminToggleFoodUser, adminDeleteFoodUser } from "../services/foodService";

import SearchableSelect   from "../components/ui/SearchableSelect";
import FilterBar          from "../components/layout/FilterBar";
import RequestTable       from "../components/table/RequestTable";
import DetailsModal       from "../components/modals/DetailsModal";
import AddRequestModal    from "../components/modals/AddRequestModal";
import CloseTicketModal   from "../components/modals/CloseTicketModal";
import UserManagementPage from "./UserManagementPage";
import FoodPage           from "./FoodPage";
import AdminReportPage    from "./AdminReportPage";

const DEPARTMENTS = ["Academics-Assam","Academics-Karnataka","Academics-Mizoram","Academics-Tripura","Academics-Uttarakhand","Accounts-A","Accounts-G","Animation","Broadcasting-Assam","Broadcasting-Karnataka","Broadcasting-Mizoram","Broadcasting-Tripura","Broadcasting-Uttarakhand","Business Development","Corporate Communications","Documentation","Facilities","Food Committee","Game Development","Govt. Relations","HR","Management","Marketing","Operations-Assam","Operations-Bihar","Operations-Karnataka","Operations-Maharashtra","Operations-Mizoram","Operations-Nagaland","Operations-Tripura","Operations-Uttarakhand","Purchase","RTS Help Desk","Software","Stores-Assam","Stores-Karnataka","Stores-Mizoram","Stores-Tripura","Stores-Uttarakhand","System Admin-Assam","System Admin-Karnataka","System Admin-Uttarakhand","TA Committee","Technical Support"];

// ─────────────────────────────────────────────────────────────────────────────
// Edit Request Modal
// ─────────────────────────────────────────────────────────────────────────────
function EditRequestModal({ req, onClose, onSave }) {
  // ── Basic fields ─────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    purpose:             req.purpose             || "",
    description:         req.description         || "",
    assignedDept:        req.assignedDept        || "",
    dueDate:             req.dueDateRaw ? new Date(req.dueDateRaw).toISOString().split("T")[0] : "",
    assignedPersonEmpId: req.assignedPersonEmpId || "",
    assignedPersonName:  req.assignedPersonName  || "",
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // ── CC state ──────────────────────────────────────────────────────────────────
  const [ccDepts, setCcDepts] = useState(() =>
    req.ccDepts ? req.ccDepts.split(",").map(s => s.trim()).filter(Boolean) : []
  );
  const [ccPersons, setCcPersons] = useState(() => {
    if (!req.ccEmpIds) return [];
    const ids   = req.ccEmpIds.split(",").map(s => s.trim()).filter(Boolean);
    const names = (req.ccPersonNames || "").split(",").map(s => s.trim());
    return ids.map((empId, i) => ({ empId, name: names[i] || empId, dept: null }));
  });
  const [ccPickerOpen,   setCcPickerOpen]   = useState(false);
  const [ccDeptSearch,   setCcDeptSearch]   = useState("");
  const [ccActiveDept,   setCcActiveDept]   = useState(null);
  const [ccDeptUsers,    setCcDeptUsers]    = useState({});
  const [ccLoading,      setCcLoading]      = useState(false);
  const [ccPersonSearch, setCcPersonSearch] = useState("");
  const ccPickerRef = useRef(null);

  // ── File state ────────────────────────────────────────────────────────────────
  const [newFiles,    setNewFiles]    = useState([]);
  const fileInputRef = useRef(null);

  // ── Saving / error ────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  // ── CC picker outside click ───────────────────────────────────────────────────
  useEffect(() => {
    if (!ccPickerOpen) return;
    const close = (e) => {
      if (ccPickerRef.current && !ccPickerRef.current.contains(e.target)) {
        setCcPickerOpen(false);
        setCcActiveDept(null);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [ccPickerOpen]);

  // ── CC helpers ────────────────────────────────────────────────────────────────
  const addCcDept = (dept) => {
    setCcDepts(prev => prev.includes(dept) ? prev : [...prev, dept]);
    setCcPickerOpen(false);
    setCcDeptSearch("");
  };

  const removeCcDept = (dept) => {
    setCcDepts(prev => prev.filter(d => d !== dept));
    setCcPersons(prev => prev.filter(p => p.dept !== dept));
  };

  const removeCcPerson = (empId) => setCcPersons(prev => prev.filter(p => p.empId !== empId));

  const openCcPersonPicker = async (dept) => {
    setCcActiveDept(dept);
    setCcPersonSearch("");
    if (ccDeptUsers[dept] !== undefined) return;
    setCcLoading(true);
    try {
      const data  = await get(`/requests/users-by-dept?depts=${encodeURIComponent(dept)}`);
      const users = Array.isArray(data) ? data : (data?.data ?? []);
      setCcDeptUsers(prev => ({ ...prev, [dept]: users }));
    } catch {
      setCcDeptUsers(prev => ({ ...prev, [dept]: [] }));
    } finally {
      setCcLoading(false);
    }
  };

  const toggleCcPerson = (user) => {
    setCcPersons(prev => {
      const exists = prev.find(p => p.empId === user.empId);
      if (exists) return prev.filter(p => p.empId !== user.empId);
      return [...prev, { empId: user.empId, name: user.name, dept: ccActiveDept }];
    });
  };

  // ── Save ──────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.purpose.trim()) { setError("Purpose is required."); return; }
    setSaving(true); setError("");
    try {
      const fd = new FormData();
      fd.append("purpose",          form.purpose.trim());
      fd.append("description",      form.description.trim());
      fd.append("assignedDept",     form.assignedDept);
      fd.append("dueDate",          form.dueDate || "");
      fd.append("assignedPersonEmpId", form.assignedPersonEmpId.trim());
      fd.append("assignedPersonName",  form.assignedPersonName.trim());

      // CC: persons from a known dept suppress that dept from dept-level CC
      const personDepts = new Set(ccPersons.map(p => p.dept).filter(Boolean));
      const finalCcDepts = ccDepts.filter(d => !personDepts.has(d));
      fd.append("ccDepts",       finalCcDepts.length ? finalCcDepts.join(",") : "");
      fd.append("ccEmpIds",      ccPersons.length ? ccPersons.map(p => p.empId).join(",") : "");
      fd.append("ccPersonNames", ccPersons.length ? ccPersons.map(p => p.name).join(",")  : "");

      newFiles.forEach(f => fd.append("files", f));

      await onSave(req.id, fd);
      onClose();
    } catch (e) { setError(e.message || "Failed to save."); }
    finally { setSaving(false); }
  };

  // ── Derived ───────────────────────────────────────────────────────────────────
  const existingFileUrls  = req.fileUrls  || (req.fileUrl  ? [req.fileUrl]  : []);
  const existingFileNames = req.fileNames || (req.fileName ? [req.fileName] : []);
  const filteredCcDepts   = DEPARTMENTS.filter(d =>
    !ccDepts.includes(d) && d.toLowerCase().includes(ccDeptSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-white font-black text-sm">Edit Request #{req.id}</h2>
            <p className="text-indigo-200 text-[11px]">SuperUser edit — changes are logged in chat</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><XCircle size={20} /></button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && <p className="text-red-600 text-[11px] font-bold bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          {/* Purpose */}
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase">Purpose *</label>
            <input value={form.purpose} onChange={e => set("purpose", e.target.value)}
              className="w-full mt-1 px-3 py-2 text-[12px] border border-slate-200 rounded-xl outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase">Description</label>
            <textarea rows={3} value={form.description} onChange={e => set("description", e.target.value)}
              className="w-full mt-1 px-3 py-2 text-[12px] border border-slate-200 rounded-xl outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none" />
          </div>

          {/* Assigned Dept + Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase">Assigned Dept</label>
              <SearchableSelect value={form.assignedDept} onChange={val => set("assignedDept", val)}
                options={DEPARTMENTS} placeholder="Select dept…" className="mt-1"
                triggerClassName="px-3 py-2 text-[12px] bg-white border border-slate-200 rounded-xl font-bold hover:border-indigo-300" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase">Due Date</label>
              <input type="date" value={form.dueDate} onChange={e => set("dueDate", e.target.value)}
                className="w-full mt-1 px-3 py-2 text-[12px] border border-slate-200 rounded-xl outline-none focus:border-indigo-400" />
            </div>
          </div>

          {/* Assigned Person */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase">Assigned Person EmpID</label>
              <input value={form.assignedPersonEmpId} onChange={e => set("assignedPersonEmpId", e.target.value)}
                className="w-full mt-1 px-3 py-2 text-[12px] border border-slate-200 rounded-xl outline-none focus:border-indigo-400" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase">Assigned Person Name</label>
              <input value={form.assignedPersonName} onChange={e => set("assignedPersonName", e.target.value)}
                className="w-full mt-1 px-3 py-2 text-[12px] border border-slate-200 rounded-xl outline-none focus:border-indigo-400" />
            </div>
          </div>

          {/* ── CC Section ────────────────────────────────────────────────────── */}
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1">
              <Mail size={10} /> Copy To (CC)
              <span className="text-slate-300 font-medium normal-case tracking-normal ml-1">— optional</span>
            </label>

            {/* CC dept chips */}
            {(ccDepts.length > 0 || ccPersons.length > 0) && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {ccDepts.map(dept => (
                  <span key={dept} className="flex items-center gap-1 text-[11px] bg-amber-50 text-amber-700 border border-amber-200 rounded-lg px-2 py-1 font-bold">
                    <Building2 size={10} /> {dept}
                    <button type="button" onClick={() => removeCcDept(dept)} className="text-amber-400 hover:text-amber-600 ml-0.5">
                      <X size={10} />
                    </button>
                  </span>
                ))}
                {ccPersons.map(p => (
                  <span key={p.empId} className="flex items-center gap-1 text-[11px] bg-blue-50 text-blue-700 border border-blue-200 rounded-lg px-2 py-1 font-bold">
                    <Users size={10} /> {p.name}
                    <button type="button" onClick={() => removeCcPerson(p.empId)} className="text-blue-400 hover:text-blue-600 ml-0.5">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* CC picker trigger + dropdown */}
            <div className="relative mt-2" ref={ccPickerRef}>
              <button type="button"
                onClick={() => { setCcPickerOpen(p => !p); setCcActiveDept(null); setCcDeptSearch(""); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] border border-dashed border-slate-200 rounded-xl hover:border-amber-300 text-slate-400 font-medium">
                <Plus size={12} /> Add CC department or person…
              </button>

              {ccPickerOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                  {!ccActiveDept ? (
                    // Dept list
                    <div>
                      <div className="p-2 border-b border-slate-100">
                        <input autoFocus type="text" value={ccDeptSearch}
                          onChange={e => setCcDeptSearch(e.target.value)}
                          placeholder="Search departments…"
                          className="w-full px-3 py-2 text-[12px] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-amber-400" />
                      </div>
                      <div className="max-h-44 overflow-y-auto py-1">
                        {filteredCcDepts.slice(0, 25).map(dept => (
                          <div key={dept} className="flex items-center gap-1 px-3 py-2 hover:bg-slate-50 group">
                            <button type="button" onClick={() => addCcDept(dept)}
                              className="flex-1 text-left text-[12px] font-bold text-slate-700">{dept}</button>
                            <button type="button" onClick={() => openCcPersonPicker(dept)}
                              className="text-[10px] text-indigo-500 font-bold opacity-0 group-hover:opacity-100 px-2 py-0.5 bg-indigo-50 rounded-lg whitespace-nowrap">
                              Pick persons →
                            </button>
                          </div>
                        ))}
                        {filteredCcDepts.length === 0 && (
                          <p className="text-center text-slate-400 text-[11px] py-4">No depts match</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    // Person picker for selected dept
                    <div>
                      <div className="p-2 border-b border-slate-100 flex items-center gap-2">
                        <button type="button" onClick={() => setCcActiveDept(null)} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
                          <ChevronLeft size={14} />
                        </button>
                        <span className="text-[11px] font-black text-slate-700 truncate">{ccActiveDept}</span>
                        <input type="text" value={ccPersonSearch}
                          onChange={e => setCcPersonSearch(e.target.value)}
                          placeholder="Search…"
                          className="ml-auto w-28 px-2 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded-lg outline-none" />
                      </div>
                      <div className="max-h-44 overflow-y-auto py-1">
                        {ccLoading ? (
                          <div className="flex justify-center py-4">
                            <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                          </div>
                        ) : (ccDeptUsers[ccActiveDept] || [])
                            .filter(u => !ccPersonSearch || u.name.toLowerCase().includes(ccPersonSearch.toLowerCase()) || u.empId.toLowerCase().includes(ccPersonSearch.toLowerCase()))
                            .map(user => {
                              const selected = ccPersons.some(p => p.empId === user.empId);
                              return (
                                <button type="button" key={user.empId} onClick={() => toggleCcPerson(user)}
                                  className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 transition-colors ${selected ? "bg-indigo-50" : ""}`}>
                                  <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selected ? "bg-indigo-500 border-indigo-500" : "border-slate-300"}`}>
                                    {selected && <Check size={9} className="text-white" />}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[12px] font-bold text-slate-700 truncate">{user.name}</p>
                                    <p className="text-[10px] text-slate-400">{user.empId} · {user.role}</p>
                                  </div>
                                </button>
                              );
                            })
                        }
                        {!ccLoading && (ccDeptUsers[ccActiveDept] || []).length === 0 && (
                          <p className="text-center text-slate-400 text-[11px] py-4">No users in this dept</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Existing Attachments ──────────────────────────────────────────── */}
          {existingFileUrls.length > 0 && (
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1">
                <Paperclip size={10} /> Existing Attachments
              </label>
              <div className="mt-1.5 space-y-1">
                {existingFileUrls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[12px] text-indigo-600 hover:text-indigo-800 hover:underline truncate">
                    <Paperclip size={11} className="text-slate-400 flex-shrink-0" />
                    {existingFileNames[i] || `Attachment ${i + 1}`}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* ── Add New Attachments ───────────────────────────────────────────── */}
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1">
              <Upload size={10} /> Add New Attachments
            </label>
            <input ref={fileInputRef} type="file" multiple className="hidden"
              onChange={e => {
                setNewFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
                e.target.value = "";
              }} />
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="mt-1 w-full flex items-center justify-center gap-2 px-3 py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-[12px] text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-all">
              <Upload size={14} /> Click to upload files
            </button>
            {newFiles.length > 0 && (
              <div className="mt-1.5 space-y-1">
                {newFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px] bg-slate-50 px-3 py-1.5 rounded-lg">
                    <Paperclip size={11} className="text-slate-400 flex-shrink-0" />
                    <span className="text-slate-700 font-medium truncate flex-1">{f.name}</span>
                    <button type="button" onClick={() => setNewFiles(prev => prev.filter((_, j) => j !== i))}
                      className="text-slate-400 hover:text-red-500 flex-shrink-0">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex gap-3 flex-shrink-0 border-t border-slate-100">
          <button onClick={onClose} disabled={saving}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-black text-[12px] hover:bg-slate-50 transition-all disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[12px] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
            {saving ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</> : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete Confirm Modal
// ─────────────────────────────────────────────────────────────────────────────
function DeleteConfirmModal({ req, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);
  const [error,    setError]    = useState("");

  const handleDelete = async () => {
    setDeleting(true); setError("");
    try { await onConfirm(req.id); onClose(); }
    catch (e) { setError(e.message || "Failed to delete."); setDeleting(false); }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden">
        <div className="px-6 py-5 text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <AlertTriangle size={28} className="text-red-600" />
          </div>
          <h2 className="text-slate-800 font-black text-sm mb-1">Delete Request #{req.id}?</h2>
          <p className="text-slate-500 text-[12px] mb-1">
            <span className="font-bold">"{req.purpose}"</span> by {req.name}
          </p>
          <p className="text-red-500 text-[11px] font-bold">This action is permanent and cannot be undone.</p>
          {error && <p className="text-red-600 text-[11px] font-bold bg-red-50 px-3 py-2 rounded-lg mt-3">{error}</p>}
        </div>
        <div className="px-6 pb-5 flex gap-3">
          <button onClick={onClose} disabled={deleting}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-black text-[12px] hover:bg-slate-50 transition-all disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleDelete} disabled={deleting}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-[12px] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
            {deleting ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Deleting…</> : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Requests Tab — full CRUD (mirrors DashboardPage request section)
// ─────────────────────────────────────────────────────────────────────────────
function RequestsTab({ currentUser, onLogout, onSwitchRole }) {
  const [requests,      setRequests]      = useState([]);
  const [filterOptions, setFilterOptions] = useState({ names: [], depts: [], assignedDepts: [] });
  const [pagination,    setPagination]    = useState({ total: 0, page: 1, limit: 50, totalPages: 1, hasNext: false, hasPrev: false });
  const [filters,       setFilters]       = useState({ name: "", dept: "", assignedDept: "", assignedStatus: "", type: "", priority: "", startDate: null, endDate: null, search: "" });
  const [chatLogs,      setChatLogs]      = useState({});
  const [selectedReq,   setSelectedReq]   = useState(null);
  const [activeModal,   setActiveModal]   = useState(null);
  const [closeTicketReq, setCloseTicketReq] = useState(null);
  const [editReq,       setEditReq]       = useState(null);
  const [deleteReq,     setDeleteReq]     = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [isFiltering,   setIsFiltering]   = useState(false);
  const [currentPage,   setCurrentPage]   = useState(1);
  const [toast,         setToast]         = useState(null);
  const toastRef   = useRef(null);
  const selectedRef = useRef(null);
  const isFetching  = useRef(false);
  const debounce    = useRef(null);

  selectedRef.current = selectedReq;

  const loadRequests = useCallback(async (page = 1, f = {}, silent = false) => {
    if (isFetching.current && !silent) return;
    if (!silent) setIsFiltering(true);
    isFetching.current = true;
    try {
      const res = await fetchRequests({ page, limit: 50, ...f });
      if (res?.data) {
        setRequests(res.data);
        setPagination(res.pagination);
        if (selectedRef.current) {
          const updated = res.data.find(r => r.id === selectedRef.current.id);
          if (updated) setSelectedReq(updated);
        }
      } else {
        setRequests(Array.isArray(res) ? res : []);
      }
      setCurrentPage(page);
    } catch { if (!silent) setLoading(false); }
    finally { setIsFiltering(false); setLoading(false); isFetching.current = false; }
  }, []);

  useEffect(() => {
    fetchFilterOptions().then(setFilterOptions).catch(() => {});
    loadRequests(1, filters);
  }, []);  // eslint-disable-line

  useEffect(() => { loadRequests(currentPage, filters); }, [filters, currentPage]); // eslint-disable-line

  // Heartbeat — tells the server this user is online (for chat tick marks)
  useEffect(() => {
    post("/users/heartbeat", {}).catch(() => {});
    const interval = setInterval(() => post("/users/heartbeat", {}).catch(() => {}), 30_000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefreshChat = useCallback(async (reqId) => {
    try {
      const res = await fetchChat(reqId);
      setChatLogs(prev => ({ ...prev, [reqId]: res?.data ?? res }));
    } catch {}
  }, []);

  const showToast = (type, message) => {
    clearTimeout(toastRef.current);
    setToast({ type, message });
    toastRef.current = setTimeout(() => setToast(null), 4000);
  };

  const handleOpenDetails = async (row) => {
    setSelectedReq(row);
    setActiveModal("details");
    if (!row.seen) {
      setTimeout(async () => {
        setRequests(prev => prev.map(r => r.id === row.id ? { ...r, seen: true } : r));
        await markRequestSeen(row.id).catch(() => {});
      }, 300);
    }
    try {
      const res = await fetchChat(row.id);
      setChatLogs(prev => ({ ...prev, [row.id]: res?.data ?? res }));
    } catch {}
  };

  const handleSendMessage = async (reqId, message) => {
    setChatLogs(prev => ({ ...prev, [reqId]: [...(prev[reqId] || []), message] }));
    try {
      let saved;
      if      (message.type === "message")                          saved = await sendText(reqId, message.text, message.replyTo);
      else if (message.type === "voice")                            saved = await sendVoice(reqId, message.voiceBlob, message.duration, message.replyTo);
      else if (message.type === "file" || message.type === "mixed") saved = await sendFile(reqId, message.fileBlob, message.text, message.replyTo);
      if (saved) {
        setChatLogs(prev => ({ ...prev, [reqId]: (prev[reqId] || []).map(m => m === message ? saved : m) }));
        loadRequests(currentPage, filters, true);
      }
    } catch {}
  };

  const handleApproval = async (reqId, decision, _dt, _u, comment, newDept, checkingDeadline, checkingReason, extras = {}) => {
    const updated = await submitApproval(reqId, decision, comment, newDept, checkingDeadline, checkingReason, extras);
    setRequests(prev => prev.map(r => r.id === reqId ? { ...updated, seen: true } : r));
    if (selectedReq?.id === reqId) setSelectedReq({ ...updated, seen: true });
    try { const res = await fetchChat(reqId); setChatLogs(prev => ({ ...prev, [reqId]: res?.data ?? res })); } catch {}
  };

  const handleAcknowledge = async (reqId, status) => {
    try {
      const updated = await acknowledgeRequest(reqId, status);
      setRequests(prev => prev.map(r => r.id === reqId ? { ...updated, seen: true } : r));
      if (selectedReq?.id === reqId) setSelectedReq({ ...updated, seen: true });
    } catch {}
  };

  const handleAddRequest = async (data) => {
    const saved = await createRequest(data);
    setRequests(prev => [saved, ...prev]);
    setActiveModal(null);
    showToast("success", "Request added successfully.");
  };

  const handleConfirmClose = async (reqId, note, file) => {
    try {
      const updated = await closeRequest(reqId, note, file);
      setRequests(prev => prev.map(r => r.id === reqId ? { ...updated, seen: true } : r));
      setSelectedReq({ ...updated, seen: true });
      const res = await fetchChat(reqId);
      setChatLogs(prev => ({ ...prev, [reqId]: res?.data ?? res }));
    } finally { setCloseTicketReq(null); }
  };

  const handleEdit = async (reqId, data) => {
    const updated = await editRequest(reqId, data);
    setRequests(prev => prev.map(r => r.id === reqId ? { ...updated, seen: true } : r));
    showToast("success", "Request updated.");
  };

  const handleDelete = async (reqId) => {
    await deleteRequest(reqId);
    setRequests(prev => prev.filter(r => r.id !== reqId));
    showToast("success", "Request deleted.");
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2">
      <FilterBar
        currentUser={currentUser}
        filters={filters}
        filterOptions={filterOptions}
        requestCount={pagination.total}
        onFilterChange={f => { setCurrentPage(1); setFilters(f); }}
        onSearchChange={val => {
          clearTimeout(debounce.current);
          debounce.current = setTimeout(() => { setCurrentPage(1); setFilters(p => ({ ...p, search: val })); }, 300);
        }}
        onAddRequest={() => setActiveModal("add")}
        onShowInstructions={() => {}}
        onLogout={onLogout}
        onSwitchRole={onSwitchRole}
      />

      <div className={`flex-1 min-h-0 transition-opacity duration-200 ${isFiltering ? "opacity-50 pointer-events-none" : ""}`}>
        <RequestTable
          requests={requests}
          currentUser={currentUser}
          onOpenDetails={handleOpenDetails}
          onMarkUnread={id => markRequestUnread(id).then(() => loadRequests(currentPage, filters, true))}
          onAcknowledge={handleAcknowledge}
          onEdit={row => setEditReq(row)}
          onDelete={row => setDeleteReq(row)}
        />
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex-shrink-0 flex items-center justify-center gap-3 py-2">
          <button onClick={() => setCurrentPage(p => p - 1)} disabled={!pagination.hasPrev}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all">← Prev</button>
          <span className="text-slate-500 font-medium">Page {pagination.page} of {pagination.totalPages}</span>
          <button onClick={() => setCurrentPage(p => p + 1)} disabled={!pagination.hasNext}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all">Next →</button>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-[200] px-4 py-3 rounded-xl shadow-xl text-white text-sm font-black ${toast.type === "success" ? "bg-emerald-600" : "bg-red-600"}`}>
          {toast.message}
        </div>
      )}

      {activeModal === "details" && selectedReq && (
        <DetailsModal
          key={selectedReq?.id}
          req={selectedReq}
          chatLogs={chatLogs}
          currentUser={currentUser}
          onClose={() => setActiveModal(null)}
          onSendMessage={handleSendMessage}
          onApproval={handleApproval}
          onOpenCloseTicket={() => { setCloseTicketReq(selectedReq); setActiveModal(null); }}
          onAcknowledge={handleAcknowledge}
          onRefreshChat={handleRefreshChat}
        />
      )}
      {activeModal === "add" && (
        <AddRequestModal currentUser={currentUser} onClose={() => setActiveModal(null)} onSubmit={handleAddRequest} />
      )}
      {closeTicketReq && (
        <CloseTicketModal
          req={closeTicketReq}
          onClose={() => setCloseTicketReq(null)}
          onConfirmClose={handleConfirmClose}
        />
      )}
      {editReq && (
        <EditRequestModal req={editReq} onClose={() => setEditReq(null)} onSave={handleEdit} />
      )}
      {deleteReq && (
        <DeleteConfirmModal req={deleteReq} onClose={() => setDeleteReq(null)} onConfirm={handleDelete} />
      )}

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Management Tab — GN route requests with full action panels
// ─────────────────────────────────────────────────────────────────────────────
function MgmtBadge({ status, pending = "Pending" }) {
  if (!status || status === "--") return <span className="text-xs font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">{pending}</span>;
  if (status === "Approved")      return <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Approved</span>;
  if (status === "Rejected")      return <span className="text-xs font-black text-red-700 bg-red-100 px-2 py-0.5 rounded-full">Rejected</span>;
  return <span className="text-xs font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">{status}</span>;
}

function MgmtActionPanel({ row, onSubmit, onCancel, loading }) {
  const [decision, setDecision] = useState(null);
  const [comment,  setComment]  = useState("");

  const options = [
    { key: "Approved", label: "Approve",      cls: { active: "bg-emerald-600 text-white border-emerald-600", idle: "bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50" } },
    ...(row.isGnRoute ? [{ key: "Checking", label: "Checking", cls: { active: "bg-blue-600 text-white border-blue-600", idle: "bg-white text-blue-700 border-blue-300 hover:bg-blue-50" } }] : []),
    { key: "Rejected", label: "Reject",       cls: { active: "bg-red-600 text-white border-red-600",     idle: "bg-white text-red-700 border-red-300 hover:bg-red-50" } },
    { key: "Close",    label: "Close Ticket", cls: { active: "bg-slate-700 text-white border-slate-700", idle: "bg-white text-slate-600 border-slate-300 hover:bg-slate-50" } },
  ];

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
      <p className="text-xs font-black text-amber-800 uppercase tracking-wide">Decision — {row.purpose}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(({ key, label, cls }) => {
          const isCurrent = row.hodStatus === key;
          return (
            <button key={key} onClick={() => !isCurrent && setDecision(key)} disabled={isCurrent}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black transition-all border-2 ${isCurrent ? "opacity-40 cursor-not-allowed bg-slate-100 text-slate-500 border-slate-200" : decision === key ? cls.active : cls.idle}`}>
              {label}
            </button>
          );
        })}
      </div>
      <textarea rows={2} placeholder="Comment (optional)…" value={comment} onChange={e => setComment(e.target.value)}
        className="w-full text-xs border border-amber-200 rounded-lg p-2.5 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-amber-400" />
      <div className="flex gap-2">
        <button onClick={() => { if (decision) onSubmit(row.id, decision, comment); }}
          disabled={!decision || loading}
          className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-black rounded-lg transition-all">
          {loading ? "Submitting…" : "Confirm"}
        </button>
        <button onClick={onCancel} disabled={loading}
          className="px-5 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-black rounded-lg hover:bg-slate-50">
          Cancel
        </button>
      </div>
    </div>
  );
}

function MgmtRow({ row, index, onViewDetails }) {
  const rowBg = row.isClosed ? "bg-emerald-50/40" : row.hodStatus === "Rejected" ? "bg-red-50/40" : "";

  return (
    <tr
      className={`border-b border-slate-100 hover:bg-amber-50/30 transition-colors cursor-pointer ${rowBg}`}
      onClick={() => onViewDetails(row)}
    >
      <td className="px-3 py-3 text-center text-xs text-slate-500 font-bold">{index + 1}</td>
      <td className="px-3 py-3 text-xs text-slate-600 whitespace-nowrap">{row.date}</td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-black text-slate-800">{row.name}</span>
          {row.isGnRoute && <span className="text-[9px] font-black bg-purple-600 text-white px-1.5 py-0.5 rounded-full">GN</span>}
        </div>
        <p className="text-[10px] text-slate-500">{row.empId} · {row.dept}</p>
      </td>
      <td className="px-3 py-3">
        <p className="text-xs font-bold text-blue-600">{row.purpose}</p>
        {row.description && <p className="text-[10px] text-slate-400 truncate max-w-[200px]">{row.description}</p>}
      </td>
      <td className="px-3 py-3 text-xs text-slate-600 whitespace-nowrap">{row.assignedDept || "—"}</td>
      <td className="px-3 py-3 text-center"><MgmtBadge status={row.rmStatus} /></td>
      <td className="px-3 py-3 text-center"><MgmtBadge status={row.hodStatus} /></td>
      <td className="px-3 py-3 text-center" onClick={e => e.stopPropagation()}>
        {row.isClosed ? (
          <button
            onClick={() => onViewDetails(row)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-black rounded-lg transition-all active:scale-95 mx-auto whitespace-nowrap"
          >
            <MessageSquare size={13} /> View Details
          </button>
        ) : (
          <button
            onClick={() => onViewDetails(row)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-[11px] font-black rounded-lg transition-all active:scale-95 mx-auto whitespace-nowrap"
          >
            <ShieldCheck size={13} /> Take Action
          </button>
        )}
      </td>
    </tr>
  );
}

function ManagementTab({ currentUser }) {
  const [rows,          setRows]          = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [selectedReq,   setSelectedReq]   = useState(null);
  const [chatLogs,      setChatLogs]      = useState({});
  const [closeTicketReq, setCloseTicketReq] = useState(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try { const data = await fetchHodPendingRequests(); setRows(Array.isArray(data) ? data : (data?.data ?? [])); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleViewDetails = useCallback(async (row) => {
    setSelectedReq(row);
    try {
      const result = await fetchChat(row.id);
      setChatLogs(prev => ({ ...prev, [row.id]: result?.data ?? result }));
    } catch {}
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
    setRows(prev => prev.map(r => r.id === reqId ? { ...updated, seen: true } : r));
    if (selectedReq?.id === reqId) setSelectedReq({ ...updated, seen: true });
    try {
      const result = await fetchChat(reqId);
      setChatLogs(prev => ({ ...prev, [reqId]: result?.data ?? result }));
    } catch {}
    load(true);
  };

  const handleConfirmClose = async (reqId, note, file) => {
    try {
      const updated = await closeRequest(reqId, note, file);
      setRows(prev => prev.map(r => r.id === reqId ? { ...updated, seen: true } : r));
      if (selectedReq?.id === reqId) setSelectedReq({ ...updated, seen: true });
      const result = await fetchChat(reqId);
      setChatLogs(prev => ({ ...prev, [reqId]: result?.data ?? result }));
    } finally {
      setCloseTicketReq(null);
    }
  };

  return (
    <>
      <div className="flex-1 min-h-0 flex flex-col gap-3">
        <div className="flex items-center justify-between flex-shrink-0">
          <span className="text-[11px] text-slate-500 font-bold">{rows.length} GN route requests</span>
          <button onClick={() => load(true)} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-[11px] font-black rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-all shadow-sm">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
        <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 overflow-auto shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10 bg-amber-600 text-white text-[11px] font-black uppercase tracking-wide">
                <tr>
                  {["Sl.","Date","Employee","Purpose / Desc","Assigned Dept","RM Status","HOD Status","Action"].map(h => (
                    <th key={h} className="px-3 py-3 text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-slate-400 font-medium">No GN route requests found.</td></tr>
                ) : rows.map((r, i) => (
                  <MgmtRow key={r.id} row={r} index={i} onViewDetails={handleViewDetails} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedReq && (
        <DetailsModal
          key={selectedReq?.id}
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
          onConfirmClose={handleConfirmClose}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Food Admin Tab — subscription CRUD + report
// ─────────────────────────────────────────────────────────────────────────────
function FoodAdminTab({ currentUser }) {
  const [subs,          setSubs]          = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [addEmpId,      setAddEmpId]      = useState("");
  const [addPeriod,     setAddPeriod]     = useState("permanent");
  const [addPeriodDate, setAddPeriodDate] = useState("");
  const [addLoading,    setAddLoading]    = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast,         setToast]         = useState(null);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminGetFoodSubscriptions();
      setSubs(Array.isArray(result) ? result : []);
    }
    catch { showToast("error", "Failed to load subscriptions."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!addEmpId.trim()) return;
    if (addPeriod !== "permanent" && !addPeriodDate) {
      showToast("error", `Please select a ${addPeriod === "weekly" ? "date" : "month"}.`);
      return;
    }
    setAddLoading(true);
    try {
      await adminSubscribeUser(addEmpId.trim(), addPeriod, addPeriodDate || null);
      setAddEmpId("");
      setAddPeriod("permanent");
      setAddPeriodDate("");
      await load();
      showToast("success", `Subscribed ${addEmpId.trim()} to food (${addPeriod}).`);
    } catch (e) { showToast("error", e.message || "Failed to subscribe."); }
    finally { setAddLoading(false); }
  };

  const handleToggle = async (empId, current) => {
    try {
      await adminToggleFoodUser(empId, !current);
      setSubs(prev => prev.map(s => s.empId === empId ? { ...s, isActive: !current } : s));
      showToast("success", `User ${!current ? "activated" : "deactivated"}.`);
    } catch { showToast("error", "Failed to update."); }
  };

  const handleDelete = async (empId) => {
    try {
      await adminDeleteFoodUser(empId);
      setSubs(prev => prev.filter(s => s.empId !== empId));
      setConfirmDelete(null);
      showToast("success", "Subscription removed.");
    } catch { showToast("error", "Failed to remove."); }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`px-4 py-3 rounded-xl text-[12px] font-bold border ${toast.type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>
          {toast.msg}
        </div>
      )}

      {/* Subscriptions CRUD table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-orange-50 to-white">
          <div className="flex items-center gap-2">
            <UtensilsCrossed size={18} className="text-orange-500" />
            <h3 className="font-black text-slate-800 text-[14px]">Food Subscriptions</h3>
            <span className="text-[11px] text-slate-400 font-bold">({subs.length} total)</span>
          </div>
          <button onClick={() => load()} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Add subscription */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={addEmpId}
            onChange={e => setAddEmpId(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            placeholder="Employee ID (e.g. GN-2001)"
            className="flex-1 min-w-[160px] px-3 py-2 text-[12px] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
          />
          <SearchableSelect
            value={addPeriod}
            onChange={val => { setAddPeriod(val); setAddPeriodDate(""); }}
            options={[
              { value: "permanent", label: "Permanent" },
              { value: "weekly",    label: "Weekly (1 week)" },
              { value: "monthly",   label: "Monthly (1 month)" },
            ]}
            triggerClassName="px-3 py-2 text-[12px] border border-slate-200 rounded-xl bg-white font-bold text-slate-700 hover:border-orange-300"
          />
          {addPeriod === "weekly" && (
            <input
              type="date"
              value={addPeriodDate}
              onChange={e => setAddPeriodDate(e.target.value)}
              className="px-3 py-2 text-[12px] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
              title="Pick any date within the desired week"
            />
          )}
          {addPeriod === "monthly" && (
            <input
              type="month"
              value={addPeriodDate}
              onChange={e => setAddPeriodDate(e.target.value)}
              className="px-3 py-2 text-[12px] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
              title="Select the month for subscription"
            />
          )}
          <button
            onClick={handleAdd}
            disabled={addLoading || !addEmpId.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-[12px] font-black rounded-xl disabled:opacity-50 transition-all active:scale-95"
          >
            {addLoading ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <UserPlus size={14} />}
            Subscribe
          </button>
        </div>

        {/* Table */}
        <div className="table-scroll">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Sl.No", "Employee ID", "Name", "Department", "Status", "Start Date", "Suspended From", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-black text-slate-400 text-[10px] uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center">
                  <div className="w-6 h-6 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : subs.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400 font-medium text-[12px]">No food subscriptions found.</td></tr>
              ) : subs.map((s, i) => (
                <tr key={s.empId} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-400">{i + 1}</td>
                  <td className="px-4 py-3 font-mono font-bold text-orange-600">{s.empId}</td>
                  <td className="px-4 py-3 font-black text-slate-800">{s.name}</td>
                  <td className="px-4 py-3 text-slate-600">{s.dept}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${s.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.isActive ? "bg-green-500" : "bg-red-400"}`} />
                      {s.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{s.startDate}</td>
                  <td className="px-4 py-3 text-slate-500">{s.suspendedFrom || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggle(s.empId, s.isActive)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all active:scale-95 ${s.isActive ? "bg-amber-50 text-amber-700 hover:bg-amber-100" : "bg-green-50 text-green-700 hover:bg-green-100"}`}
                      >
                        {s.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(s)}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-red-50 text-red-600 hover:bg-red-100 transition-all active:scale-95"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-6 space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 size={22} className="text-red-600" />
              </div>
              <h3 className="font-black text-slate-800">Remove Subscription?</h3>
              <p className="text-[12px] text-slate-500 mt-1">
                Remove food subscription for <span className="font-bold">{confirmDelete.name}</span> ({confirmDelete.empId})?
              </p>
              <p className="text-[11px] text-red-500 font-bold mt-1">All cancellation records will also be deleted.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-black text-[12px] hover:bg-slate-50 transition-all">
                Cancel
              </button>
              <button onClick={() => handleDelete(confirmDelete.empId)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-[12px] transition-all active:scale-95">
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report + notification control embedded from FoodPage */}
      <FoodPage currentUser={currentUser} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// User Roles Tab
// ─────────────────────────────────────────────────────────────────────────────
const ALL_ROLES = ["Requestor","RM","HOD","DeptHOD","Management","Admin","HR","FoodCommittee","Intern","SuperUser","ViewCloseTicket","ProjectView"];

function RoleModal({ title, initial, onSave, onClose, excludeEmpId }) {
  const [empId, setEmpId] = useState(initial?.empId || "");
  const [role,  setRole]  = useState(initial?.role  || "Requestor");
  const [dept,  setDept]  = useState(initial?.dept  || "");
  const [err,   setErr]   = useState("");
  const [saving,setSaving]= useState(false);
  const isEdit = !!initial?.id;

  const handleSave = async () => {
    if (!isEdit && !empId.trim()) { setErr("Emp ID is required."); return; }
    if (!dept.trim()) { setErr("Department is required."); return; }
    setSaving(true); setErr("");
    try {
      await onSave(isEdit ? initial.id : empId.trim(), role, dept);
      onClose();
    } catch (e) { setErr(e.message || "Failed."); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-slate-800 text-[15px]">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={15}/></button>
        </div>
        {err && <p className="text-red-600 text-[11px] font-bold bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}
        {!isEdit && (
          <div className="space-y-1">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Emp ID</label>
            <input value={empId} onChange={e => setEmpId(e.target.value)} placeholder="e.g. AC-1053"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:border-indigo-400"/>
          </div>
        )}
        {isEdit && (
          <div className="bg-slate-50 rounded-xl px-3 py-2 text-[12px] text-slate-600 font-bold">
            {initial.empId} — {initial.name}
          </div>
        )}
        <div className="space-y-1">
          <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Role</label>
          <SearchableSelect
            value={role}
            onChange={setRole}
            options={ALL_ROLES}
            placeholder="Select role…"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Department</label>
          <SearchableSelect
            value={dept}
            onChange={setDept}
            options={DEPARTMENTS}
            placeholder="Select department…"
          />
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-black text-[12px] hover:bg-slate-50 transition-all">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-[12px] transition-all active:scale-95">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function UserRolesTab() {
  const [rows,         setRows]         = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [search,       setSearch]       = useState("");
  const [filterRole,   setFilterRole]   = useState("");
  const [filterDept,   setFilterDept]   = useState("");
  const [addModal,     setAddModal]     = useState(false);
  const [editEntry,    setEditEntry]    = useState(null);
  const [deleteEntry,  setDeleteEntry]  = useState(null);
  const [deleting,     setDeleting]     = useState(false);
  const [toast,        setToast]        = useState(null);

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchUserRoles({ search, role: filterRole, dept: filterDept });
      setRows(data);
    } catch (e) { showToast("error", e.message || "Failed to load."); }
    finally { setLoading(false); }
  }, [search, filterRole, filterDept]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (empId, role, dept) => {
    await addUserRole(empId, role, dept);
    showToast("success", `Role added for ${empId}.`);
    load();
  };

  const handleEdit = async (id, role, dept) => {
    await updateUserRole(id, role, dept);
    showToast("success", "Role updated.");
    load();
  };

  const handleToggle = async (row) => {
    try {
      await toggleUserRole(row.id);
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, isActive: !r.isActive } : r));
      showToast("success", `Role ${row.isActive ? "disabled" : "enabled"}.`);
    } catch (e) { showToast("error", e?.response?.data?.error || e.message || "Failed."); }
  };

  const handleDelete = async () => {
    if (!deleteEntry) return;
    setDeleting(true);
    try {
      await deleteUserRole(deleteEntry.id);
      showToast("success", `Role deleted.`);
      setDeleteEntry(null);
      load();
    } catch (e) { showToast("error", e.message || "Failed."); }
    finally { setDeleting(false); }
  };

  const ROLE_COLORS = {
    SuperUser: "bg-yellow-100 text-yellow-800", Admin: "bg-orange-100 text-orange-700",
    Management: "bg-rose-100 text-rose-700", DeptHOD: "bg-teal-100 text-teal-700",
    HOD: "bg-purple-100 text-purple-700", RM: "bg-blue-100 text-blue-700",
    Requestor: "bg-slate-100 text-slate-600", HR: "bg-pink-100 text-pink-700",
    FoodCommittee: "bg-green-100 text-green-700", Intern: "bg-indigo-100 text-indigo-600",
  };

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`px-4 py-3 rounded-xl text-[12px] font-bold border ${toast.type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>
          {toast.msg}
        </div>
      )}

      {/* Header + filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white">
          <div className="flex items-center gap-2">
            <KeyRound size={18} className="text-indigo-500"/>
            <h3 className="font-black text-slate-800 text-[14px]">User Roles</h3>
            <span className="text-[11px] text-slate-400 font-bold">({rows.length} entries)</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""}/>
            </button>
            <button onClick={() => setAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[12px] transition-all active:scale-95 shadow-sm">
              <Plus size={13}/> Add Role
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by Emp ID or Name…"
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-[12px] bg-white focus:outline-none focus:border-indigo-400"/>
          </div>
          <SearchableSelect
            value={filterRole}
            onChange={setFilterRole}
            options={ALL_ROLES}
            placeholder="All Roles"
            className="w-36"
          />
          <SearchableSelect
            value={filterDept}
            onChange={setFilterDept}
            options={DEPARTMENTS}
            placeholder="All Departments"
            className="w-52"
          />
          {(search || filterRole || filterDept) && (
            <button onClick={() => { setSearch(""); setFilterRole(""); setFilterDept(""); }}
              className="flex items-center gap-1 px-2.5 py-2 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-500 hover:bg-slate-100 bg-white transition-all">
              <X size={11}/> Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left font-black text-slate-500 uppercase tracking-wider text-[10px]">#</th>
                <th className="px-4 py-3 text-left font-black text-slate-500 uppercase tracking-wider text-[10px]">Emp ID</th>
                <th className="px-4 py-3 text-left font-black text-slate-500 uppercase tracking-wider text-[10px]">Name</th>
                <th className="px-4 py-3 text-left font-black text-slate-500 uppercase tracking-wider text-[10px]">Role</th>
                <th className="px-4 py-3 text-left font-black text-slate-500 uppercase tracking-wider text-[10px]">Department</th>
                <th className="px-4 py-3 text-center font-black text-slate-500 uppercase tracking-wider text-[10px]">Status</th>
                <th className="px-4 py-3 text-center font-black text-slate-500 uppercase tracking-wider text-[10px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400 font-bold">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400 font-bold">No roles found.</td></tr>
              ) : rows.map((r, i) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-400 font-bold">{i + 1}</td>
                  <td className="px-4 py-3 font-black text-slate-700">{r.empId}</td>
                  <td className="px-4 py-3 text-slate-600 font-medium">{r.name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${ROLE_COLORS[r.role] || "bg-slate-100 text-slate-600"}`}>{r.role}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 font-medium">{r.dept}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${r.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${r.isActive ? "bg-green-500" : "bg-red-400"}`} />
                      {r.isActive ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => setEditEntry(r)}
                        className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-50 transition-all" title="Edit">
                        <Pencil size={13}/>
                      </button>
                      <button onClick={() => handleToggle(r)}
                        className={`p-1.5 rounded-lg transition-all ${r.isActive ? "text-amber-500 hover:bg-amber-50" : "text-green-600 hover:bg-green-50"}`}
                        title={r.isActive ? "Disable" : "Enable"}>
                        {r.isActive ? <ShieldOff size={13}/> : <ShieldCheck size={13}/>}
                      </button>
                      <button onClick={() => setDeleteEntry(r)}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-all" title="Delete">
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {addModal && (
        <RoleModal title="Add Role" initial={null} onSave={handleAdd} onClose={() => setAddModal(false)}/>
      )}

      {/* Edit Modal */}
      {editEntry && (
        <RoleModal title="Edit Role" initial={editEntry} onSave={handleEdit} onClose={() => setEditEntry(null)}/>
      )}

      {/* Delete Confirm */}
      {deleteEntry && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-6 space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 size={22} className="text-red-600"/>
              </div>
              <h3 className="font-black text-slate-800">Delete Role Entry?</h3>
              <p className="text-[12px] text-slate-500 mt-1">
                Remove <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${ROLE_COLORS[deleteEntry.role] || "bg-slate-100 text-slate-600"}`}>{deleteEntry.role}</span> in <span className="font-bold">{deleteEntry.dept}</span> for <span className="font-bold">{deleteEntry.empId}</span>?
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteEntry(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-black text-[12px] hover:bg-slate-50 transition-all">Cancel</button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black text-[12px] transition-all active:scale-95">
                {deleting ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mobile Users Tab
// ─────────────────────────────────────────────────────────────────────────────
function MobileUsersTab() {
  const [dauDays,     setDauDays]     = useState([]);
  const [loadingD,    setLoadingD]    = useState(true);
  const [expandedDay, setExpandedDay] = useState(null);

  const loadDau = useCallback(async () => {
    setLoadingD(true);
    try {
      const to   = new Date();
      const from = new Date(to); from.setDate(from.getDate() - 29);
      const fmt  = d => d.toISOString().slice(0, 10);
      const data = await get(`/analytics/dau?from=${fmt(from)}&to=${fmt(to)}&detail=true`);
      setDauDays(data.days || []);
    } catch { /* silent */ }
    finally { setLoadingD(false); }
  }, []);

  useEffect(() => {
    loadDau();
    const id = setInterval(loadDau, 30_000);
    return () => clearInterval(id);
  }, [loadDau]);

  const fmtDate = (s) => {
    if (!s) return "—";
    const [y, m, d] = s.split("-");
    return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };
  const fmtTime = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayDau = dauDays.find(d => d.date === todayStr)?.count ?? 0;
  const maxDau   = Math.max(...dauDays.map(d => d.count), 1);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 bg-gradient-to-r from-violet-50 to-white border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 rounded-xl"><BarChart2 size={18} className="text-violet-600"/></div>
            <div>
              <h2 className="font-black text-slate-800 text-[15px] leading-none">App Sessions</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Daily active users · last 30 days</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-3 py-1.5 bg-violet-100 rounded-xl text-[12px] font-black text-violet-700 flex items-center gap-1.5">
              <BarChart2 size={11}/> {todayDau} Active Today
            </div>
            <button onClick={loadDau}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all" title="Refresh">
              <RefreshCw size={14} className={loadingD ? "animate-spin" : ""}/>
            </button>
          </div>
        </div>

        <div className="p-5">
            {loadingD ? (
              <p className="text-center py-14 text-slate-400 font-bold">Loading session data…</p>
            ) : dauDays.length === 0 ? (
              <p className="text-center py-14 text-slate-400 font-bold">No app sessions recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {/* Mini bar chart */}
                <div className="mb-5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Last 30 days — Daily Active Users</p>
                  <div className="flex items-end gap-1 h-20">
                    {[...dauDays].reverse().map(d => {
                      const pct = Math.max(6, Math.round((d.count / maxDau) * 100));
                      const isT = d.date === todayStr;
                      return (
                        <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5 group cursor-pointer"
                          onClick={() => setExpandedDay(expandedDay === d.date ? null : d.date)}>
                          <span className="text-[8px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold">{d.count}</span>
                          <div
                            className={`w-full rounded-t-sm transition-all ${isT ? "bg-violet-500" : "bg-indigo-300 group-hover:bg-indigo-500"}`}
                            style={{ height: `${pct}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-400 font-bold mt-1">
                    <span>{fmtDate([...dauDays].reverse()[0]?.date)}</span>
                    <span>Today</span>
                  </div>
                </div>

                {/* Day rows */}
                {dauDays.map(day => (
                  <div key={day.date} className="border border-slate-200 rounded-xl overflow-hidden">
                    {/* Row header */}
                    <button
                      className="w-full flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                      onClick={() => setExpandedDay(expandedDay === day.date ? null : day.date)}
                    >
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${day.date === todayStr ? "bg-violet-500" : "bg-indigo-400"}`}/>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-slate-800 text-[13px]">{fmtDate(day.date)}{day.date === todayStr && <span className="ml-2 text-[10px] bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full font-black">Today</span>}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-xl text-[12px] font-black">
                          {day.count} user{day.count !== 1 ? "s" : ""} active
                        </div>
                        {/* Bar */}
                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-400 rounded-full transition-all" style={{ width: `${Math.round((day.count / maxDau) * 100)}%` }}/>
                        </div>
                        <ChevronRight size={14} className={`text-slate-400 transition-transform ${expandedDay === day.date ? "rotate-90" : ""}`}/>
                      </div>
                    </button>

                    {/* Expanded user list */}
                    {expandedDay === day.date && (
                      <div className="border-t border-slate-100">
                        <table className="w-full text-[12px]">
                          <thead>
                            <tr className="bg-slate-50">
                              <th className="px-4 py-2 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">#</th>
                              <th className="px-4 py-2 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Name</th>
                              <th className="px-4 py-2 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Emp ID</th>
                              <th className="px-4 py-2 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Department</th>
                              <th className="px-4 py-2 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Last Ping</th>
                              <th className="px-4 py-2 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Platform</th>
                              <th className="px-4 py-2 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Version</th>
                              <th className="px-4 py-2 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Build</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(day.users || []).map((u, i) => (
                              <tr key={u.empId} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-2.5 text-slate-400 font-bold">{i + 1}</td>
                                <td className="px-4 py-2.5 font-black text-slate-800">{u.name}</td>
                                <td className="px-4 py-2.5 font-mono font-bold text-indigo-600">{u.empId}</td>
                                <td className="px-4 py-2.5 text-slate-600 font-medium">{u.dept || "—"}</td>
                                <td className="px-4 py-2.5 text-slate-500 font-medium">{fmtTime(u.lastPing)}</td>
                                <td className="px-4 py-2.5">
                                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-black capitalize">{u.platform || "mobile"}</span>
                                </td>
                                <td className="px-4 py-2.5 font-mono font-bold text-slate-700">{u.versionName || "—"}</td>
                                <td className="px-4 py-2.5 text-slate-400 font-medium">{u.appVersion ?? "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Org Setup Tab — Departments & Locations management
// ─────────────────────────────────────────────────────────────────────────────
function OrgSetupTab() {
  const [depts,        setDepts]        = useState([]);
  const [locs,         setLocs]         = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [loadingLocs,  setLoadingLocs]  = useState(true);

  const [deptShowAdd,  setDeptShowAdd]  = useState(false);
  const [deptAddName,  setDeptAddName]  = useState("");
  const [deptAdding,   setDeptAdding]   = useState(false);
  const [deptEdit,     setDeptEdit]     = useState(null);
  const [deptEditName, setDeptEditName] = useState("");
  const [deptDelId,    setDeptDelId]    = useState(null);
  const [deptDeleting, setDeptDeleting] = useState(false);

  const [locShowAdd,   setLocShowAdd]   = useState(false);
  const [locAddName,   setLocAddName]   = useState("");
  const [locAdding,    setLocAdding]    = useState(false);
  const [locEdit,      setLocEdit]      = useState(null);
  const [locEditName,  setLocEditName]  = useState("");
  const [locDelId,     setLocDelId]     = useState(null);
  const [locDeleting,  setLocDeleting]  = useState(false);

  const [toast, setToast] = useState(null);
  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const loadDepts = useCallback(async () => {
    setLoadingDepts(true);
    try { const data = await get("/admin/departments"); setDepts(data); }
    catch { showToast("error", "Failed to load departments."); }
    finally { setLoadingDepts(false); }
  }, []);

  const loadLocs = useCallback(async () => {
    setLoadingLocs(true);
    try { const data = await get("/admin/locations"); setLocs(data); }
    catch { showToast("error", "Failed to load locations."); }
    finally { setLoadingLocs(false); }
  }, []);

  useEffect(() => { loadDepts(); loadLocs(); }, [loadDepts, loadLocs]);

  // ── Dept actions ────────────────────────────────────────────────────────────
  const handleDeptAdd = async () => {
    if (!deptAddName.trim()) return;
    setDeptAdding(true);
    try {
      await post("/admin/departments", { name: deptAddName.trim() });
      showToast("success", "Department added.");
      setDeptAddName(""); setDeptShowAdd(false); loadDepts();
    } catch (e) { showToast("error", e?.response?.data?.error || "Failed to add."); }
    finally { setDeptAdding(false); }
  };

  const handleDeptSaveEdit = async () => {
    if (!deptEditName.trim() || !deptEdit) return;
    try {
      await patch(`/admin/departments/${deptEdit.id}`, { name: deptEditName.trim() });
      showToast("success", "Department updated.");
      setDeptEdit(null); loadDepts();
    } catch (e) { showToast("error", e?.response?.data?.error || "Failed to update."); }
  };

  const handleDeptToggle = async (d) => {
    try {
      await patch(`/admin/departments/${d.id}`, { isActive: !d.isActive });
      setDepts(prev => prev.map(x => x.id === d.id ? { ...x, isActive: !x.isActive } : x));
    } catch { showToast("error", "Failed to update status."); }
  };

  const handleDeptDelete = async () => {
    setDeptDeleting(true);
    try {
      await del(`/admin/departments/${deptDelId}`);
      showToast("success", "Department deleted.");
      setDeptDelId(null); loadDepts();
    } catch (e) { showToast("error", e?.response?.data?.error || "Failed to delete."); }
    finally { setDeptDeleting(false); }
  };

  // ── Loc actions ─────────────────────────────────────────────────────────────
  const handleLocAdd = async () => {
    if (!locAddName.trim()) return;
    setLocAdding(true);
    try {
      await post("/admin/locations", { name: locAddName.trim() });
      showToast("success", "Location added.");
      setLocAddName(""); setLocShowAdd(false); loadLocs();
    } catch (e) { showToast("error", e?.response?.data?.error || "Failed to add."); }
    finally { setLocAdding(false); }
  };

  const handleLocSaveEdit = async () => {
    if (!locEditName.trim() || !locEdit) return;
    try {
      await patch(`/admin/locations/${locEdit.id}`, { name: locEditName.trim() });
      showToast("success", "Location updated.");
      setLocEdit(null); loadLocs();
    } catch (e) { showToast("error", e?.response?.data?.error || "Failed to update."); }
  };

  const handleLocToggle = async (l) => {
    try {
      await patch(`/admin/locations/${l.id}`, { isActive: !l.isActive });
      setLocs(prev => prev.map(x => x.id === l.id ? { ...x, isActive: !x.isActive } : x));
    } catch { showToast("error", "Failed to update status."); }
  };

  const handleLocDelete = async () => {
    setLocDeleting(true);
    try {
      await del(`/admin/locations/${locDelId}`);
      showToast("success", "Location deleted.");
      setLocDelId(null); loadLocs();
    } catch (e) { showToast("error", e?.response?.data?.error || "Failed to delete."); }
    finally { setLocDeleting(false); }
  };

  const EntryRow = ({ item, onEdit, onToggle, onDelete, accentColor }) => (
    <div className={`flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors ${!item.isActive ? "opacity-50" : ""}`}>
      <span className="flex-1 text-[12px] font-bold text-slate-700 truncate">{item.name}</span>
      {!item.isActive && <span className="text-[10px] font-black text-red-400 uppercase">Inactive</span>}
      <button onClick={() => onEdit(item)} className={`p-1.5 rounded-lg transition-all text-${accentColor}-500 hover:bg-${accentColor}-50`} title="Edit"><Pencil size={12}/></button>
      <button onClick={() => onToggle(item)} className={`p-1.5 rounded-lg transition-all ${item.isActive ? "text-amber-500 hover:bg-amber-50" : "text-green-500 hover:bg-green-50"}`} title={item.isActive ? "Deactivate" : "Activate"}>
        {item.isActive ? <ShieldOff size={12}/> : <ShieldCheck size={12}/>}
      </button>
      <button onClick={() => onDelete(item.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Delete"><Trash2 size={12}/></button>
    </div>
  );

  return (
    <div className="space-y-5">
      {toast && (
        <div className={`px-4 py-3 rounded-xl text-[12px] font-bold border ${toast.type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>
          {toast.msg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── Departments ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white">
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-indigo-500"/>
              <h3 className="font-black text-slate-800 text-[14px]">Departments</h3>
              <span className="text-[11px] text-slate-400 font-bold">({depts.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={loadDepts} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
                <RefreshCw size={13} className={loadingDepts ? "animate-spin" : ""}/>
              </button>
              <button onClick={() => { setDeptShowAdd(v => !v); setDeptAddName(""); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[12px] transition-all active:scale-95 shadow-sm">
                <Plus size={13}/> Add
              </button>
            </div>
          </div>

          {deptShowAdd && (
            <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2">
              <input autoFocus value={deptAddName} onChange={e => setDeptAddName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleDeptAdd()}
                placeholder="New department name…"
                className="flex-1 px-3 py-2 border border-indigo-200 rounded-xl text-[12px] bg-white focus:outline-none focus:border-indigo-400"/>
              <button onClick={handleDeptAdd} disabled={deptAdding || !deptAddName.trim()}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-black text-[12px] transition-all">
                {deptAdding ? "…" : <Check size={14}/>}
              </button>
              <button onClick={() => setDeptShowAdd(false)} className="px-3 py-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all"><X size={14}/></button>
            </div>
          )}

          <div className="overflow-y-auto max-h-[440px] divide-y divide-slate-50">
            {loadingDepts ? (
              <div className="text-center py-10 text-slate-400 font-bold text-[12px]">Loading…</div>
            ) : depts.length === 0 ? (
              <div className="text-center py-10 text-slate-400 font-bold text-[12px]">No departments yet.</div>
            ) : depts.map(d => (
              <div key={d.id} className={`flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors ${!d.isActive ? "opacity-50" : ""}`}>
                {deptEdit?.id === d.id ? (
                  <>
                    <input autoFocus value={deptEditName} onChange={e => setDeptEditName(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleDeptSaveEdit()}
                      className="flex-1 px-2 py-1 border border-indigo-300 rounded-lg text-[12px] focus:outline-none focus:border-indigo-500"/>
                    <button onClick={handleDeptSaveEdit} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Check size={13}/></button>
                    <button onClick={() => setDeptEdit(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={13}/></button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-[12px] font-bold text-slate-700 truncate">{d.name}</span>
                    {!d.isActive && <span className="text-[10px] font-black text-red-400 uppercase">Inactive</span>}
                    <button onClick={() => { setDeptEdit(d); setDeptEditName(d.name); }} className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all" title="Edit"><Pencil size={12}/></button>
                    <button onClick={() => handleDeptToggle(d)} className={`p-1.5 rounded-lg transition-all ${d.isActive ? "text-amber-500 hover:bg-amber-50" : "text-green-500 hover:bg-green-50"}`} title={d.isActive ? "Deactivate" : "Activate"}>
                      {d.isActive ? <ShieldOff size={12}/> : <ShieldCheck size={12}/>}
                    </button>
                    <button onClick={() => setDeptDelId(d.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Delete"><Trash2 size={12}/></button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Locations ───────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-white">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-emerald-600"/>
              <h3 className="font-black text-slate-800 text-[14px]">Locations</h3>
              <span className="text-[11px] text-slate-400 font-bold">({locs.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={loadLocs} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
                <RefreshCw size={13} className={loadingLocs ? "animate-spin" : ""}/>
              </button>
              <button onClick={() => { setLocShowAdd(v => !v); setLocAddName(""); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[12px] transition-all active:scale-95 shadow-sm">
                <Plus size={13}/> Add
              </button>
            </div>
          </div>

          {locShowAdd && (
            <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
              <input autoFocus value={locAddName} onChange={e => setLocAddName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLocAdd()}
                placeholder="New location name…"
                className="flex-1 px-3 py-2 border border-emerald-200 rounded-xl text-[12px] bg-white focus:outline-none focus:border-emerald-400"/>
              <button onClick={handleLocAdd} disabled={locAdding || !locAddName.trim()}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-black text-[12px] transition-all">
                {locAdding ? "…" : <Check size={14}/>}
              </button>
              <button onClick={() => setLocShowAdd(false)} className="px-3 py-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all"><X size={14}/></button>
            </div>
          )}

          <div className="overflow-y-auto max-h-[440px] divide-y divide-slate-50">
            {loadingLocs ? (
              <div className="text-center py-10 text-slate-400 font-bold text-[12px]">Loading…</div>
            ) : locs.length === 0 ? (
              <div className="text-center py-10 text-slate-400 font-bold text-[12px]">No locations yet.</div>
            ) : locs.map(l => (
              <div key={l.id} className={`flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors ${!l.isActive ? "opacity-50" : ""}`}>
                {locEdit?.id === l.id ? (
                  <>
                    <input autoFocus value={locEditName} onChange={e => setLocEditName(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleLocSaveEdit()}
                      className="flex-1 px-2 py-1 border border-emerald-300 rounded-lg text-[12px] focus:outline-none focus:border-emerald-500"/>
                    <button onClick={handleLocSaveEdit} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Check size={13}/></button>
                    <button onClick={() => setLocEdit(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={13}/></button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-[12px] font-bold text-slate-700 truncate">{l.name}</span>
                    {!l.isActive && <span className="text-[10px] font-black text-red-400 uppercase">Inactive</span>}
                    <button onClick={() => { setLocEdit(l); setLocEditName(l.name); }} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="Edit"><Pencil size={12}/></button>
                    <button onClick={() => handleLocToggle(l)} className={`p-1.5 rounded-lg transition-all ${l.isActive ? "text-amber-500 hover:bg-amber-50" : "text-green-500 hover:bg-green-50"}`} title={l.isActive ? "Deactivate" : "Activate"}>
                      {l.isActive ? <ShieldOff size={12}/> : <ShieldCheck size={12}/>}
                    </button>
                    <button onClick={() => setLocDelId(l.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Delete"><Trash2 size={12}/></button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Delete confirm — Dept */}
      {deptDelId && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-6 space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3"><Trash2 size={22} className="text-red-600"/></div>
              <h3 className="font-black text-slate-800">Delete Department?</h3>
              <p className="text-[12px] text-slate-500 mt-1"><span className="font-bold">{depts.find(d => d.id === deptDelId)?.name}</span> will be permanently removed.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeptDelId(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-black text-[12px] hover:bg-slate-50 transition-all">Cancel</button>
              <button onClick={handleDeptDelete} disabled={deptDeleting} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black text-[12px] transition-all active:scale-95">
                {deptDeleting ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm — Loc */}
      {locDelId && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-6 space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3"><Trash2 size={22} className="text-red-600"/></div>
              <h3 className="font-black text-slate-800">Delete Location?</h3>
              <p className="text-[12px] text-slate-500 mt-1"><span className="font-bold">{locs.find(l => l.id === locDelId)?.name}</span> will be permanently removed.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setLocDelId(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-black text-[12px] hover:bg-slate-50 transition-all">Cancel</button>
              <button onClick={handleLocDelete} disabled={locDeleting} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black text-[12px] transition-all active:scale-95">
                {locDeleting ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab bar button
// ─────────────────────────────────────────────────────────────────────────────
function TabBtn({ label, icon, active, onClick }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[12px] transition-all whitespace-nowrap ${
        active ? "bg-yellow-400 text-slate-900 shadow" : "text-slate-400 hover:text-white hover:bg-white/10"
      }`}>
      {icon} {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main SuperUser Home
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { key: "requests",   label: "Requests",        icon: <ClipboardList size={14} /> },
  { key: "management", label: "GN Requests",      icon: <ShieldCheck size={14} /> },
  { key: "users",      label: "Users",             icon: <Users size={14} /> },
  { key: "roles",      label: "Roles",             icon: <KeyRound size={14} /> },
  { key: "food",       label: "Food",              icon: <UtensilsCrossed size={14} /> },
  { key: "report",     label: "Admin Report",      icon: <BarChart2 size={14} /> },
  { key: "mobile",     label: "Mobile Users",      icon: <Smartphone size={14} /> },
  { key: "orgsetup",   label: "Org Setup",         icon: <Building2 size={14} /> },
];

export default function SuperUserHome({ currentUser, onLogout, onSwitchRole }) {
  const [activeTab, setActiveTab] = useState("requests");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 font-sans flex flex-col" style={{ height: "100dvh" }}>

      {/* Header */}
      <header className="flex-shrink-0 border-b border-white/10">
        <div className="max-w-full px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
              <Zap size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-white font-black text-base tracking-tight leading-tight">Super User Hub</h1>
              <p className="text-slate-400 text-[10px] font-medium">Full system access · {currentUser?.name} · {currentUser?.empId}</p>
            </div>
          </div>
          <button onClick={onLogout}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2 rounded-xl text-xs font-black transition-all active:scale-95 flex-shrink-0">
            <LogOut size={14} /> Logout
          </button>
        </div>

        {/* Tab bar */}
        <div className="px-4 sm:px-6 pb-2 flex gap-1 overflow-x-auto">
          {TABS.map(t => (
            <TabBtn key={t.key} label={t.label} icon={t.icon} active={activeTab === t.key} onClick={() => setActiveTab(t.key)} />
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden">

        {/* Requests — has its own FilterBar so no extra padding needed */}
        {activeTab === "requests" && (
          <div className="flex-1 min-h-0 flex flex-col gap-2 px-3 sm:px-6 pt-3 pb-6 overflow-hidden">
            <RequestsTab currentUser={currentUser} onLogout={onLogout} onSwitchRole={onSwitchRole} />
          </div>
        )}

        {/* GN Requests */}
        {activeTab === "management" && (
          <div className="flex-1 min-h-0 flex flex-col px-3 sm:px-6 py-4 pb-6 overflow-hidden">
            <ManagementTab currentUser={currentUser} />
          </div>
        )}

        {/* Users — UserManagementPage is designed to be embedded */}
        {activeTab === "users" && (
          <div className="flex-1 min-h-0 overflow-y-auto bg-[#f8fafc]">
            <UserManagementPage currentUser={currentUser} />
          </div>
        )}

        {/* Roles — User Roles CRUD */}
        {activeTab === "roles" && (
          <div className="flex-1 min-h-0 overflow-y-auto bg-[#f8fafc] p-4 sm:p-6">
            <UserRolesTab />
          </div>
        )}

        {/* Food — admin CRUD + report */}
        {activeTab === "food" && (
          <div className="flex-1 min-h-0 overflow-y-auto bg-[#f8fafc] p-4 sm:p-6">
            <FoodAdminTab currentUser={currentUser} />
          </div>
        )}

        {/* Admin Report — AdminReportPage embedded */}
        {activeTab === "report" && (
          <div className="flex-1 min-h-0 overflow-y-auto bg-[#f8fafc]">
            <AdminReportPage />
          </div>
        )}

        {/* Mobile Users */}
        {activeTab === "mobile" && (
          <div className="flex-1 min-h-0 overflow-y-auto bg-[#f8fafc] p-4 sm:p-6">
            <MobileUsersTab />
          </div>
        )}

        {/* Org Setup — Departments & Locations management */}
        {activeTab === "orgsetup" && (
          <div className="flex-1 min-h-0 overflow-y-auto bg-[#f8fafc] p-4 sm:p-6">
            <OrgSetupTab />
          </div>
        )}
      </main>
    </div>
  );
}
