import { analyze } from "./api.js";
import { recordScan } from "./history-store.js";
import { normalize } from "./normalize.js";
import { initTheme } from "./theme.js";
import { hydrateIcons, icon } from "./icons.js";
import { $, el } from "./ui.js";

let payload = null;
let current = null;

const PANELS = ["loading", "state", "report"];
function show(which) { for (const id of PANELS) $(id).hidden = id !== which; }

function showState({ glyph = "info", title, text, retry = false, local = false, signin = false }) {
  $("state-icon").replaceChildren(icon(glyph, { size: 30 }));
  $("state-title").textContent = title;
  $("state-text").textContent = text;
  $("sign-in").hidden = !signin;
  $("retry").hidden = !retry;
  $("use-local").hidden = !local;
  show("state");
}

function normalizeReport(raw) {
  const sourceType = raw?.kind || raw?.source_type;
  const kind = sourceType === "quick_scan" ? "url"
    : sourceType === "website" ? "website"
      : sourceType === "message" || sourceType === "image_ocr" ? "message"
        : sourceType || "website";
  return normalize(raw, {
    kind,
    url: raw?.target || raw?.source_url || "",
    title: raw?.title || raw?.source_title || "",
  }, raw?.source || "api");
}

/* ───────── Rendering ───────── */

function formatDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const date = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(d);
  const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  return `${date} · ${time}`;
}

const SVG_NS = "http://www.w3.org/2000/svg";
function gaugeSvg(score, level) {
  const R = 42, C = 2 * Math.PI * R;
  const pct = Math.max(0, Math.min(100, score ?? 0));
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("aria-hidden", "true");
  const mk = (cls, extra = {}) => {
    const c = document.createElementNS(SVG_NS, "circle");
    c.setAttribute("cx", 50); c.setAttribute("cy", 50); c.setAttribute("r", R);
    c.setAttribute("class", cls);
    for (const [k, v] of Object.entries(extra)) c.setAttribute(k, v);
    return c;
  };
  svg.append(
    mk("track"),
    mk(`bar ${level}`, { "stroke-dasharray": `${(pct / 100) * C} ${C}`, transform: "rotate(-90 50 50)" })
  );
  return svg;
}

