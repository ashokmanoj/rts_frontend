/**
 * services/chatService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Maps frontend chat actions to backend /api/requests/:id/chat endpoints.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { get, post, postForm } from "./api";

/** GET /api/requests/:id/chat */
export async function fetchChat(requestId) {
  return get(`/requests/${requestId}/chat`);
}

/** POST text message — uses JSON (not multipart, no file needed). */
export async function sendText(requestId, text, replyTo = null) {
  return post(`/requests/${requestId}/chat`, {
    type: "message",
    text,
    replyTo: replyTo ? JSON.stringify(replyTo) : null,
  });
}

/** POST file / image attachment. */
export async function sendFile(requestId, fileBlob, caption = "", replyTo = null) {
  const fd = new FormData();
  fd.append("type", "file");
  fd.append("text", caption);
  fd.append("file", fileBlob);
  if (replyTo) fd.append("replyTo", JSON.stringify(replyTo));
  return postForm(`/requests/${requestId}/chat`, fd);
}

/** POST voice recording. */
export async function sendVoice(requestId, voiceBlob, duration = null, replyTo = null) {
  const fd = new FormData();
  fd.append("type", "voice");
  fd.append("file", voiceBlob, "voice.webm");
  if (duration !== null) fd.append("duration", String(duration));
  if (replyTo) fd.append("replyTo", JSON.stringify(replyTo));
  return postForm(`/requests/${requestId}/chat`, fd);
}
