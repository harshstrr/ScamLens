const root = document.documentElement;
const valid = (t) => (t === "light" || t === "dark" ? t : "");

export function applyTheme(t) {
  if (valid(t)) root.dataset.theme = t;
  else delete root.dataset.theme; // follow the system
}
export async function initTheme() {
  const { theme } = await chrome.storage.local.get("theme");
  applyTheme(theme);
  // Keep every open ScamLens page in sync.
  chrome.storage.onChanged.addListener((c, area) => {
    if (area === "local" && c.theme) applyTheme(c.theme.newValue);
  });
}
export function currentTheme() {
  return root.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
}
export async function toggleTheme() {
  const next = currentTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  await chrome.storage.local.set({ theme: next });
  return next;
}
