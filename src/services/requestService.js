import { get, postForm, patch, patchForm } from "./api";

export async function fetchRequests(params = {}) {
  const query = new URLSearchParams();
  Object.keys(params).forEach(key => {
    if (params[key]) query.set(key, params[key]);
  });
  const qs = query.toString();
  return get(`/requests${qs ? `?${qs}` : ""}`);
}

export async function fetchFilterOptions() {
  return get("/requests/filters");
}

export async function createRequest({ purpose, assignedDept, assignedDepts, description, files, dueDate, assignedPersonEmpId, assignedPersonName }) {
  const fd = new FormData();
  fd.append("purpose", purpose);
  if (assignedDept)  fd.append("assignedDept",  assignedDept);
  if (assignedDepts) fd.append("assignedDepts", assignedDepts);
  fd.append("description", description || "");
  if (files?.length) files.forEach(f => fd.append("files", f));
  if (dueDate) fd.append("dueDate", dueDate);
  if (assignedPersonEmpId) fd.append("assignedPersonEmpId", assignedPersonEmpId);
  if (assignedPersonName)  fd.append("assignedPersonName",  assignedPersonName);
  return postForm("/requests", fd);
}

export async function submitApproval(id, decision, comment = "", newDept = "", checkingDeadline = null, checkingReason = null) {
  return patch(`/requests/${id}/approval`, { decision, comment, newDept, checkingDeadline, checkingReason });
}

export async function acknowledgeRequest(id, status) {
  return patch(`/requests/${id}/acknowledge`, { status });
}
export async function markRequestSeen(id)   { return patch(`/requests/${id}/seen`, {}); }
export async function markRequestUnread(id) { return patch(`/requests/${id}/unread`, {}); }

export async function closeRequest(id, note = "", file = null) {
  const fd = new FormData();
  if (note) fd.append("note", note);
  if (file) fd.append("file", file);
  return patchForm(`/requests/${id}/close`, fd);
}
