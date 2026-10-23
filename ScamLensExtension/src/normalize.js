// Turns whatever the API returns (or the local analyzer produces) into ONE shape the UI renders.
import { firstUrl, urlParts, inspectUrl } from "./url.js";

const pick = (o, ...keys) => { for (const k of keys) if (o && o[k] != null && o[k] !== "") return o[k]; };
const str = (v) => (typeof v === "string" ? v.trim() : "");
const arr = (v) => (Array.isArray(v) ? v : v == null || v === "" ? [] : [v]);

export const VERDICTS = {
  scam:    { label: "Likely scam",     tone: "bad",   icon: "shield-alert",   headline: "This looks like a scam.", summary: "Several strong warning signs were found. Do not enter personal or payment details." },
  high:    { label: "High risk",       tone: "bad",   icon: "triangle-alert", headline: "This has strong warning signs.", summary: "Treat this as potentially dangerous until you have verified it independently." },
  medium:  { label: "Medium risk",     tone: "warn",  icon: "triangle-alert", headline: "This page has warning signs, not a confirmed threat verdict.", summary: "Some warning signs warrant caution. Verify the sender and destination before acting." },
  low:     { label: "Low risk",        tone: "good",  icon: "circle-check",   headline: "Only limited warning signs were found.", summary: "This is not enough to say whether it is a scam. Stay alert to unexpected requests." },
  safe:    { label: "No threat found", tone: "good",  icon: "shield-check",   headline: "No warning signs were found.", summary: "Nothing suspicious was detected in what we checked. That is not a guarantee of safety." },
  unknown: { label: "Unclear",         tone: "muted", icon: "info",           headline: "There is not enough information for a verdict.", summary: "We could not reach a clear conclusion. Unknown does not mean safe or malicious." },
};
const SYNONYMS = {
  scam: ["scam", "malicious", "phishing", "fraud", "fraudulent", "dangerous"],
  high: ["high", "unsafe", "danger", "critical"],
  medium: ["medium", "suspicious", "moderate", "warning", "caution"],
  low: ["low", "minimal"],
  safe: ["safe", "benign", "clean", "legit", "legitimate", "trusted"],
  unknown: ["unknown", "unclear", "unverified", "inconclusive"],
};
const ACTIONS_RISKY = [
  "Don't enter card details, passwords or codes through this link.",
  "Open the official app or type the known website address yourself.",
  "Confirm the request through a contact you find independently.",
];
const ACTIONS_CALM = [
  "Be cautious with unexpected requests for money, codes or passwords.",
  "Type official website addresses yourself instead of following links.",
  "Verify unusual requests through a separate trusted channel.",
];
export const DEFAULT_DISCLAIMER =
  "An assessment, not proof of fraud or safety. No verified threat match is claimed. Unknown reputation never means safe or high risk on its own.";

function verdictOf(raw) {
  const v = str(pick(raw, "verdict", "risk_level", "riskLevel", "risk", "label", "classification")).toLowerCase();
  for (const [key, list] of Object.entries(SYNONYMS)) if (list.includes(v)) return key;
  const flag = pick(raw, "is_scam", "isScam", "scam");
  if (typeof flag === "boolean") return flag ? "scam" : "safe";
  const n = Number(pick(raw, "risk_score", "riskScore", "score"));
  if (Number.isFinite(n)) { const s = n <= 1 ? n * 100 : n; return s >= 85 ? "scam" : s >= 65 ? "high" : s >= 35 ? "medium" : s >= 10 ? "low" : "safe"; }
  return "unknown";
}
function severityOf(v) {
  const s = str(v).toLowerCase();
  return s === "high" || s === "critical" ? "high" : s === "low" ? "low" : "medium";
}
function finding(f) {
  if (typeof f === "string") return { category: "Warning sign", quote: "", explanation: f.trim(), severity: "medium" };
  return {
    category: str(pick(f, "category", "title", "label", "type", "name")) || "Warning sign",
    quote: str(pick(f, "quote", "evidence", "text", "snippet", "excerpt")),
    explanation: str(pick(f, "explanation", "description", "reason", "detail", "message")),
    severity: severityOf(pick(f, "severity", "level")),
  };
}
function check(c) {
  if (typeof c === "string") return { text: c, note: "", status: "neutral" };
  return { text: str(pick(c, "text", "title", "label")), note: str(pick(c, "note", "description", "detail")), status: str(pick(c, "status")) || "neutral" };
}

