import { get, postForm, patch, patchForm } from "./api";

export async function fetchRequests(params = {}) {
  const query = new URLSearchParams();
  if (params.page)   query.set("page",   params.page);
  if (params.limit)  query.set("limit",  params.limit);
  if (params.status) query.set("status", params.status);
  if (params.search) query.set("search", params.search);
  const qs = query.toString();
  return get(`/requests${qs ? `?${qs}` : ""}`);
}

export async function createRequest({ purpose, assignedDept, description, file }) {
  const fd = new FormData();
  fd.append("purpose", purpose);
  if (assignedDept) fd.append("assignedDept", assignedDept);
  fd.append("description", description || "");
  if (file) fd.append("file", file);
  return postForm("/requests", fd);
}

export async function submitApproval(id, decision, comment = "", newDept = "") {
  return patch(`/requests/${id}/approval`, { decision, comment, newDept });
}
export async function markRequestSeen(id)   { return patch(`/requests/${id}/seen`, {}); }
export async function markRequestUnread(id) { return patch(`/requests/${id}/unread`, {}); }

export async function closeRequest(id, note = "", file = null) {
  const fd = new FormData();
  if (note) fd.append("note", note);
  if (file) fd.append("file", file);
  return patchForm(`/requests/${id}/close`, fd);
}
