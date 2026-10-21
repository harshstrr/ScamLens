// ScamLens configuration.
//
// API_URL is the analysis endpoint (POST, JSON in / JSON out — see README for the contract).
// Leave it empty to use the built-in on-device heuristics, or let users set their own
// endpoint on the Settings page.
//
// If you hard-code an endpoint here, also add its origin to "host_permissions" in
// manifest.json (e.g. "https://api.scamlens.app/*").
//
// NEVER put API secrets in extension code — anything shipped in an extension is public.
// Authenticate users/installs on your server instead.
export const API_URL = "";

// Optional endpoint that receives "Report incorrect result" feedback.
// If empty, feedback is only saved on this device.
export const FEEDBACK_URL = "";

export const REQUEST_TIMEOUT_MS = 25000;
export const MAX_TEXT_CHARS = 20000;