export function normalize(raw, payload = {}, source = "api") {
  raw = raw && typeof raw === "object" ? (raw.result && typeof raw.result === "object" ? raw.result : raw) : {};
  const key = verdictOf(raw);
  const meta = VERDICTS[key];

  // What was scanned: a page/URL, or a pasted message that may contain a link.
  const target = payload.url || pick(raw, "url", "target", "page_url", "source_url") || firstUrl(payload.text) || "";
  const parts = urlParts(target);

  const findings = arr(pick(raw, "findings", "signals", "reasons", "flags", "evidence")).map(finding).filter((f) => f.explanation || f.quote);

  // URL structure card: API observations if provided, otherwise factual local checks.
  let urlNotes = arr(pick(raw, "url_notes", "urlNotes", "url_observations")).map(str).filter(Boolean);
  if (parts && !urlNotes.length) {
    const { flags } = inspectUrl(target);
    urlNotes = flags.length ? flags : ["No URL shortener, punycode, embedded username or unusual length observed. Domain ownership and brand relationship are not verified."];
  }

  // Domain card.
  const d = raw.domain && typeof raw.domain === "object" ? raw.domain : {};
  const host = str(pick(d, "host", "hostname", "name")) || (typeof raw.domain === "string" ? raw.domain : "") || parts?.hostname || "";
  let checks = arr(pick(d, "checks")).map(check).filter((c) => c.text);
  if (host && !checks.length) {
    const https = parts ? parts.https : null;
    if (https !== null) checks.push(https
      ? { text: "HTTPS present - connection encrypted", note: "HTTPS does not verify who runs this site.", status: "ok" }
      : { text: "HTTPS not used - connection not encrypted", note: "Information you enter could be read by others on the network.", status: "warn" });
    const rep = pick(d, "reputation_note", "reputation") || pick(raw, "reputation_note", "reputation");
    checks.push({
      text: str(pick(d, "brand_note", "brand")) || "Brand relationship not verified.",
      note: typeof rep === "string" ? rep : "Reputation check unavailable. Unknown does not mean safe or malicious.",
      status: "neutral",
    });
  }

  const analyzedAt = new Date(pick(raw, "analyzed_at", "analyzedAt", "created_at", "createdAt", "timestamp") || Date.now());
  const title = str(pick(raw, "title", "page_title", "source_title", "name")) ||
    str(payload.title) ||
    (payload.kind === "message" ? "Selected message" : payload.kind === "url" ? "Link check" : parts?.hostname || "Page assessment");
  const noun = payload.kind === "message" ? "This message" : payload.kind === "url" ? "This link" : "This page";
  const swap = (t) => t.replace(/^This page\b/, noun);
  const risky = key === "scam" || key === "high" || key === "medium";

  return {
    source,
    verdict: key,
    ...meta,
    title,
    headline: str(pick(raw, "headline", "notice_title", "noticeTitle")) || swap(meta.headline),
    summary: str(pick(raw, "summary", "notice", "description", "message")) || meta.summary,
    findings,
    target, parts, urlNotes,
    domain: host ? { host, checks } : null,
    actions: arr(pick(raw, "actions", "recommendations", "next_steps")).map(str).filter(Boolean).length
      ? arr(pick(raw, "actions", "recommendations", "next_steps")).map(str).filter(Boolean)
      : risky ? ACTIONS_RISKY : ACTIONS_CALM,
    disclaimer: str(pick(raw, "disclaimer")) || DEFAULT_DISCLAIMER,
    reportId: str(pick(raw, "report_id", "reportId", "id")),
    analyzedAt: Number.isNaN(analyzedAt.getTime()) ? new Date().toISOString() : analyzedAt.toISOString(),
    kind: payload.kind || "website",
  };
}
