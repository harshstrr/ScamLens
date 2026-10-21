import { icon } from "./icons.js";
export const $ = (id) => document.getElementById(id);
export function el(tag, cls = "", text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}
/** Verdict pill, e.g. [triangle] Medium risk */
export function verdictBadge(result) {
  const b = el("span", `badge ${result.tone}`);
  b.append(icon(result.icon, { size: 14 }), el("span", "", result.label));
  return b;
}
