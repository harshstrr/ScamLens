import { isScannable, parseUrl } from "./url.js";
export { isScannable };

/**
 * Injected into the page. Must be self-contained (no outside references).
 * Reads ONLY the text currently visible in the viewport (what the user sees on screen).
 * No full-page text, no hidden/off-screen content, no link harvesting.
 */
export function readPage() {
  const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "IFRAME", "SVG", "CANVAS", "HEAD", "META", "LINK"]);
  const vw = window.innerWidth || document.documentElement.clientWidth;
  const vh = window.innerHeight || document.documentElement.clientHeight;
  const seen = new WeakMap(); // element -> is it rendered/visible

  const elementVisible = (el) => {
    if (!el) return false;
    if (seen.has(el)) return seen.get(el);
    let ok = true;
    if (SKIP.has(el.tagName?.toUpperCase())) ok = false;
    else {
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden" || cs.visibility === "collapse" || parseFloat(cs.opacity) === 0) ok = false;
      else if (el.parentElement && el.parentElement !== document.body) ok = elementVisible(el.parentElement);
    }
    seen.set(el, ok);
    return ok;
  };

  const out = [];
  let total = 0;
  const MAX = 20000;
  const walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let lastY = null;
  while (walker.nextNode() && total < MAX) {
    const node = walker.currentNode;
    const txt = node.nodeValue.replace(/\s+/g, " ").trim();
    if (!txt) continue;
    if (!elementVisible(node.parentElement)) continue;
    range.selectNodeContents(node);
    const rects = range.getClientRects();
    let onScreen = false;
    let top = 0;
    for (const r of rects) {
      if (r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < vh && r.left < vw) { onScreen = true; top = r.top; break; }
    }
    if (!onScreen) continue;
    // new line when the text sits on a different row than the previous piece
    out.push(lastY !== null && Math.abs(top - lastY) > 4 ? "\n" + txt : " " + txt);
    lastY = top;
    total += txt.length + 1;
  }
  range.detach?.();

  return {
    title: document.title || "",
    url: location.href,
    text: out.join("").replace(/[ \t]+/g, " ").replace(/\n\s+/g, "\n").trim().slice(0, MAX),
    links: [],
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
