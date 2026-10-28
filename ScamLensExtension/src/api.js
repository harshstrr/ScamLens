import { API_URL, FEEDBACK_URL, REQUEST_TIMEOUT_MS, MAX_TEXT_CHARS } from "./config.js";
import { getAccessToken, getUser } from "./auth.js";
import { normalize } from "./normalize.js";


export class ApiError extends Error {
  constructor(message, kind = "error") { super(message); this.kind = kind; }
}

export async function getEndpoint() {
  const { apiUrl } = await chrome.storage.local.get("apiUrl");
  const configured = String(apiUrl || "").trim();
  const previousBuiltIn = API_URL.replace(/\/scans\/analyze$/, "/analyze");
  return (configured === previousBuiltIn ? API_URL : configured) || API_URL;
}

/**
 * Send the scan to the ScamLens API and return the normalized result.
 * With no endpoint configured, falls back to the on-device check.
 */
export async function analyze(payload, { signal } = {}) {
  const endpoint = await getEndpoint();

  const user = await getUser();
  let token = null;
  if (user) {
    try {
      token = await getAccessToken();
    } catch (e) {
      throw new ApiError(e.message || "Your session expired. Sign in again to scan.", e.kind || "auth");
    }
    if (!token) throw new ApiError("Your session expired. Sign in again to scan.", "auth");
  }

  const pageText = String(payload.text || (payload.kind === "url" ? payload.url : "") || "");
  const scanText = pageText.slice(0, MAX_TEXT_CHARS); // on-screen text only; no link harvesting
  if (!scanText.trim()) throw new ApiError("There is no text or link to analyze.", "input");

  const body = {
    source_type: payload.kind === "message" ? "message" : payload.kind === "website" ? "website" : "quick_scan",
    source_url: (payload.url || payload.pageUrl || "").slice(0, 2048) || undefined,
    source_title: String(payload.title || "").slice(0, 512) || undefined,
    text: scanText,
    save_to_history: Boolean(user),
    save_content: false,
  };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort("timeout"), REQUEST_TIMEOUT_MS);
  const onAbort = () => ctrl.abort("cancelled");
  signal?.addEventListener("abort", onAbort);

  const send = (t) => {
    const headers = new Headers({
      "Content-Type": "application/json",
      Accept: "application/json",
    });
    if (t) headers.set("Authorization", `Bearer ${t}`);
    return fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: ctrl.signal,
      credentials: "omit",
    });
  };

  try {
    let res = await send(token);
    if (res.status === 401 && token) { // token may have just expired: refresh once and retry
      try {
        token = await getAccessToken({ force: true });
      } catch (e) {
        throw new ApiError(e.message || "Your session expired. Sign in again to scan.", e.kind || "auth");
      }
      if (!token) throw new ApiError("Your session expired. Sign in again to scan.", "auth");
      res = await send(token);
    }
    if (res.status === 401 || res.status === 403) {
      throw new ApiError(token ? "Your account isn't allowed to scan. Try signing out and in again." : "Sign in with Google to scan. Open Privacy & settings to sign in.", "auth");
    }
    if (!res.ok) {
      throw new ApiError(
        res.status === 429 ? "Too many scans right now. Wait a moment and try again."
          : res.status >= 500 ? "The ScamLens service had a problem. Try again shortly."
          : `The ScamLens service rejected this request (${res.status}).`,
        "http");
    }
    let json;
    try { json = await res.json(); } catch { throw new ApiError("The ScamLens service sent a response we could not read.", "parse"); }
    return normalize(json, payload, "api");
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (ctrl.signal.reason === "cancelled") throw new ApiError("Scan cancelled.", "cancelled");
    if (ctrl.signal.reason === "timeout") throw new ApiError("The scan took too long. Check your connection and try again.", "timeout");
    throw new ApiError("Could not reach the ScamLens service. Check your connection and try again.", "network");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

/** "Report incorrect result". Sends no page text — only the verdict and address. */
export async function sendFeedback(result) {
  const { feedbackUrl } = await chrome.storage.local.get("feedbackUrl");
  const endpoint = String(feedbackUrl || FEEDBACK_URL || "").trim();
  const entry = { report_id: result.reportId || undefined, verdict: result.verdict, url: result.target || undefined, at: new Date().toISOString() };
  if (endpoint) {
    const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(entry), credentials: "omit" });
    if (!res.ok) throw new ApiError("Could not send feedback right now.", "http");
    return "sent";
  }
  const { flaggedReports = [] } = await chrome.storage.local.get("flaggedReports");
  await chrome.storage.local.set({ flaggedReports: [...flaggedReports, entry].slice(-50) });
  return "saved";
}
