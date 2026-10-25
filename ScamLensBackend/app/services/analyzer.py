import ipaddress
import json
import logging
import math
import re
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

VERSION = "ScamLens Prediction v2.1"
logger = logging.getLogger(__name__)

EXTERNAL_MODEL_URL = "https://perch-carnation-improving.ngrok-free.dev/api/analyze"
EXTERNAL_MODEL_TIMEOUT = 2.5

CONTENT_PATTERNS = [
    (
        "threat_authority_impersonation",
        "Law Enforcement or Disconnection Threat",
        r"\b(arrest warrant|police custody|cbi|fbi|irs|customs hold|court summons|legal notice|power disconnection|electricity cut off|sim (?:block|deactivation)|telecom department|digital arrest|federal authorities|formal report)\b",
        "high",
        50,
        "Threatens severe legal, financial, or regulatory penalties to force irrational obedience.",
    ),
    (
        "account_takeover_threat",
        "Account Freeze / Unauthorized Access Alert",
        r"\b(unauthorized (?:login|access|transaction|attempt)|account (?:has been |is |temporarily )?(?:frozen|suspended|restricted|blocked|locked)|permanent (?:account )?suspension|security alert|fraud detection alert)\b",
        "high",
        50,
        "Manufactures an account security crisis to induce panic.",
    ),
    (
        "sensitive_credential_harvest",
        "Direct Credential Request",
        r"\b(one[ -]?time password|otp|cvv2?|atm pin|netbanking password|seed phrase|recovery phrase|secret key|login credentials|security code|verify your identity)\b",
        "high",
        45,
        "Demands verification or private credentials under false pretenses.",
    ),
    (
        "remote_access_trojan",
        "Remote Access / Screen Sharing Lure",
        r"\b(anydesk|teamviewer|rustdesk|quicksupport|screen share|install\s+(?:apk|\.exe)|download\s+support\s+app)\b",
        "high",
        45,
        "Directs the victim to install remote desktop control or sideload untrusted binaries.",
    ),
    (
        "fake_lottery_prize",
        "Unsolicited Reward or Lottery",
        r"\b(lottery winner|you(?:'|’)ve won|lucky draw|cash prize|claim your reward|unclaimed inheritance|jackpot winner|selected for award)\b",
        "high",
        40,
        "Classic prize or advance-fee scam format soliciting interaction for promised funds.",
    ),
    (
        "urgent_call_to_action",
        "Extreme Urgency & Deadlines",
        r"\b(act immediately|urgent action required|within (?:15|30|60|\d+) (?:mins?|minutes?|hours?)|session expires|final (?:reminder|notice)|immediately update|urgent kyc)\b",
        "medium",
        35,
        "Manufactured panic and tight deadlines to prevent second-guessing.",
    ),
    (
        "unusual_payment_demands",
        "Non-Standard or Untraceable Payment",
        r"\b(gift card|crypto transfer|bitcoin address|usdt trc20|western union|moneygram|wire transfer|processing fee required|security deposit to release)\b",
        "high",
        40,
        "Requests payment via non-reversible, anonymous, or high-risk transfer vectors.",
    ),
    (
        "job_task_scam",
        "High-Return Task/Part-Time Scam",
        r"\b(part[ -]?time job|earn\s+\$?\d+[\-\s]+\$?\d+\s+daily|youtube like|telegram task|guaranteed daily income|no experience needed work from home|prepaid task|review and earn)\b",
        "high",
        40,
        "Mirrors known employment task scams operating through private messaging apps.",
    ),
    (
        "bank_kyc_pan_alert",
        "Fake Bank/KYC Suspension Alert",
        r"\b(kyc (?:expired|suspended|pending|blocked)|update your pan|re-activate netbanking|ebanking suspension|restore your account)\b",
        "high",
        45,
        "Impersonates financial verification procedures to solicit account access.",
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
    "bofa", "bankofamerica", "chase", "wellsfargo", "citibank", "capitalone",
    "hsbc", "barclays", "santander", "standardchartered", "americanexpress",
    "mastercard", "visa", "discover", "sbi", "onlinesbi", "hdfc", "hdfcbank",
    "icici", "icicibank", "axis", "axisbank", "pnb", "kotak", "kotakbank",
    "paytm", "phonepe", "gpay", "bharatpe", "cred", "bhim", "upi",
    "paypal", "stripe", "square", "venmo", "zelle", "cashapp", "revolut",
    "binance", "coinbase", "kraken", "metamask", "trustwallet",
    "apple", "icloud", "microsoft", "office365", "outlook", "google", "gmail",
    "amazon", "netflix", "fedex", "dhl", "ups", "usps", "indiapost",
    "airtel", "jio", "bsnl", "vodafone",
]

# Extracts standard http(s) URLs as well as bracketed or bare domain patterns
EXTRACT_RE = re.compile(
    r"(?:https?://[^\s<>'\"]+|(?:\b|\bwww\.)[a-z0-9][a-z0-9\-\.]{1,254}\.[a-z]{2,10}(?:/[^\s<>'\"]*)?)",
    re.IGNORECASE,
)

CRITICAL_CODES = {
    "raw_ip_host",
    "at_sign_masquerade",
    "direct_executable_download",
    "brand_spoof_subdomain",
    "sensitive_credential_harvest",
    "threat_authority_impersonation",
    "account_takeover_threat",
    "bank_kyc_pan_alert",
    "suspicious_domain_lure",
}


def calculate_shannon_entropy(value: str) -> float:
    if not value:
        return 0.0
    frequencies = {}
    for char in value:
        frequencies[char] = frequencies.get(char, 0) + 1
    entropy = 0.0
    for count in frequencies.values():
        prob = count / len(value)
        entropy -= prob * math.log2(prob)
    return entropy


def is_ip_host(hostname: str) -> bool:
    try:
        ipaddress.ip_address(hostname.strip("[]"))
        return True
    except ValueError:
        return False


def clean_and_normalize_url(raw: str) -> tuple[str, str, str]:
    """Cleans punctuation/brackets and ensures valid parsing."""
    cleaned = raw.strip(" []()<>{}\"',;:!?")
    if not re.match(r"^https?://", cleaned, re.IGNORECASE):
        test_url = f"https://{cleaned}"
    else:
        test_url = cleaned

    parsed = urlparse(test_url)
    hostname = (parsed.hostname or "").lower()
    path = parsed.path or ""
    return cleaned, hostname, path


def inspect_url(raw_url: str) -> list[dict]:
    findings = []
    clean_url, hostname, path = clean_and_normalize_url(raw_url)

    if not hostname or "." not in hostname:
        return findings

    if raw_url.lower().startswith("http://"):
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
            "points": 45,
        })

    if hostname in SHORTENERS:
        findings.append({
            "code": "shortened_url",
            "title": "Obfuscated Shortened Link",
            "detail": f"Destination is hidden behind URL shortener '{hostname}'.",
            "severity": "medium",
            "points": 25,
        })

    if hostname.startswith("xn--") or ".xn--" in hostname:
        findings.append({
            "code": "punycode_domain",
            "title": "IDN / Punycode Lookalike Encoding",
            "detail": f"Hostname '{hostname}' uses Punycode encoding.",
            "severity": "high",
            "points": 35,
        })

    if "@" in clean_url.split("://", 1)[-1].split("/", 1)[0]:
        findings.append({
            "code": "at_sign_masquerade",
            "title": "URL Credential Masquerade (@ trick)",
            "detail": "An '@' symbol inside the URL authority can obscure the destination.",
            "severity": "high",
            "points": 45,
        })

    labels = hostname.split(".")
    registered_part = ".".join(labels[-2:]) if len(labels) >= 2 else hostname

    # Check for brand spoofing inside the domain name or subdomains
    for brand in TARGET_BRANDS:
        if brand in hostname:
            # Matches hyphenated spoofing like bofa-security-update-verification.com
            is_hyphen_spoof = f"{brand}-" in hostname or f"-{brand}" in hostname
            is_subdomain_spoof = brand not in registered_part
            if is_hyphen_spoof or is_subdomain_spoof:
                findings.append({
                    "code": "brand_spoof_subdomain",
                    "title": f"Suspected {brand.upper()} Impersonation Link",
                    "detail": f"Brand name '{brand}' is used deceptively in host '{hostname}'.",
                    "severity": "high",
                    "points": 50,
                })
                break

    # Flag common phishing buzzwords in the domain label
    phish_keywords = ("verification", "security-update", "verify-account", "login-help", "account-alert")
    if any(k in hostname for k in phish_keywords):
        findings.append({
            "code": "suspicious_domain_lure",
            "title": "Suspicious Domain Security Lure",
            "detail": f"Domain '{hostname}' contains suspicious credential-phishing keywords.",
            "severity": "high",
            "points": 40,
        })

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


