const SHORTENERS = new Set(["bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "rb.gy", "goo.gl", "ow.ly", "shorturl.at"]);

export function parseUrl(raw) {
  try {
    const u = new URL(String(raw || "").trim());
    return /^https?:$/.test(u.protocol) ? u : null;
  } catch { return null; }
}
export function isScannable(url) { return /^https?:\/\//i.test(url || ""); }
export function firstUrl(text) {
  const m = String(text || "").match(/\bhttps?:\/\/[^\s<>"')]+/i);
  return m ? m[0] : "";
}
export function allUrls(text) {
  return [...new Set(String(text || "").match(/\bhttps?:\/\/[^\s<>"')]+/gi) || [])];
}
/** "https://" + "host" + "/path" for the URL-structure card. */
export function urlParts(raw) {
  const u = parseUrl(raw);
  if (!u) return null;
  const rest = u.pathname === "/" && !u.search && !u.hash ? "" : u.pathname + u.search + u.hash;
  return { scheme: `${u.protocol}//`, host: u.host, hostname: u.hostname, rest, https: u.protocol === "https:" };
}
/** Factual URL checks. weight feeds the local fallback score; flags are plain-language observations. */
export function inspectUrl(raw) {
  const u = parseUrl(raw);
  if (!u) return { weight: 0, flags: [] };
  const h = u.hostname.toLowerCase();
  const flags = [];
  let weight = 0;
  const add = (w, t) => { weight += w; flags.push(t); };
  if (SHORTENERS.has(h)) add(2, "A URL shortener hides the final destination.");
  if (h.split(".").some((x) => x.startsWith("xn--"))) add(2, "The domain contains punycode labels; verify it carefully.");
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) add(2, "The address is a raw IP number instead of a domain name.");
  if (u.username || u.password || String(raw).includes("@")) add(2, "An embedded username or @ symbol can disguise the real destination.");
  if (h.split(".").length >= 5) add(1, "The hostname has many subdomain levels.");
  if (String(raw).length > 180) add(1, "The URL is unusually long.");
  if (u.protocol !== "https:") add(1, "The URL does not use HTTPS; this alone does not prove fraud.");
  if (u.port) add(1, `The URL uses a non-standard port (${u.port}).`);
  return { weight, flags };
}
