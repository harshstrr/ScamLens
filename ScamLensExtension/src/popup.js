import { analyze } from "./api.js";
import { scanTab, readSelection, payloadFromText, isScannable } from "./collect.js";
import { initTheme, toggleTheme, currentTheme } from "./theme.js";
import { hydrateIcons, icon } from "./icons.js";
import { $, el, verdictBadge } from "./ui.js";

let tab = null;
let scanId = 0;
let controller = null;
let lastSource = null;

const hostOf = (u) => { try { return new URL(u).hostname; } catch { return ""; } };
const VIEWS = ["home", "loading", "done"];
function show(which) { for (const id of VIEWS) $(id).hidden = id !== which; }
function setError(msg) { $("error").textContent = msg || ""; $("error").hidden = !msg; }

function syncThemeIcon() {
  $("theme").replaceChildren(icon(currentTheme() === "dark" ? "sun" : "moon", { size: 16 }));
}

function renderSignals(list, result, max = 3) {
  list.replaceChildren();
  const items = result.findings.slice(0, max);
  if (!items.length) list.append(el("li", "", "No obvious warning phrases were detected."));
  for (const f of items) {
    const li = el("li", "sig-quote", f.category);
    if (f.quote) li.append(el("small", "", `“${f.quote}”`));
    list.append(li);
  }
}

async function remember(payload, result) {
  await chrome.storage.session.set({ latestScan: { payload, result } });
}

async function runScan(payloadOrFn) {
  lastSource = payloadOrFn;
  const id = ++scanId;
  controller?.abort();
  controller = new AbortController();
  setError("");
  const isPage = typeof payloadOrFn === "function";
  $("loading-title").textContent = isPage ? "Checking this page" : "Checking this text";
  show("loading");
  try {
    const payload = isPage ? await payloadOrFn() : payloadOrFn;
    if (id !== scanId) return;
    if (payload.kind !== "url" && !payload.text?.trim()) throw new Error("No readable text was found. The page may be empty or protected.");
    const result = await analyze(payload, { signal: controller.signal });
    if (id !== scanId) return;
    await remember(payload, result);
    renderDone(payload, result);
  } catch (e) {
    if (id !== scanId || e.kind === "cancelled") return;
    show("home");
    setError(e.message || "Could not scan. Try again.");
  }
}

function renderDone(payload, result) {
  $("done-domain").textContent = hostOf(result.target || payload.url || tab?.url) || result.title;
  $("done-risk").replaceChildren(verdictBadge(result));
  $("done-title").textContent = result.headline;
  $("done-summary").textContent = result.summary;
  renderSignals($("done-signals"), result);
  show("done");
}

async function init() {
  hydrateIcons();
  await initTheme();
  syncThemeIcon();
  try {
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const ok = isScannable(tab?.url);
    $("domain").textContent = ok ? hostOf(tab.url) : "Browser page";
    $("preview").textContent = ok
      ? "Scan the readable text and links on this page for possible scam signals."
      : "Browser pages can't be scanned. Open a regular website, or paste a link or message below.";
    $("scan-page").disabled = !ok;
    $("scan-selection").disabled = !ok;
    // Offer the last report for this very page.
    const { latestScan } = await chrome.storage.session.get("latestScan");
    if (ok && latestScan?.result && latestScan.payload?.url === tab.url) {
      $("risk-slot").replaceChildren(verdictBadge(latestScan.result));
      $("preview").textContent = latestScan.result.summary;
      renderSignals($("signals"), latestScan.result);
      $("report").hidden = false;
    }
  } catch {
    $("domain").textContent = "Unable to read this tab";
    $("scan-page").disabled = true;
    $("scan-selection").disabled = true;
  }
}

$("theme").addEventListener("click", async () => { await toggleTheme(); syncThemeIcon(); });
$("scan-page").addEventListener("click", () => runScan(() => scanTab(tab.id)));
$("scan-selection").addEventListener("click", async () => {
  try {
    const text = await readSelection(tab.id);
    if (!text) return setError("Select some text on the page first, then try again.");
    runScan(payloadFromText(text, tab.url));
  } catch { setError("Could not read the selected text on this page."); }
});
const manual = () => {
  const text = $("manual-text").value.trim();
  if (!text) return setError("Paste a link or message first.");
  runScan(payloadFromText(text));
};
$("scan-manual").addEventListener("click", manual);
$("manual-text").addEventListener("keydown", (e) => { if (e.key === "Enter") manual(); });
$("cancel").addEventListener("click", () => { scanId++; controller?.abort(); show("home"); });
$("rescan").addEventListener("click", () => lastSource && runScan(lastSource));
$("back").addEventListener("click", () => show("home"));
const openReport = () => chrome.tabs.create({ url: chrome.runtime.getURL("src/results.html") });
$("report").addEventListener("click", openReport);
$("full-report").addEventListener("click", openReport);

init();
