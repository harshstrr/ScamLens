import ipaddress
import logging
import math
import re
from datetime import datetime, timezone
from urllib.parse import urlparse

from app.services.scam_detection.hf_classifier import predict_scam

VERSION = "heuristic-v1"
logger = logging.getLogger(__name__)

CONTENT_PATTERNS = [
    (
        "threat_authority_impersonation",
        "Law Enforcement or Disconnection Threat",
        r"\b(arrest warrant|police custody|cbi|fbi|irs|customs hold|court summons|legal notice|power disconnection|electricity cut off|sim (?:block|deactivation))\b",
        "high", 45,
        "Threatens severe legal, financial, or service penalties to force irrational obedience.",
    ),
    (
        "sensitive_credential_harvest",
        "Direct Credential Request",
        r"\b(one[ -]?time password|otp|cvv2?|atm pin|netbanking password|seed phrase|recovery phrase|secret key)\b",
        "high", 45,
        "Demands private credentials or authentication codes that legitimate organizations never request.",
    ),
    (
        "remote_access_trojan",
        "Remote Access / Screen Sharing Lure",
        r"\b(anydesk|teamviewer|rustdesk|quicksupport|screen share|install\s+(?:apk|\.exe))\b",
        "high", 40,
        "Directs the victim to install remote desktop control or sideload untrusted binaries.",
    ),
    (
        "fake_lottery_prize",
        "Unsolicited Reward or Lottery",
        r"\b(lottery winner|you(?:'|’)ve won|lucky draw|cash prize|claim your reward|unclaimed inheritance)\b",
        "high", 35,
        "Classic prize or advance-fee scam format soliciting interaction for promised funds.",
    ),
    (
        "urgent_call_to_action",
        "Extreme Urgency & Deadlines",
        r"\b(act immediately|urgent action required|within (?:15|30|60|\d+) (?:mins?|minutes?|hours?)|final (?:reminder|notice)|account suspended today)\b",
        "medium", 25,
        "Manufactured panic to reduce deliberate thought and security vigilance.",
    ),
    (
        "unusual_payment_demands",
        "Non-Standard or Untraceable Payment",
        r"\b(gift card|crypto transfer|bitcoin address|usdt trc20|western union|moneygram|wire transfer|processing fee required)\b",
        "medium", 30,
        "Requests payment via non-reversible, anonymous, or high-risk transfer vectors.",
    ),
    (
        "job_task_scam",
        "High-Return Task/Part-Time Scam",
        r"\b(part[- ]time job|earn\s+\$?\d+[- ]\$?\d+\s+daily|youtube like|telegram task|guaranteed daily income|no experience needed work from home)\b",
        "medium", 25,
        "Mirrors known employment task scams operating through private messaging apps.",
    ),
]

SHORTENERS = {
    "bit.ly", "bitly.com", "tinyurl.com", "t.co", "is.gd", "v.gd",
    "cutt.ly", "rb.gy", "shorturl.at", "ow.ly", "buff.ly", "tiny.cc",
    "goo.gl", "rebrand.ly", "bl.ink", "snip.ly", "clck.ru", "t.ly",
    "kutt.it", "shortcm.li", "dub.co", "linktr.ee", "smarturl.it",
    "hyperurl.co", "fanlink.to", "s.id", "soo.gd", "bc.vc", "adf.ly",
    "shorte.st", "q.gs", "po.st", "trib.al", "amzn.to", "fb.me", "wp.me",
    "youtu.be", "wa.me", "t.me", "ift.tt", "dlvr.it", "lnkd.in",
    "spoti.fi", "apple.co", "msft.it", "cleanuri.com", "rotf.lol",
    "chilp.it", "curt.link", "vzturl.com", "shorturl.ac", "urlr.me",
    "shrturi.com", "1url.com", "shortn.at", "short.io", "link.cx",
    "gg.gg", "zpr.io", "u.to", "x.co", "vurl.com", "qr.ae", "qr.net",
    "4h.net", "tr.im",
}

