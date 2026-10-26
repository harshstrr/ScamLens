import { REQUEST_TIMEOUT_MS } from "./config.js";
import { ApiError, getEndpoint } from "./api.js";
import { getAccessToken, getUser } from "./auth.js";
import { normalize } from "./normalize.js";

const KEY = "history";
const MAX_LOCAL = 200;
const PAGE_SIZE = 30;

export async function currentMode() {
  const [endpoint, user] = await Promise.all([getEndpoint(), getUser()]);
  if (!user) return { mode: "local" };
  if (!endpoint)
    throw new ApiError("The ScamLens API endpoint isn't configured.", "config");
  return { mode: "cloud", base: historyBase(endpoint) };
}

function historyBase(endpoint) {
  const u = new URL(endpoint);
  u.search = "";
  u.hash = "";
  if (!/\/scans\/analyze\/?$/.test(u.pathname)) {
    throw new ApiError("The configured API endpoint doesn't support scan history.", "config");
  }
  u.pathname = u.pathname.replace(/\/analyze\/?$/, "");
  return u.toString().replace(/\/+$/, "");
}

/* ── Local (device) history ─────────────────────────────────────────────── */
async function readLocal() {
  return (await chrome.storage.local.get(KEY))[KEY] || [];
}

/** Call after every successful scan. Cloud users: the server already saved it, so do nothing. */
export async function recordScan(result) {
  try {
    if ((await currentMode()).mode === "cloud") return;
    const id = result.reportId || crypto.randomUUID();
    const list = (await readLocal()).filter((e) => e.id !== id);
    list.unshift({
      id,
      result: { ...result, reportId: result.reportId || id },
    });
    await chrome.storage.local.set({ [KEY]: list.slice(0, MAX_LOCAL) });
  } catch (e) {
    console.warn("ScamLens: could not save history", e);
  }
}

/* ── Cloud (backend) history ────────────────────────────────────────────── */
async function authed(url, init = {}, signal) {
  let token;
  try {
    token = await getAccessToken();
  } catch (e) {
    throw new ApiError(
      e.message || "Your session expired. Sign in again to see your history.",
      e.kind || "auth",
    );
  }
  if (!token)
    throw new ApiError("Sign in with Google to see your history.", "auth");
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const sig = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const go = (t) =>
    fetch(url, {
      ...init,
      signal: sig,
      credentials: "omit",
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        Authorization: `Bearer ${t}`,
      },
    });
  const run = async (t) => {
    try {
      return await go(t);
    } catch {
      if (signal?.aborted)
        throw new ApiError("History request cancelled.", "cancelled");
      if (timeout.aborted)
        throw new ApiError("The history request took too long. Check your connection and try again.", "timeout");
      throw new ApiError(
        "Could not reach the ScamLens service. Check your connection and try again.",
        "network",
      );
    }
  };
  let res = await run(token);
  if (res.status === 401) {
    // token may have just expired: refresh once and retry
    try {
      token = await getAccessToken({ force: true });
    } catch (e) {
      throw new ApiError(
        e.message || "Your session expired. Sign in again to see your history.",
        e.kind || "auth",
      );
    }
    if (!token)
      throw new ApiError(
        "Your session expired. Sign in again to see your history.",
        "auth",
      );
    res = await run(token);
  }
  if (res.status === 401 || res.status === 403)
    throw new ApiError(
      "Your session expired. Sign in again to see your history.",
      "auth",
    );
  if (!res.ok)
    throw new ApiError(
      res.status === 429
        ? "Too many requests. Try again in a moment."
        : `The ScamLens service couldn't complete that (${res.status}).`,
      "http",
    );
  return res;
}

// Server item → UI item. Items that carry only summary fields get full:false and are fetched on open.
function fromServer(raw, full = false) {
  const { result: inner, ...outer } = raw && typeof raw === "object" ? raw : {};
  const merged = {
    ...outer,
    ...(inner && typeof inner === "object" ? inner : {}),
  };
  const sourceType = merged.source_type || merged.sourceType;
  const kind =
    sourceType === "message"
      ? "message"
      : sourceType === "quick_scan"
        ? "url"
        : "website";
  const r = normalize(
    merged,
    {
      kind: merged.kind || kind,
      url:
        merged.url ||
        merged.target ||
        merged.page_url ||
        merged.source_url ||
        "",
      title: merged.title || merged.source_title,
    },
    "api",
  );
  return {
    ...r,
    id: String(outer.id ?? outer.report_id ?? r.reportId ?? ""),
    full,
  };
}


/** @returns {{source:"cloud"|"local", items:object[], nextCursor:string|null}} */
export async function list({ cursor = null, signal } = {}) {
  const m = await currentMode();
  if (m.mode === "local") {
    return {
      source: "local",
      nextCursor: null,
      items: (await readLocal()).map((e) => ({
        ...e.result,
        id: e.id,
        full: true,
        historySource: "local",
      })),
    };
  }

  await chrome.storage.local.remove(KEY);
  const u = new URL(m.base);
  u.searchParams.set("page_size", String(PAGE_SIZE));
  u.searchParams.set("page", cursor || "1");
  let json;
  try {
    json = await (await authed(u, {}, signal)).json();
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(
      "The ScamLens service sent a response we could not read.",
      "parse",
    );
  }
  const rows = Array.isArray(json)
    ? json
    : json.items || json.history || json.results || [];
  const page = Number(json.page || cursor || 1);
  const pageSize = Number(json.page_size || PAGE_SIZE);
  const total = Number(json.total);
  return {
    source: "cloud",
    nextCursor:
      (!Array.isArray(json) && (json.next_cursor || json.nextCursor)) ||
      (!Array.isArray(json) && Number.isFinite(total) && page * pageSize < total
        ? String(page + 1)
        : null),
    items: rows.map((row) => ({
      ...fromServer(row),
      historySource: "cloud",
    })),
  };
}


async function getLocalReport(item) {
  const entry = (await readLocal()).find((saved) => saved.id === item.id);
  if (!entry?.result || typeof entry.result !== "object") {
    throw new ApiError("That saved report is no longer available on this device.", "not-found");
  }
  return { ...entry.result, id: entry.id, full: true };
}

export async function getReport(item) {
  if (item.historySource === "local") 
    return getLocalReport(item);

  const m = await currentMode();

  if ((item.historySource || m.mode) === "local")
     return getLocalReport(item);
  
  if (m.mode !== "cloud")
    throw new ApiError("Sign in again to open this account report.", "auth");
  
  if (!item.id)
    throw new ApiError("This history item is missing its scan ID.", "parse");
  
  const json = await (
    await authed(`${m.base}/${encodeURIComponent(item.id)}`)
  ).json();
  return json;
}

export async function removeItem(item) {
  const m = await currentMode();
  if (m.mode === "cloud") {
    await authed(`${m.base}/${encodeURIComponent(item.id)}`, {
      method: "DELETE",
    });
    return;
  }
  await chrome.storage.local.set({
    [KEY]: (await readLocal()).filter((e) => e.id !== item.id),
  });
}

export async function clearAll() {
  const m = await currentMode();
  if (m.mode === "cloud") {
    await authed(m.base, { method: "DELETE" });
    return;
  }
  await chrome.storage.local.remove(KEY);
}
