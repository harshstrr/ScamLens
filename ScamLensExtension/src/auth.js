// Google sign-in for the ScamLens API in a Manifest V3 extension.
// signIn() must run in the background worker because the popup closes during OAuth.
import { GOOGLE_CLIENT_ID, GOOGLE_SIGN_IN, TOKEN_REFRESH_URL, REQUEST_TIMEOUT_MS, NGROK_BYPASS_HEADERS } from "./config.js";

export class AuthError extends Error {
  constructor(message, kind = "error") { super(message); this.kind = kind; }
}

const SKEW_MS = 60_000;

export const authConfigured = () => Boolean(GOOGLE_CLIENT_ID && GOOGLE_SIGN_IN && TOKEN_REFRESH_URL);
export const redirectUri = () => chrome.identity.getRedirectURL();

async function load() { return (await chrome.storage.local.get("auth")).auth || null; }
const save = (auth) => chrome.storage.local.set({ auth });
const clear = () => chrome.storage.local.remove("auth");

/** { uid, email, name } for the signed-in user, or null. */
export async function getUser() {
  const auth = await load();
  return auth?.secretKey ? auth.user || null : null;
}

async function readResponse(res, action) {
  let body;
  try {
    body = await res.json();
  } catch {
    throw new AuthError(`The ScamLens service sent an unreadable ${action} response.`, "parse");
  }
  if (!res.ok) {
    const detail = typeof body?.detail === "string" ? ` ${body.detail}` : "";
    throw new AuthError(`The ScamLens service couldn't ${action} (${res.status}).${detail}`, res.status === 401 ? "auth" : "http");
  }
  return body;
}

async function postJson(url, body, action) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", ...NGROK_BYPASS_HEADERS },
      body: JSON.stringify(body),
      signal: controller.signal,
      credentials: "omit",
    });
    return await readResponse(res, action);
  } catch (e) {
    if (e instanceof AuthError) throw e;
    if (controller.signal.aborted) throw new AuthError(`The ${action} request timed out. Try again.`, "timeout");
    throw new AuthError(`Could not reach the ScamLens service to ${action}. Check your connection and try again.`, "network");
  } finally {
    clearTimeout(timer);
  }
}

function sessionFromResponse(response) {
  const expiresIn = Number(response.expires_in);
  if (!response.access_token || !response.secret_key || !response.user?.id || !response.user?.email || !Number.isFinite(expiresIn)) {
    throw new AuthError("The ScamLens service returned an incomplete sign-in response.", "parse");
  }
  return {
    user: {
      uid: response.user.id,
      email: response.user.email,
      name: response.user.display_name || "",
    },
    accessToken: response.access_token,
    secretKey: response.secret_key,
    expiresAt: Date.now() + expiresIn * 1000,
  };
}

/** Valid ScamLens API access token, or null when signed out. */
export async function getAccessToken({ force = false } = {}) {
  const auth = await load();
  if (!auth?.secretKey) return null;
  if (!force && auth.accessToken && auth.expiresAt - SKEW_MS > Date.now()) return auth.accessToken;

  const response = await postJson(TOKEN_REFRESH_URL, { secret_key: auth.secretKey }, "refresh your session");
  const refreshed = sessionFromResponse(response);
  await save({ ...auth, ...refreshed });
  return refreshed.accessToken;
}

export async function signOut() {
  await clear();
}

const hex = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, "0")).join("");
function jwtPayload(token) {
  try {
    const encoded = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "=")));
  } catch {
    return {};
  }
}

export async function signIn() {
  if (!authConfigured()) throw new AuthError("Sign-in isn't set up in this build of ScamLens.", "not-configured");

  const nonce = hex(16);
  const url = "https://accounts.google.com/o/oauth2/v2/auth?" + new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    response_type: "id_token",
    redirect_uri: redirectUri(),
    scope: "openid email profile",
    nonce,
    prompt: "select_account",
  });

  let responseUrl;
  try {
    responseUrl = await chrome.identity.launchWebAuthFlow({ url, interactive: true });
  } catch (e) {
    const cancelled = /did not approve|closed|cancel/i.test(e?.message || "");
    throw new AuthError(cancelled ? "Sign-in was cancelled." : "Could not open the Google sign-in window.", cancelled ? "cancelled" : "error");
  }
  if (!responseUrl) throw new AuthError("Sign-in was cancelled.", "cancelled");

  const params = new URLSearchParams(new URL(responseUrl).hash.slice(1));
  const googleIdToken = params.get("id_token");
  if (!googleIdToken) throw new AuthError(params.get("error_description") || "Google did not return a sign-in token.");
  if (jwtPayload(googleIdToken).nonce !== nonce) throw new AuthError("Sign-in response could not be verified. Please try again.");

  const response = await postJson(GOOGLE_SIGN_IN, { id_token: googleIdToken }, "sign in");
  const auth = sessionFromResponse(response);
  await save(auth);
  return auth.user;
}