HIGH_RISK_TLDS = {
    "xyz", "top", "work", "loan", "click", "rest", "fit", "buzz", "surf",
    "icu", "cam", "bid", "stream", "win", "download", "racing", "review",
    "trade", "accountant", "date", "faith", "party", "science", "gdn",
    "space", "site", "online", "website", "fun", "uno", "monster", "mom",
    "tokyo", "bar", "lat", "live", "vip", "kim", "wang", "men", "club",
    "rocks", "quest", "beauty", "hair", "skin", "makeup", "autos", "boats",
    "bond", "homes", "cfd", "sbs", "lol", "guru", "life", "center",
    "tk", "ml", "ga", "cf", "gq", "su", "cc", "ws", "to", "pw", "ms",
    "cx", "nu", "st", "vg", "secure", "bank", "pay", "support", "help",
    "security", "recovery", "claims", "verify", "update", "service",
}

TARGET_BRANDS = [
    "apple", "icloud", "microsoft", "office365", "outlook", "live", "azure",
    "google", "gmail", "drive", "youtube", "meta", "facebook", "instagram",
    "whatsapp", "telegram", "twitter", "linkedin", "snapchat", "tiktok",
    "dropbox", "adobe", "docusign", "wetransfer", "github", "gitlab",
    "paypal", "stripe", "square", "venmo", "zelle", "cashapp", "revolut",
    "wise", "westernunion", "moneygram", "chase", "wellsfargo",
    "bankofamerica", "citibank", "capitalone", "hsbc", "barclays",
    "santander", "standardchartered", "americanexpress", "mastercard",
    "visa", "discover", "sbi", "onlinesbi", "hdfc", "hdfcbank", "icici",
    "icicibank", "axis", "axisbank", "pnb", "kotak", "kotakbank",
    "bankofbaroda", "canarabank", "paytm", "phonepe", "gpay", "bharatpe",
    "cred", "bhim", "upi", "binance", "coinbase", "kraken", "kucoin",
    "bybit", "okx", "bitfinex", "metamask", "trustwallet", "phantom",
    "ledger", "trezor", "exodus", "opensea", "uniswap", "pancakeswap",
    "blockchain", "amazon", "prime", "ebay", "walmart", "target",
    "aliexpress", "alibaba", "flipkart", "meesho", "myntra", "netflix",
    "spotify", "disney", "disneyplus", "hulu", "hbo", "steam",
    "playstation", "xbox", "epicgames", "fedex", "dhl", "ups", "usps",
    "indiapost", "bluedart", "delhivery", "chronopost", "royalmail",
    "canadapost", "auspost", "dpd", "gls", "hermes", "verizon", "tmobile",
    "vodafone", "airtel", "jio", "bsnl", "orange", "telefonica", "comcast",
    "xfinity", "irs", "hmrc", "incometax", "incometaxindia", "cbi", "fbi",
    "interpol", "police", "uidai", "aadhaar", "epfo", "ssa", "mygov",
]

URL_RE = re.compile(r"""https?://[^\s<>'"()]+""", re.IGNORECASE)
CRITICAL_CODES = {
    "raw_ip_host",
    "at_sign_masquerade",
    "direct_executable_download",
    "brand_spoof_subdomain",
    "sensitive_credential_harvest",
    "threat_authority_impersonation",
}


def calculate_shannon_entropy(value: str) -> float:
    """Calculate character entropy, used as a weak suspicious-domain signal."""
    if not value:
        return 0.0
    frequencies = {}
    for char in value:
        frequencies[char] = frequencies.get(char, 0) + 1
    entropy = 0.0
    for count in frequencies.values():
        probability = count / len(value)
        entropy -= probability * math.log2(probability)
    return entropy


def is_ip_host(hostname: str) -> bool:
    """Return True if hostname is a valid IPv4 or IPv6 address."""
    try:
        ipaddress.ip_address(hostname.strip("[]"))
        return True
    except ValueError:
        return False


