import { initTheme } from "./theme.js";
import { hydrateIcons, icon } from "./icons.js";
import { $, el, verdictBadge } from "./ui.js";
import * as store from "./history-store.js";
import { authConfigured, getUser } from "./auth.js";

let items = [];
let nextCursor = null;
let source = "local";
let filter = "all";
let query = "";
let loadId = 0;

const RISKY = new Set(["scam", "high", "medium"]);

function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const date = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(d);
  const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  return `${date} · ${time}`;
}

/* ── Panels ─────────────────────────────────────────────── */
function view(which) { // "loading" | "list" | "state"
  $("loading").hidden = which !== "loading";
  $("list").hidden = which !== "list";
  $("state").hidden = which !== "state";
  if (which !== "list") $("more").hidden = true;
}
function showState({ glyph = "info", title, text, signin = false, retry = false }) {
  $("state-icon").replaceChildren(icon(glyph, { size: 30 }));
  $("state-title").textContent = title;
  $("state-text").textContent = text;
  $("state-sign-in").hidden = !signin;
  $("state-retry").hidden = !retry;
  view("state");
}
function setSource(src) {
  source = src;
  const cloud = src === "cloud";
  $("source-icon").replaceChildren(icon(cloud ? "cloud" : "hard-drive", { size: 14 }));
  $("source-text").textContent = cloud ? "Synced to your ScamLens account" : "Saved on this device only";
}

/* ── Rendering ──────────────────────────────────────────── */
function matches(it) {
  if (filter === "risky" && !RISKY.has(it.verdict)) return false;
  if (filter === "clear" && RISKY.has(it.verdict)) return false;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [it.title, it.target, it.headline, it.label].some((v) => String(v || "").toLowerCase().includes(q));
}

function row(it) {
  const card = el("div", "card hrow");

  const main = el("div", "hmain");
  main.append(el("p", "title", it.title));
  if (it.target) main.append(el("p", "target", it.target));
  main.append(el("p", "head", it.headline));

  const side = el("div", "hside");
  side.append(verdictBadge(it), el("time", "", formatDate(it.analyzedAt)));

  const actions = el("div", "hactions");
  const open = el("button", "btn", "View report");
  open.type = "button";
  open.addEventListener("click", () => openReport(it, open));
  const del = el("button", "icon-btn");
  del.type = "button";
  del.setAttribute("aria-label", `Delete ${it.title}`);
  del.title = "Delete";
  del.append(icon("trash-2", { size: 14 }));
  armed(del, () => removeOne(it), { idle: () => del.replaceChildren(icon("trash-2", { size: 14 })), armedLabel: "Delete?" });
  actions.append(open, del);
  side.append(actions);

  card.append(main, side);
  return card;
}

/** Two-step button: first click arms it ("Delete?"), second click within 3 s confirms. */
function armed(btn, onConfirm, { idle, armedLabel }) {
  let timer = null;
  btn.addEventListener("click", async () => {
    if (!timer) {
      btn.classList.add("confirm");
      btn.replaceChildren(document.createTextNode(armedLabel));
      timer = setTimeout(() => { timer = null; btn.classList.remove("confirm"); idle(); }, 3000);
      return;
    }
    clearTimeout(timer); timer = null;
    btn.disabled = true;
    await onConfirm();
    btn.disabled = false;
    btn.classList.remove("confirm");
    idle();
  });
}

function renderList() {
  $("clear").hidden = !items.length;
  if (!items.length) {
    return showState({
      glyph: "history",
      title: "No scans yet",
      text: source === "cloud"
        ? "Scans you run while signed in are saved to your account and appear here."
        : "Scans you run appear here. While you're signed out they're saved only on this device.",
    });
  }
  const shown = items.filter(matches);
  if (!shown.length) {
    return showState({ glyph: "search", title: "No matches", text: "Nothing in your loaded history matches that search or filter." });
  }
  $("list").replaceChildren(...shown.map(row));
  view("list");
  $("more").hidden = !nextCursor;
}

