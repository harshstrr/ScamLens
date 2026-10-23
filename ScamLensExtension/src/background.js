import { signIn, signOut } from "./auth.js";
import { scanTab, isScannable, payloadFromText } from "./collect.js";

const SELECTION = "scamlens-selection";
const PAGE = "scamlens-page";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: SELECTION, title: "Scan selection with ScamLens", contexts: ["selection"] });
    chrome.contextMenus.create({ id: PAGE, title: "Scan this page with ScamLens", contexts: ["page"] });
  });
});

// The report page runs the analysis itself and shows a skeleton while it loads.
async function openReport(payload) {
  await chrome.storage.session.set({ latestScan: { payload, result: null } });
  await chrome.tabs.create({ url: chrome.runtime.getURL("src/results.html") });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id || !isScannable(tab.url)) return;
  try {
    if (info.menuItemId === SELECTION) {
      const text = String(info.selectionText || "").trim();
      if (text) await openReport(payloadFromText(text, tab.url));
    } else if (info.menuItemId === PAGE) {
      await openReport(await scanTab(tab.id));
    }
  } catch (e) {
    console.error("ScamLens scan failed", e);
  }
});

// Sign-in runs here (not in the popup, which closes when Google's window takes focus).
chrome.runtime.onMessage.addListener((msg, sender, send) => {
  if (sender.id !== chrome.runtime.id) return;
  if (msg?.type === "auth:signIn") {
    const keepAlive = setInterval(() => chrome.runtime.getPlatformInfo(), 20000); // stop the worker sleeping mid-login
    signIn()
      .then((user) => send({ ok: true, user }))
      .catch((e) => send({ ok: false, error: e.message || "Sign-in failed." }))
      .finally(() => clearInterval(keepAlive));
    return true;
  }
  if (msg?.type === "auth:signOut") {
    signOut().then(() => send({ ok: true }));
    return true;
  }
});
