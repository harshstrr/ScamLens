# ScamLens Extension — Chrome & Edge (MV3)

Vanilla JavaScript, no build step.

## Install for development
1. Open `chrome://extensions` (Edge: `edge://extensions`) and enable **Developer mode**.
2. Choose **Load unpacked**, select the folder containing `manifest.json`, and pin ScamLens.

Public one-click installation requires publishing to the Chrome Web Store or Edge Add-ons.

## How it works
- **Popup** – analyze the current page, selected text, or a pasted link/message.
- **Right-click menu** – scan the page or selection and open the full report.
- **Full report** (`src/results.html`) – review findings and recommendations, copy the report, or send feedback.
- **Privacy & settings** (`src/options.html`) – manage the account and theme.
- Nothing is scanned in the background. Light/dark mode follows the system or the saved toggle.

## ScamLens API
The API base URL is configured in `src/config.js`; add its origin to `host_permissions` in `manifest.json`.
If no analysis endpoint is configured, scans use the basic on-device analyzer.

The extension calls `POST /api/v1/scans/analyze` with `source_type`, `text`, and optional `source_url` and
`source_title`. Guest scans set `save_to_history: false`. Signed-in scans set `save_to_history: true` and
`save_content: false`, so the API stores the result but not the scanned page or message text. API responses are
normalized for the UI in `src/normalize.js`. Optional `FEEDBACK_URL` receives only the verdict and address, not page text.

## Google sign-in
Sign-in uses `chrome.identity.launchWebAuthFlow` to obtain a Google ID token, then exchanges it with
`POST /api/v1/auth/google` for a ScamLens API access token and refresh secret. Expired access tokens are refreshed
through `POST /api/v1/auth/refresh`. Tokens are kept in `chrome.storage.local`; authentication runs in the background
worker because the popup closes when Google's window opens.

1. In Google Cloud, create an **OAuth client ID** for a web application. Add the extension redirect URI
   `https://dflegigijeolhcafocojenplplcjdjba.chromiumapp.org/` (the ID pinned by the `key` in `manifest.json`) and
   set the client ID in `GOOGLE_CLIENT_ID` in `src/config.js`.
2. Configure the same client ID on the ScamLens API so it can verify Google ID tokens.
3. Before publishing to the Chrome Web Store, remove `key` from the manifest and add the store-assigned extension
   redirect URI to the OAuth client. Edge Add-ons also receives a separate extension ID and redirect URI.
4. Publishing an extension with accounts requires a privacy-policy URL in the store listing.

## Scan history
`src/history.html` (`history.js` and `history-store.js`) is opened from the popup, report page, or any ScamLens tab.
History supports search, filters, opening reports, deleting individual scans, and clearing all scans.

- **Signed out**: scan results are saved in `chrome.storage.local` on this device, up to the newest 200. Scanned text
  is not stored in the history entry.
- **Signed in**: the result is saved to the account by `POST /api/v1/scans/analyze` and history is loaded from
  `GET /api/v1/scans?page=1&page_size=30`. Signed-in scans are not copied to local history.
- Scans made while signed out are not uploaded when the user later signs in.

The API uses bearer access tokens for account history. It supports `GET /api/v1/scans/{id}` and
`DELETE /api/v1/scans/{id}`. Clear all sends `DELETE /api/v1/scans` with no query parameters; the API deletes all
scans belonging to the signed-in account.

## Source files
`background.js` handles context menus · `collect.js` reads page/selection text · `api.js` sends analysis and feedback ·
`auth.js` handles Google/API sign-in · `account.js` renders the account widget · `history-store.js` manages local and
account history · `normalize.js` maps API results to the UI · `analyzer.js` provides on-device analysis ·
`url.js` handles URL checks · `icons.js` contains icons · `theme.css` provides shared theme tokens.
