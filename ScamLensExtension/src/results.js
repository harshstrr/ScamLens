import { analyze, sendFeedback } from "./api.js";
import { recordScan } from "./history-store.js";
import { analyzeLocally } from "./analyzer.js";
import { initTheme } from "./theme.js";
import { hydrateIcons, icon } from "./icons.js";
import { $, el, verdictBadge } from "./ui.js";

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

function formatDate(iso) {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(d);
  const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  return `${date} · ${time}`;
}

function render(r) {
  current = r;
  const noun = r.kind === "website" ? "Page" : r.kind === "url" ? "Link" : "Message";
  $("eyebrow").textContent = `${noun} assessment${r.source === "local" ? " / on-device check" : ""}`;
  $("date").textContent = formatDate(r.analyzedAt);
  $("date").dateTime = r.analyzedAt;
  document.title = `ScamLens · ${r.title}`;

  $("title").textContent = r.title;
  const url = $("url");
  url.hidden = !r.target;
  url.textContent = r.target;
  $("badge-slot").replaceChildren(verdictBadge(r));

  $("notice-title").textContent = r.headline;
  $("notice-text").textContent = r.summary;
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
    row.append(icon("quote", { size: 15 }), el("span", "", f.category));
    card.append(row);
    if (f.quote) card.append(el("p", "quote", `“${f.quote}”`));
    if (f.explanation) card.append(el("p", "why", f.explanation));
    list.append(card);
  }

  // URL structure
  $("url-card").hidden = !r.parts;
  if (r.parts) {
    const line = $("url-line");
    line.replaceChildren();
    const bits = [r.parts.scheme, r.parts.host, r.parts.rest].filter(Boolean);
    bits.forEach((b, i) => {
      if (i) line.append(el("span", "plus", "+"));
      line.append(el("span", "", b));
    });
    const notes = $("url-notes");
    notes.replaceChildren(...r.urlNotes.map((n) => el("p", "", n)));
  }

  // Domain card
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

  $("actions").replaceChildren(...r.actions.map((a) => el("li", "", a)));
  $("disclaimer").textContent = r.disclaimer;
  resetButtons();
  show("report");
}

function resetButtons() {
  setLabel($("copy"), "Copy report");
  setLabel($("flag"), "Report incorrect result");
  $("flag").disabled = false;
}
function setLabel(btn, text, iconName) {
  btn.replaceChildren(...(iconName ? [icon(iconName, { size: 14 })] : []), document.createTextNode(text));
}

function reportText(r) {
  const lines = [
    `ScamLens ${r.kind === "website" ? "page" : r.kind === "url" ? "link" : "message"} assessment — ${formatDate(r.analyzedAt)}`,
    r.title, r.target, "",
    `Result: ${r.label}`, r.headline, r.summary, "",
  ];
  if (r.findings.length) {
    lines.push("Why it was flagged:");
    for (const f of r.findings) lines.push(`- ${f.category}${f.quote ? ` — “${f.quote}”` : ""}${f.explanation ? `: ${f.explanation}` : ""}`);
    lines.push("");
  }
  if (r.domain) {
    lines.push(`Domain: ${r.domain.host}`);
    for (const c of r.domain.checks) lines.push(`- ${c.text}${c.note ? ` (${c.note})` : ""}`);
    lines.push("");
  }
  lines.push("What to do:", ...r.actions.map((a, i) => `${i + 1}. ${a}`), "", r.disclaimer);
  return lines.filter((l, i, a) => l !== undefined && !(l === "" && a[i - 1] === "")).join("\n");
}

async function run(forceLocal = false) {
  show("loading");
  try {
    const result = forceLocal ? analyzeLocally(payload) : await analyze(payload);
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
  if (res?.ok) return run(); // signed in: run the scan again
  if (res && res.error) $("state-text").textContent = res.error;
});
$("retry").addEventListener("click", () => run());
$("use-local").addEventListener("click", () => run(true));

$("copy").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(reportText(current));
    setLabel($("copy"), "Copied", "check");
  } catch {
    setLabel($("copy"), "Copy failed — select the text instead");
  }
  setTimeout(() => setLabel($("copy"), "Copy report"), 2200);
});

$("flag").addEventListener("click", async () => {
  $("flag").disabled = true;
  try {
    const how = await sendFeedback(current);
    setLabel($("flag"), how === "sent" ? "Thanks — feedback sent" : "Thanks — saved on this device", "check");
  } catch (e) {
    $("flag").disabled = false;
    setLabel($("flag"), e.message || "Could not send feedback");
  }
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
