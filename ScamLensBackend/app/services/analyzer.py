import ipaddress
import logging
import math
import re
from datetime import datetime, timezone
from urllib.parse import urlparse

VERSION = "ScamLens Prediction"
logger = logging.getLogger(__name__)

CONTENT_PATTERNS = [
    (
        "threat_authority_impersonation",
        "Law Enforcement or Disconnection Threat",
        r"\b(arrest warrant|police custody|cbi|fbi|irs|customs hold|court summons|legal notice|power disconnection|electricity cut off|sim (?:block|deactivation))\b",
        "high",
        45,
        "Threatens severe legal, financial, or service penalties to force irrational obedience.",
    ),
    (
        "sensitive_credential_harvest",
        "Direct Credential Request",
        r"\b(one[ -]?time password|otp|cvv2?|atm pin|netbanking password|seed phrase|recovery phrase|secret key)\b",
        "high",
        45,
        "Demands private credentials or authentication codes that legitimate organizations never request.",
    ),
    (
        "remote_access_trojan",
        "Remote Access / Screen Sharing Lure",
        r"\b(anydesk|teamviewer|rustdesk|quicksupport|screen share|install\s+(?:apk|\.exe))\b",
        "high",
        40,
        "Directs the victim to install remote desktop control or sideload untrusted binaries.",
    ),
    (
        "fake_lottery_prize",
        "Unsolicited Reward or Lottery",
        r"\b(lottery winner|you(?:'|’)ve won|lucky draw|cash prize|claim your reward|unclaimed inheritance)\b",
        "high",
        35,
        "Classic prize or advance-fee scam format soliciting interaction for promised funds.",
    ),
    (
        "urgent_call_to_action",
        "Extreme Urgency & Deadlines",
        r"\b(act immediately|urgent action required|within (?:15|30|60|\d+) (?:mins?|minutes?|hours?)|final (?:reminder|notice)|account suspended today)\b",
        "medium",
        25,
        "Manufactured panic to reduce deliberate thought and security vigilance.",
    ),
    (
        "unusual_payment_demands",
        "Non-Standard or Untraceable Payment",
        r"\b(gift card|crypto transfer|bitcoin address|usdt trc20|western union|moneygram|wire transfer|processing fee required)\b",
        "medium",
        30,
        "Requests payment via non-reversible, anonymous, or high-risk transfer vectors.",
    ),
    (
        "job_task_scam",
        "High-Return Task/Part-Time Scam",
        r"\b(part[- ]?time job|earn\s+\$?\d+[- ]\$?\d+\s+daily|youtube like|telegram task|guaranteed daily income|no experience needed work from home)\b",
        "medium",
        25,
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


def analyze(text: str, source_url: str | None = None) -> dict:
    """Analyze input text and URLs deterministically using rules and heuristics."""
    cleaned_text = (text or "").strip()[:40000]
    findings = []
    has_spam_trigger = False
    has_fraud_trigger = False

    # 1. Regex pattern scanning
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
                has_spam_trigger = True
            else:
                has_fraud_trigger = True

    # 2. Extract and inspect URLs
    urls = list(dict.fromkeys(URL_RE.findall(cleaned_text)))
    if source_url and source_url.startswith(("http://", "https://")):
        urls = list(dict.fromkeys([source_url, *urls]))

    for url in urls[:50]:
        findings.extend(inspect_url(url))

    # 3. Deduplicate findings
    dedup_findings = []
    seen_codes = set()
    for finding in findings:
        if finding["code"] not in seen_codes:
            seen_codes.add(finding["code"])
            dedup_findings.append(finding)

    # 4. Pure heuristic scoring
    raw_score = sum(f["points"] for f in dedup_findings)
    critical_indicators = any(
        f["code"] in CRITICAL_CODES for f in dedup_findings
    )

    if critical_indicators:
        risk_score = max(min(raw_score, 100), 88)
    else:
        risk_score = min(raw_score, 100)

    # 5. Determine level, verdict, and category
    if critical_indicators or risk_score >= 70:
        risk_level = "high"
        verdict = "SCAM_OR_FRAUD_DETECTED"
        confidence = "very_high" if len(dedup_findings) >= 2 else "high"
        summary = "Strong scam or fraud indicators detected. Do not interact until independently verified."
        primary_category = "fraud"
    elif risk_score >= 40:
        risk_level = "medium"
        verdict = "SPAM_OR_HIGH_RISK"
        confidence = "high"
        summary = "Suspicious or unsolicited patterns were identified. Proceed with caution."
        primary_category = "spam" if has_spam_trigger and not has_fraud_trigger else "fraud"
    elif risk_score >= 15:
        risk_level = "low"
        verdict = "LOW_RISK_CONTENT"
        confidence = "medium"
        summary = "Some warning signals were detected, but they do not prove malicious intent."
        primary_category = "spam" if has_spam_trigger else "fraud"
    else:
        risk_level = "safe"
        verdict = "LEGITIMATE_CONTENT"
        confidence = "high"
        summary = "No scam indicators were identified. This does not guarantee the content is safe."
        primary_category = "legitimate"

    # Normalized scores for downstream consumers
    fraud_score = round(min(risk_score / 100.0, 1.0), 4) if primary_category == "fraud" else 0.0
    spam_score = round(min(risk_score / 100.0, 1.0), 4) if primary_category == "spam" else 0.0
    legitimate_score = round(max(0.0, 1.0 - (risk_score / 100.0)), 4)

    # 6. Actionable safety recommendations
    recommendations = []
    if risk_level == "high" or critical_indicators:
        recommendations.extend([
            "Never share OTPs, PINs, passwords, CVVs, or recovery phrases.",
            "Do not open suspicious links or install APKs or software requested by an unknown sender.",
            "Verify requests through the official app, website, or published support number.",
        ])
    elif risk_level == "medium":
        recommendations.extend([
            "Avoid replying to unsolicited offers, prize claims, or unexpected job messages.",
            "Do not use links in unsolicited messages to verify personal information.",
        ])
    else:
        recommendations.append(
            "Verify the sender and destination domain before sharing sensitive information."
        )

    now = datetime.now(timezone.utc)
    return {
        "verdict": verdict,
        "is_safe": risk_level == "safe",
        "primary_category": primary_category,
        "risk_level": risk_level,
        "risk_score": risk_score,
        "confidence": confidence,
        "scores": {
            "fraud_score": fraud_score,
            "spam_score": spam_score,
            "legitimate_score": legitimate_score,
        },
        "summary": summary,
        "findings": dedup_findings[:15],
        "recommendations": recommendations,
        "critical_indicators": critical_indicators,
        "analysis_version": VERSION,
        "created_at": now,
        "analyzed_at": now.isoformat(),
    }