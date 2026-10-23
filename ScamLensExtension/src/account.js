// Small account widget used by the popup and the settings page.
import { authConfigured, getUser } from "./auth.js";
import { icon } from "./icons.js";
import { el } from "./ui.js";

export async function mountAccount(root) {
  async function render(msg = "") {
    root.replaceChildren();
    if (!authConfigured()) {
      root.append(el("p", "acct-note", "Sign-in isn't set up in this build."));
      return;
    }
    const user = await getUser();
    if (user) {
      const row = el("div", "acct-row");
      row.append(
        el("span", "avatar", (user.name || user.email || "?").trim().charAt(0).toUpperCase()),
        el("span", "acct-name", user.email || user.name),
      );
      const out = el("button", "acct-link", "Sign out");
      out.addEventListener("click", async () => { await chrome.runtime.sendMessage({ type: "auth:signOut" }); });
      row.append(out);
      root.append(row);
    } else {
      const btn = el("button", "btn");
      btn.append(icon("log-in", { size: 14 }), document.createTextNode("Continue with Google"));
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        const res = await chrome.runtime.sendMessage({ type: "auth:signIn" }).catch(() => null);
        if (res && !res.ok) { await render(res.error); } // popup may already be closed; storage listener covers success
      });
      root.append(btn, el("p", "acct-note", msg || "Optional. Lets the service tie scans to your account."));
      if (msg) root.lastChild.classList.add("bad");
    }
  }
  chrome.storage.onChanged.addListener((c, area) => { if (area === "local" && c.auth) render(); });
  await render();
}
