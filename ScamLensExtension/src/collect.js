import { isScannable, parseUrl } from "./url.js";
export { isScannable };

/** Injected into the page. Must be self-contained (no outside references). */
export function readPage() {
  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
  const links = Array.from(document.querySelectorAll("a[href]")).slice(0, 60)
    .map((a) => ({ text: clean(a.innerText || a.getAttribute("aria-label")).slice(0, 120), url: a.href }))
    .filter((l) => /^https?:/i.test(l.url));
  return {
    title: document.title || "",
    url: location.href,
    text: (document.body?.innerText || "").replace(/\n{3,}/g, "\n\n").slice(0, 20000),
    links,
  };
}
export async function scanTab(tabId) {
  const [res] = await chrome.scripting.executeScript({ target: { tabId }, func: readPage });
  if (!res?.result) throw new Error("Could not read this page.");
  return { kind: "website", ...res.result };
}
export async function readSelection(tabId) {
  const [res] = await chrome.scripting.executeScript({ target: { tabId }, func: () => String(window.getSelection() || "").trim() });
  return res?.result || "";
}
/** Pasted text → either a bare link check or a message. */
export function payloadFromText(text, pageUrl = "") {
  const t = String(text || "").trim();
  if (!/\s/.test(t) && parseUrl(t)) return { kind: "url", url: t, text: "", title: "" };
  return { kind: "message", text: t, url: "", pageUrl, title: "" };
}