def inspect_url(raw_url: str) -> list[dict]:
    """Inspect URL structure for potentially risky indicators."""
    findings = []
    clean_url = raw_url.rstrip(".,;:!?)")
    parsed = urlparse(clean_url)
    hostname = (parsed.hostname or "").lower()
    path = parsed.path or ""

    if not hostname:
        return findings

    if parsed.scheme.lower() == "http":
        findings.append({
            "code": "non_https_url",
            "title": "Unencrypted HTTP Link",
            "detail": f"The URL '{hostname}' uses unencrypted HTTP.",
            "severity": "low",
            "points": 10,
        })

    if is_ip_host(hostname):
        findings.append({
            "code": "raw_ip_host",
            "title": "Direct IP Address Destination",
            "detail": f"Hostname '{hostname}' uses a raw IP instead of a registered domain.",
            "severity": "high",
            "points": 40,
        })

    if hostname in SHORTENERS:
        findings.append({
            "code": "shortened_url",
            "title": "Obfuscated Shortened Link",
            "detail": f"Destination is hidden behind URL shortener '{hostname}'.",
            "severity": "medium",
            "points": 20,
        })

    if hostname.startswith("xn--") or ".xn--" in hostname:
        findings.append({
            "code": "punycode_domain",
            "title": "IDN / Punycode Lookalike Encoding",
            "detail": f"Hostname '{hostname}' uses Punycode encoding, a possible lookalike tactic.",
            "severity": "high",
            "points": 35,
        })

    raw_authority = clean_url.split("://", 1)[-1].split("/", 1)[0]
    if "@" in raw_authority:
        findings.append({
            "code": "at_sign_masquerade",
            "title": "URL Credential Masquerade (@ trick)",
            "detail": "An '@' symbol inside the URL authority can obscure the actual destination.",
            "severity": "high",
            "points": 45,
        })

    labels = hostname.split(".")
    if len(labels) >= 4 and not is_ip_host(hostname):
        findings.append({
            "code": "excessive_subdomains",
            "title": "Excessive Subdomain Layering",
            "detail": f"Hostname '{hostname}' has {len(labels)} dot-separated labels.",
            "severity": "medium",
            "points": 20,
        })

    # This is a heuristic, not a definitive registrable-domain/public-suffix check.
    registered_part = ".".join(labels[-2:]) if len(labels) >= 2 else hostname
    for brand in TARGET_BRANDS:
        if brand in hostname and brand not in registered_part:
            findings.append({
                "code": "brand_spoof_subdomain",
                "title": f"Suspected {brand.title()} Impersonation",
                "detail": (
                    f"Brand name '{brand}' appears in a subdomain of "
                    f"'{registered_part}'. Verify the actual registered domain."
                ),
                "severity": "high",
                "points": 45,
            })
            break

    tld = labels[-1] if labels else ""
    if tld in HIGH_RISK_TLDS:
        findings.append({
            "code": "high_risk_tld",
            "title": f"High-Risk Top-Level Domain (.{tld})",
            "detail": f"The domain uses a TLD (.{tld}) that warrants additional scrutiny.",
            "severity": "medium",
            "points": 20,
        })

    domain_label = labels[-2] if len(labels) >= 2 else labels[0]
    if len(domain_label) > 12 and calculate_shannon_entropy(domain_label) > 3.75:
        findings.append({
            "code": "high_entropy_domain",
            "title": "High-Entropy Domain Label",
            "detail": f"Label '{domain_label}' has unusually high character entropy.",
            "severity": "medium",
            "points": 25,
        })

    dangerous_extensions = (".apk", ".exe", ".scr", ".bat", ".vbs", ".cmd", ".iso")
    if any(path.lower().endswith(ext) for ext in dangerous_extensions):
        findings.append({
            "code": "direct_executable_download",
            "title": "Direct Executable/Payload Download",
            "detail": f"Link directly points to a potentially dangerous file ({path}).",
            "severity": "high",
            "points": 50,
        })

    return findings


