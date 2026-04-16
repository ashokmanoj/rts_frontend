export const getRoleBadgeClass = (role) => {
  if (role === "RM")         return "bg-blue-100 text-blue-700";
  if (role === "HOD")        return "bg-purple-100 text-purple-700";
  if (role === "DeptHOD")    return "bg-teal-100 text-teal-700";
  if (role === "Management") return "bg-rose-100 text-rose-700";
  if (role === "Admin")      return "bg-orange-100 text-orange-700";
  return "bg-slate-100 text-slate-500";
};
export const getAvatarClass = (role) => {
  if (role === "RM")         return "bg-blue-100 text-blue-700";
  if (role === "HOD")        return "bg-purple-100 text-purple-700";
  if (role === "DeptHOD")    return "bg-teal-100 text-teal-700";
  if (role === "Management") return "bg-rose-100 text-rose-700";
  if (role === "Admin")      return "bg-orange-100 text-orange-700";
  return "bg-indigo-100 text-indigo-700";
};
export const getInitials = (name = "") => name.slice(0, 2).toUpperCase();
