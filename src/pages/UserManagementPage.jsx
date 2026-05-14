/**
 * pages/UserManagementPage.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * User management interface for HR DeptHOD and Admins.
 * Allows creating new users and enabling/disabling existing ones.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useMemo } from "react";
import { get, post, patch } from "../services/api";
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
  Edit2
} from "lucide-react";

const ROLES = ["Requestor", "RM", "HOD", "DeptHOD", "Management", "Admin"];
const DEPARTMENTS = [
  "Academic", "Accounts", "Admin", "Animation", "Broadcasting", 
  "Business Development", "Corporate Communications", "Documentation", 
  "Food Committee", "Game Development", "Govt. Relations", "HR", "Interns", "Management", 
  "Marketing", "Operation", "Purchase", "RTS Help Desk", "Software", 
  "Store", "System admin", "TA Committee", "Technical Support"
];

export default function UserManagementPage({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
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

  const [editFormData, setEditFormData] = useState({
    empId: "",
    name: "",
    email: "",
    phone: "",
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
      setError("Failed to update user status.");
      setTimeout(() => setError(""), 3000);
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
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sl.No</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">User ID</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Dept & Role</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">RM & HOD ID</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-[12px]">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-10 text-center">
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
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditClick(user)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all active:scale-95"
                          title="Edit User"
                        >
                          <Edit2 size={16} />
                        </button>
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
                  <td colSpan="7" className="px-6 py-20 text-center">
                    <p className="text-slate-400 font-black uppercase text-[12px]">No users found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
                    onChange={(e) => setFormData({ ...formData, empId: e.target.value })}
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Role</label>
                  <div className="relative">
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full appearance-none p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-400 focus:outline-none cursor-pointer"
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Department</label>
                  <div className="relative">
                    <select
                      value={formData.dept}
                      onChange={(e) => setFormData({ ...formData, dept: e.target.value })}
                      className="w-full appearance-none p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-400 focus:outline-none cursor-pointer"
                    >
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Designation</label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                    placeholder="e.g. Bangalore"
                  />
                </div>
              </div>

              {/* RM & HOD IDs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Reporting Manager ID</label>
                  <input
                    type="text"
                    value={formData.rmEmpId}
                    onChange={(e) => setFormData({ ...formData, rmEmpId: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                    placeholder="e.g. GN-01"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-1">HOD Employee ID</label>
                  <input
                    type="text"
                    value={formData.hodEmpId}
                    onChange={(e) => setFormData({ ...formData, hodEmpId: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                    placeholder="e.g. GN-1042"
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Role</label>
                  <div className="relative">
                    <select
                      value={editFormData.role}
                      onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                      className="w-full appearance-none p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-400 focus:outline-none cursor-pointer"
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Department</label>
                  <div className="relative">
                    <select
                      value={editFormData.dept}
                      onChange={(e) => setEditFormData({ ...editFormData, dept: e.target.value })}
                      className="w-full appearance-none p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-400 focus:outline-none cursor-pointer"
                    >
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Designation</label>
                  <input
                    type="text"
                    value={editFormData.designation}
                    onChange={(e) => setEditFormData({ ...editFormData, designation: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Location</label>
                  <input
                    type="text"
                    value={editFormData.location}
                    onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* RM & HOD IDs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Reporting Manager ID</label>
                  <input
                    type="text"
                    value={editFormData.rmEmpId}
                    onChange={(e) => setEditFormData({ ...editFormData, rmEmpId: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-1">HOD Employee ID</label>
                  <input
                    type="text"
                    value={editFormData.hodEmpId}
                    onChange={(e) => setEditFormData({ ...editFormData, hodEmpId: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-400 focus:outline-none"
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