def _normalise_model_result(cleaned_text: str) -> dict:
    """Run the HF classifier and return a predictable model-analysis object."""
    try:
        model_result = predict_scam(cleaned_text)
        if not isinstance(model_result, dict) or "fraud_score" not in model_result:
            return {
                "available": False,
                "error": "Classifier returned an unsupported response",
            }

        def bounded_score(key: str) -> float:
            try:
                value = float(model_result.get(key, 0.0))
            except (TypeError, ValueError):
                value = 0.0
            # Accept classifier values represented as either 0..1 or 0..100.
            if value > 1.0:
                value /= 100.0
            return max(0.0, min(value, 1.0))

        fraud_score = bounded_score("fraud_score")
        spam_score = bounded_score("spam_score")
        legitimate_score = bounded_score("legitimate_score")
        prediction = str(model_result.get("prediction", "unknown")).lower()

        if prediction not in {"fraud", "scam", "spam", "legitimate", "safe", "unknown"}:
            prediction = "unknown"

        return {
            "available": True,
            "model": model_result.get("model", "hf-scam-classifier"),
            "fraud_score": fraud_score,
            "spam_score": spam_score,
            "legitimate_score": legitimate_score,
            "prediction": prediction,
        }
    except Exception:
        logger.exception("HF classifier inference exception occurred.")
        return {
            "available": False,
            "error": "Classifier temporarily unavailable",
        }


def _combine_predictions(
    heuristic_score: int,
    heuristic_prediction: str,
    model_analysis: dict,
    critical_indicators: bool,
) -> dict:
    """Create the user-facing final ensemble prediction object."""
    model_available = bool(model_analysis.get("available"))

    if model_available:
        model_fraud = float(model_analysis.get("fraud_score", 0.0))
        model_spam = float(model_analysis.get("spam_score", 0.0))
        model_legitimate = float(model_analysis.get("legitimate_score", 0.0))

        # Reuse all classifier classes. This is a decision score, not a probability.
        heuristic_factor = heuristic_score / 100.0
        fused_fraud = (model_fraud * 0.55) + (heuristic_factor * 0.45)
        fused_spam = (model_spam * 0.70)
        fused_legitimate = model_legitimate * (
            1.0 - min(heuristic_factor * 1.2, 0.95)
        )

        # Risk score reflects fraud and spam evidence.
        combined_risk_score = round(
            min((fused_fraud * 100.0) + (fused_spam * 40.0), 100.0)
        )
        if critical_indicators:
            combined_risk_score = max(combined_risk_score, 88)

        model_prediction = str(model_analysis.get("prediction", "unknown")).lower()
        scores = {
            "scam": fused_fraud,
            "spam": fused_spam,
            "legitimate": fused_legitimate,
        }
        # Keep the risk score as a safety floor; do not label low-risk content
        # as legitimate solely because the model's class probabilities are small.
        if critical_indicators or combined_risk_score >= 70:
            final_prediction = "scam"
        elif combined_risk_score >= 40:
            final_prediction = "spam"
        elif combined_risk_score >= 15:
            final_prediction = "low_risk"
        else:
            final_prediction = max(scores, key=scores.get)
            if final_prediction == "legitimate":
                final_prediction = "legitimate"
    else:
        model_prediction = "unavailable"
        combined_risk_score = max(heuristic_score, 88 if critical_indicators else 0)
        if critical_indicators or combined_risk_score >= 70:
            final_prediction = "scam"
        elif combined_risk_score >= 40:
            final_prediction = "spam"
        elif combined_risk_score >= 15:
            final_prediction = "low_risk"
        else:
            final_prediction = "inconclusive"

    if critical_indicators or combined_risk_score >= 70:
        final_risk_level = "high"
    elif combined_risk_score >= 40:
        final_risk_level = "medium"
    elif combined_risk_score >= 15:
        final_risk_level = "low"
    else:
        final_risk_level = "inconclusive"

    if not model_available:
        agreement = None
    else:
        heuristic_broad = "scam" if heuristic_prediction == "scam" else heuristic_prediction
        model_broad = (
            "scam" if model_prediction in {"fraud", "scam"}
            else "legitimate" if model_prediction == "safe"
            else model_prediction
        )
        agreement = heuristic_broad == model_broad

    return {
        "heuristic_prediction": heuristic_prediction,
        "heuristic_score": heuristic_score,
        "model_prediction": model_prediction,
        "model_score": round(float(model_analysis.get("fraud_score", 0.0)) * 100)
        if model_available else None,
        "model_available": model_available,
        "final_prediction": final_prediction,
        "final_risk_level": final_risk_level,
        "final_risk_score": int(max(0, min(combined_risk_score, 100))),
        "agreement": agreement,
        "method": "heuristic_huggingface_ensemble" if model_available else "heuristic_fallback",
    }


