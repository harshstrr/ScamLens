import { API_URL, FEEDBACK_URL, REQUEST_TIMEOUT_MS, MAX_TEXT_CHARS } from "./config.js";
import { normalize } from "./normalize.js";
import { analyzeLocally } from "./analyzer.js";

export class ApiError extends Error {
  constructor(message, kind = "error") { super(message); this.kind = kind; }
}

export async function getEndpoint() {
  const { apiUrl } = await chrome.storage.local.get("apiUrl");
  return String(apiUrl || API_URL || "").trim();
}

/**
 * Send the scan to the external API and return the normalized result.
 * With no endpoint configured, falls back to the on-device check.
 */
export async function analyze(payload, { signal } = {}) {
  const endpoint = await getEndpoint();
  if (!endpoint) return analyzeLocally(payload);

  const body = {
    kind: payload.kind,
    url: payload.url || undefined,
    page_url: payload.pageUrl || undefined,
    title: payload.title || undefined,
    text: String(payload.text || "").slice(0, MAX_TEXT_CHARS),
    links: (payload.links || []).slice(0, 60),
    client: { name: "scamlens-extension", version: chrome.runtime.getManifest().version },
  };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort("timeout"), REQUEST_TIMEOUT_MS);
  const onAbort = () => ctrl.abort("cancelled");
  signal?.addEventListener("abort", onAbort);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
      credentials: "omit",
    });
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