def call_remote_scam_model(text: str) -> dict | None:
    try:
        payload = json.dumps({"text": text}).encode("utf-8")
        req = Request(
            EXTERNAL_MODEL_URL,
            data=payload,
            headers={"Content-Type": "application/json", "User-Agent": "ScamLens-Engine"},
            method="POST",
        )
        with urlopen(req, timeout=EXTERNAL_MODEL_TIMEOUT) as response:
            if response.status == 200:
                data = json.loads(response.read().decode("utf-8"))
                return data if isinstance(data, dict) else None
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, Exception) as exc:
        logger.debug("Remote scam model offline or request failed: %s", exc)
    return None


def analyze(text: str, source_url: str | None = None) -> dict:
    cleaned_text = (text or "").strip()[:40000]
    findings = []
    has_spam_trigger = False
    has_fraud_trigger = False

    # 1. Text pattern matching
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

    # 2. Extract and inspect URLs or embedded hostnames
    raw_candidates = EXTRACT_RE.findall(cleaned_text)
    urls = list(dict.fromkeys(raw_candidates))
    if source_url:
        urls.insert(0, source_url)

    for item in urls[:50]:
        findings.extend(inspect_url(item))

    # 3. Deduplicate findings
    dedup_findings = []
    seen_codes = set()
    for finding in findings:
        if finding["code"] not in seen_codes:
            seen_codes.add(finding["code"])
            dedup_findings.append(finding)

    # 4. Pure heuristic scoring
    raw_score = sum(f["points"] for f in dedup_findings)
    critical_indicators = any(f["code"] in CRITICAL_CODES for f in dedup_findings)

    if critical_indicators:
        risk_score = max(min(raw_score, 100), 88)
    else:
        risk_score = min(raw_score, 100)

    # 5. Core determination
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

    # 6. External model fall-forward & priority override
    model_res = call_remote_scam_model(cleaned_text)
    if model_res:
        m_verdict = model_res.get("verdict")
        m_is_safe = model_res.get("is_safe")
        m_score = model_res.get("risk_score")
        m_category = model_res.get("primary_category")
        m_risk_level = model_res.get("risk_level")

        if m_is_safe is not None and m_is_safe != (risk_level == "safe"):
            if not m_is_safe:
                verdict = m_verdict or "SCAM_OR_FRAUD_DETECTED"
                risk_level = m_risk_level or "high"
                risk_score = max(risk_score, int(m_score) if m_score is not None else 85)
                primary_category = m_category or "fraud"
                summary = "Flagged as high-risk fraudulent content by the deep scam detection model."
            else:
                if not critical_indicators:
                    verdict = m_verdict or "LEGITIMATE_CONTENT"
                    risk_level = "safe"
                    risk_score = min(risk_score, int(m_score) if m_score is not None else 10)
                    primary_category = "legitimate"
                    summary = "Evaluated as safe content by the scam analysis engine."
        elif m_verdict and m_verdict != verdict:
            verdict = m_verdict
            if m_risk_level:
                risk_level = m_risk_level

        if m_score is not None and isinstance(m_score, (int, float)):
            risk_score = int(max(risk_score, m_score)) if risk_level != "safe" else int(m_score)
            risk_score = max(0, min(100, risk_score))

    fraud_score = round(min(risk_score / 100.0, 1.0), 4) if primary_category == "fraud" else 0.0
    spam_score = round(min(risk_score / 100.0, 1.0), 4) if primary_category == "spam" else 0.0
    legitimate_score = round(max(0.0, 1.0 - (risk_score / 100.0)), 4)

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
