/**
 * utils/security.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Security utilities for the frontend.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Sanitizes a URL to prevent XSS via `javascript:` protocols.
 * @param {string} url - The URL to sanitize.
 * @returns {string} - The sanitized URL or a safe fallback.
 */
export function sanitizeUrl(url) {
  if (!url) return "";

  // Remove control characters and whitespace
  const cleanedUrl = url.replace(/[^\x20-\x7E]/g, "").trim();

  // Check for common malicious protocols
  if (/^(javascript|data|vbscript):/i.test(cleanedUrl)) {
    console.warn("Blocked potentially malicious URL:", cleanedUrl);
    return "about:blank";
  }

  return cleanedUrl;
}

/**
 * Rewrites a server-stored file URL to use the current page's origin.
 *
 * Fixes active mixed-content errors: when SERVER_URL was a LAN IP over HTTP
 * (e.g. http://192.168.1.128:5000) but the site is served over HTTPS, the
 * browser blocks all fetch() calls to that HTTP URL. Rewriting to the current
 * origin works because in production Express serves both the frontend and the
 * /api/files route on the same domain, and in development Vite proxies /api.
 */
export function resolveFileUrl(url) {
  if (!url) return "";
  const cleaned = sanitizeUrl(url);
  if (!cleaned || typeof window === "undefined") return cleaned;
  try {
    const parsed = new URL(cleaned);
    if (parsed.pathname.startsWith("/api/files/")) {
      return `${window.location.origin}${parsed.pathname}`;
    }
  } catch {}
  return cleaned;
}
