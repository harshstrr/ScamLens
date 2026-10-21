// On-device heuristic check. Used when no API endpoint is configured, or when the user
// explicitly chooses it after an API failure. It never returns "safe".
import { normalize } from "./normalize.js";
import { allUrls, inspectUrl } from "./url.js";

const SEV = { low: 1, medium: 2, high: 3 };
const RULES = [
  { category: "Pressure to act quickly", severity: "medium",
    explanation: "A short deadline can rush you into acting before you check the request.",
    re: /\b(within\s+\d+\s*(?:hours?|hrs?|minutes?|mins?|days?)|act now|urgent(?:ly)?|immediately|final (?:warning|notice)|expires? (?:today|soon)|last chance|account (?:is |will be )?(?:suspended|locked|closed))\b/i },
  { category: "Requests payment details", severity: "high",
    explanation: "The message asks for money or card details through an unverified route.",
    re: /\b(confirm your card|card (?:number|details)|pay now|send money|processing fee|customs fee|gift cards?|bank details|payment failed|upi (?:pin|id))\b/i },
  { category: "Asks for secret codes or passwords", severity: "high",
    explanation: "Legitimate services never ask you to share one-time codes, PINs or passwords this way.",
    re: /\b(otp|one[- ]time (?:password|code)|verification code|cvv|password|login details|aadhaar|your pin)\b/i },
  { category: "Discourages verification", severity: "medium",
    explanation: "Asking you not to check independently makes it harder to spot a scam.",
    re: /\b(do not contact [^.\n]{1,30}|don'?t (?:tell|contact|call) [^.\n]{1,30}|keep this (?:secret|confidential)|do not (?:share|tell) this)\b/i },
  { category: "Unexpected prize or refund", severity: "medium",
    explanation: "Unsolicited rewards and refunds are a common way to start a scam.",
    re: /\b(you(?:'ve| have)? won|prize|lottery|claim your (?:reward|refund|gift)|unclaimed refund)\b/i },
];

/** @param {{kind?:string,text?:string,url?:string,title?:string,links?:{text:string,url:string}[]}} p */
export function analyzeLocally(p) {
  const text = String(p.text || "");
  const findings = [];
  let score = 0;
  for (const rule of RULES) {
    const m = text.match(rule.re);
    if (!m) continue;
    findings.push({ category: rule.category, quote: m[0].trim(), explanation: rule.explanation, severity: rule.severity });
    score += SEV[rule.severity];
  }
  const urls = [...new Set([p.url, ...allUrls(text), ...(p.links || []).map((l) => l.url)].filter(Boolean))].slice(0, 25);
  const urlFlags = new Set();
  for (const u of urls) {
    const { weight, flags } = inspectUrl(u);
    score += Math.min(2, weight);
    flags.forEach((f) => urlFlags.add(f));
  }
  for (const f of [...urlFlags].slice(0, 3)) findings.push({ category: "Link observation", quote: "", explanation: f, severity: "low" });

  const verdict = score >= 6 ? "high" : score >= 3 ? "medium" : score >= 1 ? "low" : "unknown";
  return normalize({
    verdict, findings: findings.slice(0, 8),
    url_notes: p.url || urls.length ? undefined : [],
    headline: verdict === "unknown" ? "No strong warning signs matched our basic on-device check." : undefined,
    summary: verdict === "unknown" ? "This does not prove the content is safe. It is not a reputation or malware check." : undefined,
  }, p, "local");
}
