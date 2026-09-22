/**
 * pages/UserManagementPage.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * User management interface for HR DeptHOD and Admins.
 * Allows creating new users and enabling/disabling existing ones.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { get, post, patch } from "../services/api";
import { fetchDepartments, fetchLocations } from "../services/requestService";
import {
  UserPlus,
  UserMinus,
  UserCheck,
  Search,
  X,
  ChevronDown,
  Save,
  ShieldAlert,
  Users,
  Edit2,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  CheckCircle2,
  Upload,
  Download,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  Check
} from "lucide-react";
import SearchableSelect from "../components/ui/SearchableSelect";

const ROLES = ["Requestor", "RM", "HOD", "DeptHOD", "Management", "Admin", "Intern", "ViewCloseTicket"];

const DESIGNATIONS = [
  "Associate Cloud Data Engineer", "2D Animator", "2D Artist", "3D Animator", "3D Artist",
  "3D Generalist", "3D Modelling", "Academic head-Education and Training", "Accounts Executive",
  "AI Artist", "AI Developer", "Assistant", "Assistant Finance Manager",
  "Asst Executive - Management", "Asst. Manager Operations", "Asst.HR Manager",
  "Business Development Executive", "CEO", "Chief Operating Officer", "Content Writer",
  "Coordinator", "Data Analyst", "Data Coordinator", "Data Engineer", "Data Entry Operator",
  "Digital Artist", "Digital Marketing Executive", "Director", "Documentation", "DTP",
  "Educator", "Engineer", "Executive", "Executive Vice President", "EXECUTIVE-HR",
  "Facilitator-analyst and notes", "Finance Associate", "Finance Manager", "Flutter Developer",
  "Full Stack Developer", "FX Artist", "Game Designer", "Game Developer",
  "GM - Operation Sales", "Head - Corporate Communications", "HOD - Biology",
  "HOD - Mathematics", "Jr. Recruiter", "Jr.Executive", "Lead-Project Launch & Transition",
  "Manager", "Manager L&D- Academic", "Motion Graphic Artist", "Network Engineer",
  "Office Executive", "Operation Executive", "Presenter", "Procurement Manager",
  "Program Manager", "Project coordinator", "Project Manager", "Purchase Executive",
  "Purchase Manager", "Quality Executive", "Regional Manager", "Sales Executive",
  "Senior Academic Expert - Science", "Senior Accountant-Cost", "Senior Excutive",
  "Software Architect", "Software Developer", "Sr Accountant", "Sr. 2D Animator",
  "Sr. Network Engineer", "Sr. Recruitment Consultant", "Sr. Subject Matter Expert - Biology",
  "Sr. Subject Matter Expert - FLN", "Sr. Subject Matter Expert - Physics",
  "Sr. Tech Executive", "Sr.Project Manager", "Sr.Subject Matter Expert - Chemistry",
  "Sr.Subject Matter Expert - English", "Sr.Subject Matter Expert - Mathematics",
  "Sr.Subject Matter Expert -Physics", "Store Executive", "Stores Cum MIS Executive",
  "Studio Engeneer", "Studio Engineer", "Studio Manager/IT manager",
  "Subject Matter Expert - Biology", "Subject Matter Expert - Chemistry",
  "Subject Matter Expert - Computer", "Subject Matter Expert - Economics",
  "Subject Matter Expert - English", "Subject Matter Expert - FLN",
  "Subject matter expert - Geography", "Subject Matter Expert - Mathematics",
  "Subject Matter Expert - Physics", "Subject Matter Expert - Political Science",
  "Subject Matter Expert -Physics", "System Admin", "System Administrator",
  "Team Lead", "Team Lead - FLN", "Team Lead - Kokrajhar", "Team Lead - Silchar",
  "Team Lead-Operations", "Technical Executive", "Technical Material Management",
  "Technical Support Executive", "Technology Management Executive", "TL-Technical Support",
  "Trainee", "VFX Artist", "Vice President", "Video Editor", "MIS Executive"
];

function EmpIdPicker({ value, onChange, users, placeholder = "Search by ID or name…" }) {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState("");
  const ref                   = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = users.find(u => u.empId === value);
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return users.slice(0, 80);
    return users.filter(u =>
      u.empId.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)
    ).slice(0, 80);
  }, [users, query]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => { setOpen(v => !v); setQuery(""); }}
        className="w-full flex items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-400 focus:outline-none text-left"
      >
        {selected ? (
          <span className="flex flex-col leading-tight">
            <span className="font-black text-slate-800 text-[12px]">{selected.empId}</span>
            <span className="text-[10px] text-slate-500 font-medium">{selected.name}</span>
          </span>
        ) : (
          <span className="text-slate-400 font-medium text-[12px]">{placeholder}</span>
        )}
        <div className="flex items-center gap-1 flex-shrink-0">
          {value && (
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
              className="p-0.5 hover:bg-red-100 hover:text-red-500 rounded-full transition-colors"
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search ID or name…"
                className="w-full pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[12px] font-medium focus:ring-2 focus:ring-indigo-400 focus:outline-none"
              />
            </div>
          </div>
          <ul className="max-h-48 overflow-y-auto divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-[11px] text-slate-400 font-bold text-center">No users found</li>
            ) : filtered.map(u => (
              <li
                key={u.empId}
                onClick={() => { onChange(u.empId); setOpen(false); setQuery(""); }}
                className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors hover:bg-indigo-50 ${value === u.empId ? "bg-indigo-50" : ""}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-black text-slate-800 truncate">{u.empId} — {u.name}</p>
                  <p className="text-[10px] text-slate-400 font-medium truncate">{u.dept} · {u.role}</p>
                </div>
                {value === u.empId && <Check size={13} className="text-indigo-600 flex-shrink-0" />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function UserManagementPage({ currentUser }) {
  const [departments, setDepartments] = useState([]);
  const [locations,   setLocations]   = useState([]);
  useEffect(() => {
    fetchDepartments().then(setDepartments).catch(() => {});
    fetchLocations().then(setLocations).catch(() => {});
  }, []);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState(null);
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwShowNew, setPwShowNew] = useState(false);
  const [pwShowConfirm, setPwShowConfirm] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwCopied, setPwCopied] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkRows, setBulkRows] = useState([]);
  const [bulkFileName, setBulkFileName] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  const [formData, setFormData] = useState({
    empId: "",
    name: "",
    email: "",
    phone: "",
    altPhone: "",
    role: "Requestor",
    dept: "HR",
    designation: "",
    location: "Bangalore",
    password: "Test@123",
    rmEmpId: "",
    hodEmpId: ""
  });

  const [editFormData, setEditFormData] = useState({
    empId: "",
    name: "",
    email: "",
    phone: "",
    altPhone: "",
    role: "",
    dept: "",
    designation: "",
    location: "",
    rmEmpId: "",
    hodEmpId: ""
  });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await get("/admin/user-log-report");
      setUsers(data);
    } catch (err) {
      console.error("Failed to load users", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const term = search.toLowerCase().trim();
    return users.filter(u => 
      u.name.toLowerCase().includes(term) || 
      u.empId.toLowerCase().includes(term) || 
      u.email.toLowerCase().includes(term) ||
      u.dept.toLowerCase().includes(term)
    );
  }, [users, search]);

  const handleToggleStatus = async (empId, currentStatus) => {
    try {
      await patch(`/admin/toggle-status/${empId}`, { isActive: !currentStatus });
      setUsers(prev => prev.map(u => u.empId === empId ? { ...u, isActive: !currentStatus } : u));
      setSuccess(`User ${!currentStatus ? 'enabled' : 'disabled'} successfully.`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Failed to update user status.");
      setTimeout(() => setError(""), 4000);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await post("/admin/create-user", formData);
      setSuccess("User created successfully!");
      setShowAddModal(false);
      setFormData({
        empId: "",
        name: "",
        email: "",
        phone: "",
        role: "Requestor",
        dept: "HR",
        designation: "",
        location: "Bangalore",
        password: "Test@123",
        rmEmpId: "",
        hodEmpId: ""
      });
      loadUsers();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create user.");
    }
  };

  const handleEditClick = (user) => {
    setEditFormData({
      empId: user.empId,
      name: user.name,
      email: user.email,
      phone: user.phone === "N/A" ? "" : user.phone,
      altPhone: user.altPhone || "",
      role: user.role,
      dept: user.dept,
      designation: user.designation || "",
      location: user.location || "",
      rmEmpId: user.rmEmpId || "",
      hodEmpId: user.hodEmpId || ""
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await patch(`/admin/update-user/${editFormData.empId}`, editFormData);
      setSuccess("User updated successfully!");
      setShowEditModal(false);
      loadUsers();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update user.");
    }
  };

  const openPasswordModal = (user) => {
    setPasswordTarget(user);
    setPwNew("");
    setPwConfirm("");
    setPwError("");
    setPwSuccess("");
    setPwCopied(false);
    setPwShowNew(false);
    setPwShowConfirm(false);
    setShowPasswordModal(true);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setPwError("");
    if (pwNew.length < 6) { setPwError("Password must be at least 6 characters."); return; }
    if (pwNew !== pwConfirm) { setPwError("Passwords do not match."); return; }
    setPwLoading(true);
    try {
      await patch(`/admin/reset-password/${passwordTarget.empId}`, { newPassword: pwNew });
      setPwSuccess(pwNew);
      setPwNew("");
      setPwConfirm("");
    } catch (err) {
      setPwError(err.response?.data?.error || "Failed to reset password.");
    } finally {
      setPwLoading(false);
    }
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(pwSuccess);
    setPwCopied(true);
    setTimeout(() => setPwCopied(false), 2000);
  };

  // ── Bulk upload helpers ───────────────────────────────────────────────────────
  const CSV_HEADERS = ["empId","name","email","phone","role","dept","designation","location","password","rmEmpId","hodEmpId"];

  const downloadTemplate = () => {
    const header  = CSV_HEADERS.join(",");
    const example = "AI-001,John Doe,john.doe@company.com,9876543210,Requestor,HR,Software Engineer,Bangalore,Test@123,,";
    const blob = new Blob([`${header}\n${example}\n`], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "bulk_user_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSVLine = (line) => {
    const result = []; let cur = ""; let inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === "," && !inQ) { result.push(cur.trim()); cur = ""; }
      else { cur += ch; }
    }
    result.push(cur.trim());
    return result;
  };

  const validateRow = (row) => {
    const errs = [];
    if (!row.empId?.trim())   errs.push("empId required");
    if (!row.name?.trim())    errs.push("name required");
    if (!row.email?.trim())   errs.push("email required");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim())) errs.push("invalid email");
    if (!row.password?.trim()) errs.push("password required");
    return errs;
  };

  const HEADER_NORM = {
    "empid": "empId", "emp_id": "empId", "employeeid": "empId", "employee id": "empId", "user id": "empId", "userid": "empId",
    "name": "name", "fullname": "name", "full name": "name",
    "email": "email", "emailid": "email", "email id": "email",
    "phone": "phone", "mobile": "phone", "phonenumber": "phone", "phone number": "phone",
    "role": "role",
    "dept": "dept", "department": "dept",
    "designation": "designation",
    "location": "location",
    "password": "password", "pass": "password", "pwd": "password",
    "rmempid": "rmEmpId", "rm_emp_id": "rmEmpId", "rmid": "rmEmpId", "rm id": "rmEmpId", "reporting manager id": "rmEmpId",
    "hodempid": "hodEmpId", "hod_emp_id": "hodEmpId", "hodid": "hodEmpId", "hod id": "hodEmpId", "hod employee id": "hodEmpId",
  };

  const handleBulkFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkFileName(file.name);
    setBulkResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text  = ev.target.result;
      const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { setBulkRows([]); return; }
      const rawHeaders = parseCSVLine(lines[0]);
      const headers = rawHeaders.map(h => {
        const key = h.toLowerCase().trim().replace(/\s+/g, " ");
        return HEADER_NORM[key] || key;
      });
      const rows = lines.slice(1).map((line, idx) => {
        const vals = parseCSVLine(line);
        const obj  = {};
        headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
        return { _row: idx + 2, ...obj, _errors: validateRow(obj) };
      });
      setBulkRows(rows);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleBulkUpload = async () => {
    const valid = bulkRows.filter(r => r._errors.length === 0);
    if (!valid.length) return;
    setBulkLoading(true);
    try {
      const payload = valid.map(({ _row, _errors, ...rest }) => rest);
      const result  = await post("/admin/bulk-create-users", { users: payload });
      setBulkResult(result);
      loadUsers();
    } catch (err) {
      setError(err.message || "Bulk upload failed.");
      setShowBulkModal(false);
    } finally {
      setBulkLoading(false);
    }
  };

  const closeBulkModal = () => {
    setShowBulkModal(false);
    setBulkRows([]);
    setBulkFileName("");
    setBulkResult(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
            <Users size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 leading-none">User Management</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-wider">Create and manage system users</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          <div className="relative flex-1 sm:flex-none">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium w-full sm:w-64 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          </div>

          <button
            onClick={() => { setBulkResult(null); setBulkRows([]); setBulkFileName(""); setShowBulkModal(true); }}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-black text-[12px] shadow-md transition-all active:scale-95 whitespace-nowrap"
          >
            <Upload size={16} /> BULK UPLOAD
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-black text-[12px] shadow-md transition-all active:scale-95 whitespace-nowrap"
          >
            <UserPlus size={16} /> CREATE USER
          </button>
        </div>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-[12px] font-bold flex items-center gap-2 animate-fade-in">
          <UserCheck size={16} /> {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-[12px] font-bold flex items-center gap-2 animate-fade-in">
          <ShieldAlert size={16} /> {error}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="table-scroll">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sl.No</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">User ID</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Dept & Role</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">RM & HOD ID</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                {currentUser?.role === "SuperUser" && (
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Password</th>
                )}
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-[12px]">
              {loading ? (
                <tr>
                  <td colSpan={currentUser?.role === "SuperUser" ? 8 : 7} className="px-6 py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-slate-400 font-bold uppercase text-[10px]">Loading users...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user, idx) => (
                  <tr key={user.empId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-400">{idx + 1}</td>
                    <td className="px-6 py-4 font-mono font-bold text-indigo-600">{user.empId}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-800">{user.name}</span>
                        <span className="text-slate-500 text-[10px]">{user.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700">{user.dept}</span>
                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter">{user.role}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">RM: <span className="text-slate-800">{user.rmEmpId || "N/A"}</span></span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">HOD: <span className="text-slate-800">{user.hodEmpId || "N/A"}</span></span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-black text-[10px] uppercase ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                        {user.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    {currentUser?.role === "SuperUser" && (
                      <td className="px-6 py-4 text-center">
                        <span className="font-mono text-slate-400 text-[13px] tracking-widest">••••••••</span>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditClick(user)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all active:scale-95"
                          title="Edit User"
                        >
                          <Edit2 size={16} />
                        </button>
                        {currentUser?.role === "SuperUser" && (
                          <button
                            onClick={() => openPasswordModal(user)}
                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-all active:scale-95"
                            title="Reset Password"
                          >
                            <KeyRound size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleStatus(user.empId, user.isActive)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black text-[10px] transition-all active:scale-95 ${user.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                        >
                          {user.isActive ? (
                            <><UserMinus size={14} /> DISABLE</>
                          ) : (
                            <><UserCheck size={14} /> ENABLE</>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={currentUser?.role === "SuperUser" ? 8 : 7} className="px-6 py-20 text-center">
                    <p className="text-slate-400 font-black uppercase text-[12px]">No users found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Upload Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full sm:max-w-3xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-zoom-in flex flex-col max-h-[92dvh]">

            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-emerald-50/50 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-600 text-white rounded-xl"><Upload size={20}/></div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">Bulk Upload Users</h3>
                  <p className="text-[11px] text-slate-500 font-bold">Upload a CSV file to create multiple users at once</p>
                </div>
              </div>
              <button onClick={closeBulkModal} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors"><X size={20}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">

              {/* Results screen */}
              {bulkResult ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
                      <CheckCircle size={24} className="text-emerald-600 flex-shrink-0"/>
                      <div>
                        <p className="text-2xl font-black text-emerald-700">{bulkResult.created.length}</p>
                        <p className="text-[11px] font-black text-emerald-600 uppercase tracking-wider">Users Created</p>
                      </div>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
                      <XCircle size={24} className="text-red-500 flex-shrink-0"/>
                      <div>
                        <p className="text-2xl font-black text-red-600">{bulkResult.failed.length}</p>
                        <p className="text-[11px] font-black text-red-500 uppercase tracking-wider">Failed</p>
                      </div>
                    </div>
                  </div>

                  {bulkResult.failed.length > 0 && (
                    <div className="border border-red-200 rounded-2xl overflow-hidden">
                      <p className="text-[10px] font-black text-red-600 uppercase tracking-wider px-4 py-2 bg-red-50 border-b border-red-200">Failed Rows</p>
                      <div className="divide-y divide-red-50 max-h-48 overflow-y-auto">
                        {bulkResult.failed.map((f, i) => (
                          <div key={i} className="flex items-start gap-2 px-4 py-2.5">
                            <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5"/>
                            <div>
                              <p className="text-[12px] font-black text-slate-700">{f.empId || "—"} · {f.name || "—"}</p>
                              <p className="text-[11px] text-red-600 font-medium">{f.reason}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button onClick={closeBulkModal} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black transition-all active:scale-95">
                    DONE
                  </button>
                </div>
              ) : (
                <>
                  {/* Download template */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <FileText size={20} className="text-emerald-600 flex-shrink-0"/>
                      <div>
                        <p className="text-[13px] font-black text-slate-800">Download CSV Template</p>
                        <p className="text-[11px] text-slate-500 font-medium">Fill in the template and upload it below</p>
                      </div>
                    </div>
                    <button onClick={downloadTemplate} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl font-black text-[12px] transition-all active:scale-95 whitespace-nowrap flex-shrink-0">
                      <Download size={14}/> Template
                    </button>
                  </div>

                  {/* File upload area */}
                  <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-300 hover:border-emerald-400 rounded-2xl p-8 cursor-pointer transition-colors bg-slate-50 hover:bg-emerald-50/30">
                    <input type="file" accept=".csv" className="hidden" onChange={handleBulkFileChange}/>
                    <Upload size={28} className="text-slate-400"/>
                    {bulkFileName ? (
                      <div className="text-center">
                        <p className="font-black text-slate-700 text-[13px]">{bulkFileName}</p>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">{bulkRows.length} rows found · click to change file</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="font-black text-slate-700 text-[13px]">Click to upload CSV</p>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">Only .csv files · Max 200 users</p>
                      </div>
                    )}
                  </label>

                  {/* Preview table */}
                  {bulkRows.length > 0 && (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                        <p className="text-[11px] font-black text-slate-600 uppercase tracking-wider">Preview — {bulkRows.length} rows</p>
                        <div className="flex items-center gap-3 text-[11px] font-bold">
                          <span className="text-emerald-600 flex items-center gap-1"><CheckCircle size={12}/> {bulkRows.filter(r => r._errors.length === 0).length} valid</span>
                          {bulkRows.some(r => r._errors.length > 0) && (
                            <span className="text-red-500 flex items-center gap-1"><XCircle size={12}/> {bulkRows.filter(r => r._errors.length > 0).length} errors</span>
                          )}
                        </div>
                      </div>
                      <div className="overflow-x-auto max-h-64 overflow-y-auto">
                        <table className="w-full text-left text-[11px] min-w-[700px]">
                          <thead className="bg-slate-50 sticky top-0">
                            <tr>
                              <th className="px-3 py-2 font-black text-slate-400 uppercase tracking-wider">#</th>
                              <th className="px-3 py-2 font-black text-slate-400 uppercase tracking-wider">User ID</th>
                              <th className="px-3 py-2 font-black text-slate-400 uppercase tracking-wider">Name</th>
                              <th className="px-3 py-2 font-black text-slate-400 uppercase tracking-wider">Email</th>
                              <th className="px-3 py-2 font-black text-slate-400 uppercase tracking-wider">Role</th>
                              <th className="px-3 py-2 font-black text-slate-400 uppercase tracking-wider">Dept</th>
                              <th className="px-3 py-2 font-black text-slate-400 uppercase tracking-wider">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {bulkRows.map((row) => (
                              <tr key={row._row} className={row._errors.length > 0 ? "bg-red-50" : "hover:bg-slate-50"}>
                                <td className="px-3 py-2 text-slate-400 font-bold">{row._row}</td>
                                <td className="px-3 py-2 font-mono font-bold text-indigo-600">{row.empId || <span className="text-red-400">—</span>}</td>
                                <td className="px-3 py-2 font-bold text-slate-700">{row.name || <span className="text-red-400">—</span>}</td>
                                <td className="px-3 py-2 text-slate-600">{row.email || <span className="text-red-400">—</span>}</td>
                                <td className="px-3 py-2 text-slate-600">{row.role || "Requestor"}</td>
                                <td className="px-3 py-2 text-slate-600">{row.dept || "HR"}</td>
                                <td className="px-3 py-2">
                                  {row._errors.length === 0 ? (
                                    <span className="flex items-center gap-1 text-emerald-600 font-black"><CheckCircle size={12}/> OK</span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-red-500 font-black" title={row._errors.join(", ")}><XCircle size={12}/> {row._errors[0]}</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {!bulkResult && (
              <div className="flex gap-3 p-5 border-t border-slate-100 bg-white flex-shrink-0">
                <button onClick={closeBulkModal} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black transition-all active:scale-95">
                  CANCEL
                </button>
                <button
                  onClick={handleBulkUpload}
                  disabled={bulkLoading || bulkRows.filter(r => r._errors.length === 0).length === 0}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-black shadow-lg shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {bulkLoading ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> UPLOADING...</>
                  ) : (
                    <><Upload size={16}/> UPLOAD {bulkRows.filter(r => r._errors.length === 0).length > 0 ? `${bulkRows.filter(r => r._errors.length === 0).length} USERS` : "USERS"}</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-zoom-in max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 text-white rounded-xl">
                  <UserPlus size={20} />
                </div>
                <h3 className="text-xl font-black text-slate-800">Create New User</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-1">User ID *</label>
                  <input
                    required
                    type="text"
                    value={formData.empId}
                    onChange={(e) => {
                      const val = e.target.value;
                      const isIntern = /^(AI|I)/i.test(val);
                      setFormData({
                        ...formData,
                        empId: val,
                        role: isIntern ? "Intern" : "Requestor",
                        location: isIntern ? "Bangalore" : formData.location,
                      });
                    }}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                    placeholder="e.g. AI-2300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Full Name *</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Email *</label>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Alternative Phone</label>
                  <input
                    type="text"
                    value={formData.altPhone}
                    onChange={(e) => setFormData({ ...formData, altPhone: e.target.value })}
                    placeholder="Optional"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-400 focus:outline-none placeholder:text-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Role</label>
                  <SearchableSelect
                    value={formData.role}
                    onChange={(val) => setFormData({ ...formData, role: val })}
                    options={ROLES}
                    placeholder="Select role…"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Department</label>
                  <SearchableSelect
                    value={formData.dept}
                    onChange={(val) => setFormData({ ...formData, dept: val })}
                    options={departments}
                    placeholder="Select department…"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Designation</label>
                  <SearchableSelect
                    value={formData.designation}
                    onChange={(val) => setFormData({ ...formData, designation: val })}
                    options={DESIGNATIONS}
                    placeholder="Select designation…"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Location</label>
                  <SearchableSelect
                    value={formData.location}
                    onChange={(val) => setFormData({ ...formData, location: val })}
                    options={locations}
                    placeholder="Select location…"
                  />
                </div>
              </div>

              {/* RM & HOD IDs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Reporting Manager</label>
                  <EmpIdPicker
                    value={formData.rmEmpId}
                    onChange={(val) => setFormData({ ...formData, rmEmpId: val })}
                    users={users}
                    placeholder="Select RM…"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-1">HOD</label>
                  <EmpIdPicker
                    value={formData.hodEmpId}
                    onChange={(val) => setFormData({ ...formData, hodEmpId: val })}
                    users={users}
                    placeholder="Select HOD…"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Temporary Password *</label>
                <input
                  required
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                />
              </div>

              <div className="pt-4 flex gap-3 sticky bottom-0 bg-white pb-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black transition-all active:scale-95"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Save size={18} /> CREATE USER
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showPasswordModal && passwordTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-zoom-in">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-amber-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500 text-white rounded-xl">
                  <KeyRound size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">Reset Password</h3>
                  <p className="text-[11px] text-slate-500 font-bold">{passwordTarget.name} · {passwordTarget.empId}</p>
                </div>
              </div>
              <button onClick={() => setShowPasswordModal(false)} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {pwSuccess ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 size={20} />
                    <p className="font-black text-[13px]">Password reset successfully!</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                    <p className="text-[10px] font-black text-green-600 uppercase tracking-wider mb-2">New Password (copy now)</p>
                    <div className="flex items-center gap-2">
                      <span className="flex-1 font-mono font-bold text-green-800 text-[15px] bg-white border border-green-200 rounded-xl px-3 py-2 select-all">{pwSuccess}</span>
                      <button
                        onClick={handleCopyPassword}
                        className={`p-2 rounded-xl transition-all active:scale-95 ${pwCopied ? 'bg-green-500 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                        title="Copy password"
                      >
                        {pwCopied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                      </button>
                    </div>
                    <p className="text-[10px] text-green-600 font-bold mt-2">Share this password securely with the user.</p>
                  </div>
                  <button
                    onClick={() => setShowPasswordModal(false)}
                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black transition-all active:scale-95"
                  >
                    CLOSE
                  </button>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  {pwError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-[12px] font-bold flex items-center gap-2">
                      <ShieldAlert size={14} /> {pwError}
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-500 uppercase ml-1">New Password *</label>
                    <div className="relative">
                      <input
                        required
                        type={pwShowNew ? "text" : "password"}
                        value={pwNew}
                        onChange={(e) => setPwNew(e.target.value)}
                        className="w-full p-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-amber-400 focus:outline-none"
                        placeholder="Min 6 characters"
                        autoComplete="new-password"
                      />
                      <button type="button" onClick={() => setPwShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {pwShowNew ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Confirm Password *</label>
                    <div className="relative">
                      <input
                        required
                        type={pwShowConfirm ? "text" : "password"}
                        value={pwConfirm}
                        onChange={(e) => setPwConfirm(e.target.value)}
                        className="w-full p-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-amber-400 focus:outline-none"
                        placeholder="Re-enter new password"
                        autoComplete="new-password"
                      />
                      <button type="button" onClick={() => setPwShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {pwShowConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowPasswordModal(false)}
                      className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black transition-all active:scale-95"
                    >
                      CANCEL
                    </button>
                    <button
                      type="submit"
                      disabled={pwLoading}
                      className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black shadow-lg shadow-amber-200 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      <KeyRound size={16} /> {pwLoading ? "RESETTING..." : "RESET PASSWORD"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-zoom-in max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 text-white rounded-xl">
                  <Edit2 size={20} />
                </div>
                <h3 className="text-xl font-black text-slate-800">Edit User Details</h3>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-1">User ID (Read-only)</label>
                  <input
                    disabled
                    type="text"
                    value={editFormData.empId}
                    className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Full Name *</label>
                  <input
                    required
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Email *</label>
                  <input
                    required
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Phone</label>
                  <input
                    type="text"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Alternative Phone</label>
                  <input
                    type="text"
                    value={editFormData.altPhone}
                    onChange={(e) => setEditFormData({ ...editFormData, altPhone: e.target.value })}
                    placeholder="Optional"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-400 focus:outline-none placeholder:text-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Role</label>
                  <SearchableSelect
                    value={editFormData.role}
                    onChange={(val) => setEditFormData({ ...editFormData, role: val })}
                    options={ROLES}
                    placeholder="Select role…"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Department</label>
                  <SearchableSelect
                    value={editFormData.dept}
                    onChange={(val) => setEditFormData({ ...editFormData, dept: val })}
                    options={departments}
                    placeholder="Select department…"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Designation</label>
                  <SearchableSelect
                    value={editFormData.designation}
                    onChange={(val) => setEditFormData({ ...editFormData, designation: val })}
                    options={DESIGNATIONS}
                    placeholder="Select designation…"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Location</label>
                  <SearchableSelect
                    value={editFormData.location}
                    onChange={(val) => setEditFormData({ ...editFormData, location: val })}
                    options={locations}
                    placeholder="Select location…"
                  />
                </div>
              </div>

              {/* RM & HOD IDs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Reporting Manager</label>
                  <EmpIdPicker
                    value={editFormData.rmEmpId}
                    onChange={(val) => setEditFormData({ ...editFormData, rmEmpId: val })}
                    users={users}
                    placeholder="Select RM…"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-1">HOD</label>
                  <EmpIdPicker
                    value={editFormData.hodEmpId}
                    onChange={(val) => setEditFormData({ ...editFormData, hodEmpId: val })}
                    users={users}
                    placeholder="Select HOD…"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3 sticky bottom-0 bg-white pb-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black transition-all active:scale-95"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Save size={18} /> UPDATE USER
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
