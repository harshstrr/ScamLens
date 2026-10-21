import { API_URL } from "./config.js";
import { applyTheme, initTheme } from "./theme.js";
import { hydrateIcons } from "./icons.js";
import { $ } from "./ui.js";

function say(msg, cls = "") { $("status").textContent = msg; $("status").className = `status ${cls}`; }
function isLocalHttp(u) { return u.protocol === "http:" && ["localhost", "127.0.0.1"].includes(u.hostname); }

async function load() {
  hydrateIcons();
  await initTheme();
  const { theme, apiUrl } = await chrome.storage.local.get(["theme", "apiUrl"]);
  $("theme").value = theme || "";
  $("api").value = apiUrl || "";
  if (!apiUrl && API_URL) $("api").placeholder = API_URL;
}

$("theme").addEventListener("change", async () => {
  const v = $("theme").value;
  applyTheme(v);
  if (v) await chrome.storage.local.set({ theme: v }); else await chrome.storage.local.remove("theme");
});

$("save").addEventListener("click", async () => {
  const raw = $("api").value.trim();
  if (!raw) { await chrome.storage.local.remove("apiUrl"); return say("Saved. Using the built-in on-device check.", "ok"); }
  let u;
  try { u = new URL(raw); } catch { return say("Enter a full address, e.g. https://api.example.com/v1/analyze", "bad"); }
  if (u.protocol !== "https:" && !isLocalHttp(u)) return say("The endpoint must use HTTPS.", "bad");
  // Ask the browser for access to just this origin (must run from this click).
  const granted = await chrome.permissions.request({ origins: [`${u.origin}/*`] }).catch(() => false);
  if (!granted) return say("Permission to contact that address was not granted.", "bad");
  await chrome.storage.local.set({ apiUrl: u.toString() });
  say("Saved. New scans will use this service.", "ok");
});

$("reset").addEventListener("click", async () => {
  await chrome.storage.local.remove("apiUrl");
  $("api").value = "";
  say("Reset to the default.", "ok");
});
load();