/* ── Data ───────────────────────────────────────────────── */
async function load({ append = false } = {}) {
  const id = ++loadId;
  if (!append) { items = []; nextCursor = null; view("loading"); $("clear").hidden = true; }
  $("more").disabled = true;
  try {
    const page = await store.list({ cursor: append ? nextCursor : null });
    if (id !== loadId) return;
    setSource(page.source);
    items = append ? [...items, ...page.items] : page.items;
    nextCursor = page.nextCursor;
    await updateNudge();
    renderList();
  } catch (e) {
    if (id !== loadId) return;
    $("nudge").hidden = true;
    if (append) { $("more").hidden = false; $("more").textContent = "Couldn't load more — retry"; return; }
    showState(e.kind === "auth"
      ? { glyph: "lock", title: "Sign in to see your history", text: e.message, signin: true }
      : { glyph: e.kind === "network" ? "wifi-off" : "triangle-alert", title: "We couldn't load your history", text: e.message || "Something went wrong.", retry: true });
  } finally {
    $("more").disabled = false;
  }
}

async function updateNudge() {
  $("nudge").hidden = !(source === "local" && authConfigured() && !(await getUser()));
}

async function openReport(it, btn) {
  btn.disabled = true;
  try {
    const result = await store.getReport(it);   // raw or normalised, both work now
    const target = result.target ?? result.source_url ?? "";
    await chrome.storage.session.set({
      latestScan: {
        payload: { kind: result.kind ?? result.source_type, url: target, title: result.title ?? result.source_title, text: "" },
        result,
      },
    });
    location.href = "results.html";
  } catch (e) {
    btn.disabled = false;
    btn.textContent = "Couldn't open — retry";
    console.warn(e);
  }
}

async function removeOne(it) {
  try {
    await store.removeItem(it);
    items = items.filter((x) => x.id !== it.id);
    renderList();
  } catch (e) {
    showState({ glyph: "triangle-alert", title: "Couldn't delete that", text: e.message || "Try again.", retry: true });
  }
}

/* ── Events ─────────────────────────────────────────────── */
async function signIn(btn) {
  btn.disabled = true;
  const res = await chrome.runtime.sendMessage({ type: "auth:signIn" }).catch(() => null);
  btn.disabled = false;
  if (res && !res.ok && res.error) $("state-text").textContent = res.error;
  // success: the "auth" storage change below reloads the list
}
$("nudge-sign-in").addEventListener("click", (e) => signIn(e.currentTarget));
$("state-sign-in").addEventListener("click", (e) => signIn(e.currentTarget));
$("state-retry").addEventListener("click", () => load());
$("more").addEventListener("click", () => { $("more").textContent = "Load more"; load({ append: true }); });

$("q").addEventListener("input", (e) => { query = e.target.value; if (items.length) renderList(); });
document.querySelectorAll(".seg button").forEach((b) => b.addEventListener("click", () => {
  filter = b.dataset.f;
  document.querySelectorAll(".seg button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  if (items.length) renderList();
}));

armed($("clear"), async () => {
  try { await store.clearAll(); items = []; nextCursor = null; renderList(); }
  catch (e) { showState({ glyph: "triangle-alert", title: "Couldn't clear history", text: e.message || "Try again.", retry: true }); }
}, { idle: () => { $("clear").replaceChildren(icon("trash-2", { size: 14 }), el("span", "", "Clear all")); }, armedLabel: "Click again to clear all" });

// Reload when the account changes (sign-in / sign-out).
chrome.storage.onChanged.addListener((c, area) => {
  if (area !== "local" || !c.auth) return;
  // Silent token refreshes also write "auth"; only reload when the signed-in user changes.
  const before = c.auth.oldValue?.user?.uid || null;
  const after = c.auth.newValue?.user?.uid || null;
  if (before !== after) load();
});

(async function main() {
  hydrateIcons();
  await initTheme();
  setSource("local");
  await load();
})();