function render(raw) {
  const r = normalizeReport(raw);
  current = r;

  const noun = r.kind === "website" ? "Page" : r.kind === "url" ? "Link" : "Message";
  $("eyebrow").textContent = `${noun} assessment${r.source === "local" ? " / on-device check" : ""}`;
  $("date").textContent = formatDate(r.analyzedAt);
  $("date").dateTime = r.analyzedAt;
  document.title = `ScamLens · ${r.title}`;

  // Hero
  $("hero").dataset.level = r.level;
  const gauge = $("gauge");
  gauge.replaceChildren();
  if (r.score != null) {
    gauge.hidden = false;
    gauge.setAttribute("aria-label", `Risk score ${r.score} out of 100`);
    gauge.append(gaugeSvg(r.score, r.level), el("div", "num", String(r.score)), el("div", "of", "/ 100"));
  } else {
    gauge.hidden = true;
  }
  $("badge-slot").replaceChildren(el("span", `pill ${r.level}`, r.label));
  $("notice-title").textContent = r.headline;
  $("notice-text").textContent = r.summary;

  const chips = $("chips");
  chips.replaceChildren();
  if (r.confidence) chips.append(el("span", "chip", `Confidence: ${r.confidence}`));
  if (r.findings.length) chips.append(el("span", "chip", `${r.findings.length} warning sign${r.findings.length > 1 ? "s" : ""}`));
  if (r.version) chips.append(el("span", "chip mono", r.version));

  // Subject
  $("title").textContent = r.title;
  const urlWrap = $("url-wrap");
  const url = $("url");
  urlWrap.hidden = !r.target;
  url.textContent = r.target;
  url.classList.add("clamp");
  const toggle = $("url-toggle");
  toggle.hidden = (r.target || "").length < 110;
  toggle.textContent = "Show full address";

  $("hint").textContent = r.kind === "website"
    ? "Exact page text below. Explanations are interpretations, not verified threat intelligence."
    : "Exact text below. Explanations are interpretations, not verified threat intelligence.";

  // Findings
  const list = $("findings");
  list.replaceChildren();
  if (!r.findings.length) {
    list.append(el("div", "card empty", "No specific warning signs were found in the text we checked. That does not prove it is safe."));
  }
  for (const f of r.findings) {
    const card = el("div", `card finding ${f.severity}`);
    const row = el("div", "row");
    row.append(icon("triangle-alert", { size: 15 }), el("span", "cat", f.category));
    if (f.severity) row.append(el("span", `sev ${f.severity}`, f.severity));
    if (typeof f.points === "number") row.append(el("span", "pts", `+${f.points}`));
    card.append(row);
    if (f.quote) card.append(el("p", "quote", `“${f.quote}”`));
    if (f.explanation) card.append(el("p", "why", f.explanation));
    list.append(card);
  }

  // URL structure
  $("url-card").hidden = !(r.parts && r.target);
  if (r.parts && r.target) {
    const line = $("url-line");
    line.replaceChildren();
    [r.parts.scheme, r.parts.host, r.parts.rest].filter(Boolean).forEach((b, i) => {
      if (i) line.append(el("span", "plus", "+"));
      line.append(el("span", "", b));
    });
    $("url-notes").replaceChildren(...(r.urlNotes || []).map((n) => el("p", "", n)));
  }

  // Domain
  const dc = $("domain-card");
  dc.hidden = !r.domain;
  if (r.domain) {
    dc.replaceChildren(el("p", "host", r.domain.host));
    for (const c of r.domain.checks) {
      const row = el("div", `check ${c.status}`);
      row.append(el("p", "t", c.text));
      if (c.note) row.append(el("p", "note", c.note));
      dc.append(row);
    }
  }

  // Score breakdown
  const sc = $("scores-card");
  const entries = r.scores ? [["Fraud", r.scores.fraud_score, "bad"], ["Spam", r.scores.spam_score, "warn"], ["Legitimate", r.scores.legitimate_score, "ok"]]
    .filter(([, v]) => typeof v === "number") : [];
  sc.hidden = !entries.length;
  $("scores").replaceChildren(...entries.map(([name, v, tone]) => {
    const pct = Math.round(v * 100);
    const row = el("div", "srow");
    const bar = el("div", "bar");
    const fill = el("span", `fill ${tone}`);
    fill.style.width = `${pct}%`;
    bar.append(fill);
    row.append(el("span", "n", name), bar, el("span", "v", `${pct}%`));
    return row;
  }));

  $("actions").replaceChildren(...r.actions.map((a) => el("li", "", a)));
  $("disclaimer").textContent = r.disclaimer;
  show("report");
}

/* ───────── Flow ───────── */

async function run(forceLocal = false) {
  show("loading");
  try {
    const result = normalizeReport(await analyze(payload));
    await chrome.storage.session.set({ latestScan: { payload, result } });
    await recordScan(result);
    render(result);
  } catch (e) {
    if (e.kind === "cancelled") return;
    if (e.kind === "auth") {
      return showState({ glyph: "lock", title: "Sign in to continue", text: e.message || "Sign in with Google to scan.", signin: true, local: true });
    }
    showState({
      glyph: e.kind === "network" || e.kind === "timeout" ? "wifi-off" : "triangle-alert",
      title: "We couldn't complete this scan",
      text: e.message || "Something went wrong.",
      retry: true, local: true,
    });
  }
}

$("sign-in").addEventListener("click", async () => {
  const btn = $("sign-in");
  btn.disabled = true;
  const res = await chrome.runtime.sendMessage({ type: "auth:signIn" }).catch(() => null);
  btn.disabled = false;
  if (res?.ok) return run();
  if (res && res.error) $("state-text").textContent = res.error;
});
$("retry").addEventListener("click", () => run());
$("use-local").addEventListener("click", () => run(true));

$("url-toggle").addEventListener("click", () => {
  const u = $("url");
  const open = u.classList.toggle("clamp") === false;
  $("url-toggle").textContent = open ? "Show less" : "Show full address";
});

async function main() {
  hydrateIcons();
  await initTheme();
  const { latestScan } = await chrome.storage.session.get("latestScan");
  if (!latestScan?.payload) {
    return showState({ glyph: "scan-text", title: "No report yet", text: "Open ScamLens from the toolbar and scan a page, selected text, or a link to see a full report here." });
  }
  payload = latestScan.payload;
  if (latestScan.result) render(latestScan.result);
  else await run();
}
main().catch((e) => {
  console.error(e);
  showState({ glyph: "triangle-alert", title: "Could not load this report", text: "Return to ScamLens and run the scan again." });
});