def analyze(text: str, source_url: str | None = None) -> dict:
    cleaned_text = (text or "").strip()[:40000]
    findings = []
    category_signals = {"fraud": 0.0, "spam": 0.0}

    for code, title, pattern, severity, points, detail in CONTENT_PATTERNS:
        if re.search(pattern, cleaned_text, re.IGNORECASE):
            findings.append({
                "code": code,
                "title": title,
                "detail": detail,
                "severity": severity,
                "points": points,
            })
            if "job" in code or "prize" in code:
                category_signals["spam"] += 0.3
                category_signals["fraud"] += 0.2
            else:
                category_signals["fraud"] += 0.4

    # 2. Inspect URLs from content and optional source URL.
    urls = list(dict.fromkeys(URL_RE.findall(cleaned_text)))
    if source_url and source_url.startswith(("http://", "https://")):
        urls = list(dict.fromkeys([source_url, *urls]))

    for url in urls[:50]:
        findings.extend(inspect_url(url))

    # Deduplicate findings by rule code.
    dedup_findings = []
    seen_codes = set()
    for finding in findings:
        if finding["code"] not in seen_codes:
            seen_codes.add(finding["code"])
            dedup_findings.append(finding)

    heuristic_score = min(sum(f["points"] for f in dedup_findings), 100)
    critical_indicators = any(
        finding["code"] in CRITICAL_CODES for finding in dedup_findings
    )

    if critical_indicators or heuristic_score >= 70:
        heuristic_prediction = "scam"
    elif heuristic_score >= 40:
        heuristic_prediction = "suspicious"
    elif heuristic_score >= 15:
        heuristic_prediction = "low_risk"
    else:
        heuristic_prediction = "inconclusive"

    # 3. Hugging Face inference.
    model_analysis = _normalise_model_result(cleaned_text)

    # 4. Preserve the existing ensemble-style score fields.
    if model_analysis.get("available"):
        m_fraud = model_analysis["fraud_score"]
        m_spam = model_analysis["spam_score"]
        m_legit = model_analysis["legitimate_score"]
        h_factor = heuristic_score / 100.0

        fused_fraud_prob = (m_fraud * 0.55) + (h_factor * 0.45)
        fused_spam_prob = (
            (m_spam * 0.70)
            + (min(category_signals["spam"], 1.0) * 0.30)
        )
        fused_legit_prob = m_legit * (1.0 - min(h_factor * 1.2, 0.95))

        total = fused_fraud_prob + fused_spam_prob + fused_legit_prob + 1e-6
        final_fraud_score = round(fused_fraud_prob / total, 4)
        final_spam_score = round(fused_spam_prob / total, 4)
        final_legitimate_score = round(fused_legit_prob / total, 4)
        original_risk_score = round(
            min((final_fraud_score * 100) + (final_spam_score * 40), 100.0), 1
        )
    else:
        h_ratio = heuristic_score / 100.0
        final_fraud_score = round(min(h_ratio * 1.1, 1.0), 4)
        final_spam_score = round(min(category_signals["spam"], 0.9), 4)
        final_legitimate_score = round(max(0.0, 1.0 - final_fraud_score), 4)
        original_risk_score = float(heuristic_score)

    primary_category = max(
        {
            "fraud": final_fraud_score,
            "spam": final_spam_score,
            "legitimate": final_legitimate_score,
        },
        key=lambda category: {
            "fraud": final_fraud_score,
            "spam": final_spam_score,
            "legitimate": final_legitimate_score,
        }[category],
    )

    if critical_indicators:
        primary_category = "fraud"
        original_risk_score = max(original_risk_score, 88.0)

    combined_prediction = _combine_predictions(
        heuristic_score=heuristic_score,
        heuristic_prediction=heuristic_prediction,
        model_analysis=model_analysis,
        critical_indicators=critical_indicators,
    )

    # Keep the existing risk fields aligned with the combined result.
    final_risk_score = combined_prediction["final_risk_score"]
    final_risk_level = combined_prediction["final_risk_level"]

    if final_risk_level == "high":
        legacy_risk_level = "dangerous"
        verdict = "SCAM_OR_FRAUD_DETECTED"
        confidence = (
            "very_high"
            if len(dedup_findings) >= 2
            or (model_analysis.get("available") and final_fraud_score > 0.7)
            else "high"
        )
        summary = "Strong scam or fraud indicators detected. Do not interact until independently verified."
    elif final_risk_level == "medium":
        legacy_risk_level = "suspicious"
        verdict = "SPAM_OR_HIGH_RISK"
        confidence = "high" if model_analysis.get("available") else "medium"
        summary = "Suspicious or unsolicited patterns were identified. Proceed with caution."
    elif final_risk_level == "low":
        legacy_risk_level = "low"
        verdict = "LOW_RISK_CONTENT"
        confidence = "medium"
        summary = "Some warning signals were detected, but they do not prove malicious intent."
    else:
        legacy_risk_level = "safe"
        verdict = "LEGITIMATE_CONTENT"
        confidence = "high" if model_analysis.get("available") else "medium"
        summary = "No strong scam indicators were identified. This does not guarantee the content is safe."

    # 6. Recommendations based on combined and rule-based evidence.
    recommendations = []
    if final_fraud_score > 0.4 or critical_indicators:
        recommendations.extend([
            "Never share OTPs, PINs, passwords, CVVs, or recovery phrases.",
            "Do not open suspicious links or install APKs or software requested by an unknown sender.",
            "Verify requests through the official app, website, or published support number.",
        ])
    elif final_spam_score > 0.4:
        recommendations.extend([
            "Avoid replying to unsolicited offers, prize claims, or unexpected job messages.",
            "Do not use links in unsolicited messages to unsubscribe or verify personal information.",
        ])
    else:
        recommendations.append(
            "Verify the sender and destination domain before sharing sensitive information."
        )

    return {
        "verdict": verdict,
        "is_safe": legacy_risk_level == "safe",
        "primary_category": primary_category,
        "scores": {
            "fraud_score": final_fraud_score,
            "spam_score": final_spam_score,
            "legitimate_score": final_legitimate_score,
        },
        "risk_level": final_risk_level,
        "risk_score": final_risk_score,
        "confidence": (
            "high" if confidence in {"high", "very_high"}
            else "medium" if confidence == "medium"
            else "low"
        ),
        "summary": summary,
        "findings": dedup_findings[:15],
        "recommendations": recommendations,
        "model_analysis": model_analysis,
        # New transparent prediction details.
        "code_prediction": {
            "prediction": heuristic_prediction,
            "risk_score": heuristic_score,
            "finding_count": len(dedup_findings),
            "critical_indicators": critical_indicators,
        },
        "combined_prediction": combined_prediction,
        "analysis_version": VERSION,
        "created_at": datetime.now(timezone.utc),
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
    }
