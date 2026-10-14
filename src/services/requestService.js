import { get, postForm, patch, patchForm, del } from "./api";

export async function fetchDepartments() {
  const data = await get("/requests/departments");
  return data.departments || [];
}

export async function fetchLocations() {
  const data = await get("/requests/locations");
  return data.locations || [];
}

export async function fetchRequestCounts() {
  return get("/requests/counts");
}

export async function fetchRequests(params = {}) {
  const query = new URLSearchParams();
  Object.keys(params).forEach(key => {
    const val = params[key];
    if (val === null || val === undefined) return;
    if (Array.isArray(val)) {
      if (val.length > 0) query.set(key, val.join(","));
    } else if (val instanceof Date) {
      // Local calendar date — toISOString() is UTC and shifts IST dates back one day
      const pad = (n) => String(n).padStart(2, "0");
      query.set(key, `${val.getFullYear()}-${pad(val.getMonth() + 1)}-${pad(val.getDate())}`);
    } else if (val === true) {
      query.set(key, "true");
    } else if (val !== "" && val !== false) {
      query.set(key, val);
    }
  });
  const qs = query.toString();
  return get(`/requests${qs ? `?${qs}` : ""}`);
}

export async function fetchFilterOptions() {
  return get("/requests/filters");
}

export async function fetchRoleCounts() {
  return get("/requests/role-counts");
}

export async function fetchRequestById(id) {
  return get(`/requests/${id}`);
}

export async function createRequest({ purpose, assignedDept, assignedDepts, description, files, dueDate, assignedPersonEmpId, assignedPersonName, ccDepts, ccEmpIds, ccPersonNames, isRecurring, recurringInterval, threadParentId }) {
  const fd = new FormData();
  fd.append("purpose", purpose);
  if (assignedDept)  fd.append("assignedDept",  assignedDept);
  if (assignedDepts) fd.append("assignedDepts", assignedDepts);
  fd.append("description", description || "");
  if (files?.length) files.forEach(f => fd.append("files", f));
  if (dueDate) fd.append("dueDate", dueDate);
  if (assignedPersonEmpId) fd.append("assignedPersonEmpId", assignedPersonEmpId);
  if (assignedPersonName)  fd.append("assignedPersonName",  assignedPersonName);
  if (ccDepts)       fd.append("ccDepts",      ccDepts);
  if (ccEmpIds)      fd.append("ccEmpIds",     ccEmpIds);
  if (ccPersonNames) fd.append("ccPersonNames", ccPersonNames);
  if (isRecurring)   fd.append("isRecurring",  isRecurring);
  if (recurringInterval) fd.append("recurringInterval", recurringInterval);
  if (threadParentId) fd.append("threadParentId", threadParentId);
  return postForm(threadParentId ? "/requests/trailingreq" : "/requests", fd);
}

export async function fetchRequestThread(id) {
  return get(`/requests/${id}/thread`);
}

export async function submitApproval(id, decision, comment = "", newDept = "", checkingDeadline = null, checkingReason = null, extras = {}) {
  return patch(`/requests/${id}/approval`, { decision, comment, newDept, checkingDeadline, checkingReason, ...extras });
}

export async function acknowledgeRequest(id, status) {
  return patch(`/requests/${id}/acknowledge`, { status });
}
export async function markRequestSeen(id)   { return patch(`/requests/${id}/seen`, {}); }
export async function markRequestUnread(id) { return patch(`/requests/${id}/unread`, {}); }

export async function closeRequest(id, note = "", files = []) {
  const fd = new FormData();
  if (note) fd.append("note", note);
  const arr = Array.isArray(files) ? files : (files ? [files] : []);
  arr.forEach(f => fd.append("files", f));
  return patchForm(`/requests/${id}/close`, fd);
}

export async function attachAfterClose(id, files = []) {
  const fd = new FormData();
  const arr = Array.isArray(files) ? files : (files ? [files] : []);
  arr.forEach(f => fd.append("files", f));
  return patchForm(`/requests/${id}/attach-after-close`, fd);
}

export async function editRequest(id, data) {
  if (data instanceof FormData) return patchForm(`/requests/${id}/edit`, data);
  return patch(`/requests/${id}/edit`, data);
}

export async function deleteRequest(id) {
  return del(`/requests/${id}`);
}
