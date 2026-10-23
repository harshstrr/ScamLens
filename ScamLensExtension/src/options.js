import { applyTheme, initTheme } from "./theme.js";
import { hydrateIcons } from "./icons.js";
import { $ } from "./ui.js";
import { mountAccount } from "./account.js";

async function load() {
  hydrateIcons();
  await initTheme();
  mountAccount($("account"));
  const { theme } = await chrome.storage.local.get("theme");
  $("theme").value = theme || "";
}

$("theme").addEventListener("change", async () => {
  const v = $("theme").value;
  applyTheme(v);
  if (v) await chrome.storage.local.set({ theme: v });
  else await chrome.storage.local.remove("theme");
});
load();
