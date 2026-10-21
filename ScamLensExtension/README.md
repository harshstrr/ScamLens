# ScamLens Extension — Chrome & Edge (MV3)

Vanilla JS, no build step.

## Install for development
1. Unzip, open `chrome://extensions` (Edge: `edge://extensions`), enable **Developer mode**.
2. **Load unpacked** → choose the folder containing `manifest.json`. Pin ScamLens.

Public one-click install requires publishing to the Chrome Web Store / Edge Add-ons.

## How it works
- **Popup** – analyze the current page, selected text, or a pasted link/message. A skeleton shows while the API responds.
- **Right-click menu** – scan the page or the selection; opens the full report, which shows its skeleton until the result arrives.
- **Full report** (`src/results.html`) – verdict, evidence quotes, URL structure, domain checks, next steps, *Copy report*, *Report incorrect result*.
- **Privacy & settings** (`src/options.html`) – theme and API endpoint.
- Nothing is scanned in the background. Light/dark follow the system or the saved toggle.

## Connecting your API
Set `API_URL` in `src/config.js` (and add its origin to `host_permissions` in `manifest.json`),
or let users enter it on the Settings page (the browser asks for permission for that origin only).
With no endpoint, the extension uses a basic on-device check (never returns "safe").
**Never put API secrets in the extension** — authenticate on your server.

**Request** `POST <API_URL>` (JSON)
```json
{ "kind": "website | message | url", "url": "https://…", "page_url": "…", "title": "…",
  "text": "visible text (≤20k chars)", "links": [{ "text": "…", "url": "…" }],
  "client": { "name": "scamlens-extension", "version": "0.3.0" } }
```

**Response** (all fields optional except a verdict; camelCase also accepted)
```json
{
  "verdict": "scam | high | medium | low | safe | unknown",
  "title": "Delivery payment request",
  "headline": "This page has warning signs, not a confirmed threat verdict.",
  "summary": "Urgent payment language … External reputation is unavailable.",
  "findings": [
    { "category": "Pressure to act quickly", "quote": "within 2 hours",
      "explanation": "A short deadline can rush you …", "severity": "low | medium | high" }
  ],
  "url_notes": ["No URL shortener or embedded username observed."],
  "domain": { "host": "parcel-help.example",
    "checks": [{ "text": "HTTPS present - connection encrypted", "note": "HTTPS does not verify who runs this site.", "status": "ok | warn | bad | neutral" }] },
  "actions": ["Don't enter card details through this link.", "…"],
  "disclaimer": "…", "report_id": "abc123", "analyzed_at": "2026-10-18T09:24:00Z"
}
```
`verdict` also accepts `is_scam: true/false` or a `risk_score` (0–1 or 0–100). Missing parts get sensible defaults
(`src/normalize.js`). Optional `FEEDBACK_URL` receives *Report incorrect result* (verdict + address only, no page text).

## Files
`background.js` context menus · `collect.js` page/selection reading · `api.js` request, timeout, errors ·
`normalize.js` API → UI shape · `analyzer.js` on-device fallback · `url.js` URL facts · `icons.js` all icons
(shield-check = logo, also `assets/shield-check.svg`) · `theme.css` shared tokens · `popup.*` `results.*` `options.*`
