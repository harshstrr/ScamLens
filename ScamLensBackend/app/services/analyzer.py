"""ScamLens prediction engine.

Remote classifier is queried first when available. Local URL/context rules are
used as supporting evidence and as a fallback when the remote service is down.
The public response schema is intentionally kept compatible with v2.2.
"""
from __future__ import annotations

import ipaddress
import json
import logging
import math
import re
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

VERSION = "ScamLens Prediction v2.3"
logger = logging.getLogger(__name__)


import os

EXTERNAL_MODEL_URL = os.getenv(
    "SCAMLENS_EXTERNAL_MODEL_URL",
    "https://perch-carnation-improving.ngrok-free.dev/api/analyze",
).strip()
EXTERNAL_MODEL_TIMEOUT = float(os.getenv("SCAMLENS_EXTERNAL_MODEL_TIMEOUT", "3.5"))


CONTENT_RULES = [
    {
        "code": "threat_authority_impersonation",
        "title": "Threatening Authority Impersonation",
        "pattern": re.compile(r"\b(?:digital arrest|arrest warrant|police custody|cbi officer|fbi agent|court summons|power disconnection today|electricity will be disconnected|sim will be blocked)\b", re.I),
        "points": 32,
        "detail": "The message uses a high-pressure authority or disconnection threat.",
    },
    {
        "code": "delivery_fee_fee_hold",
        "title": "Suspicious Delivery Fee Request",
        "pattern": re.compile(r"\b(?:pay|payment|fee|customs charge|clearance fee)\b.{0,90}\b(?:parcel|package|shipment|delivery|customs)\b|\b(?:parcel|package|shipment|delivery)\b.{0,90}\b(?:pay|payment|fee|customs charge|clearance fee)\b", re.I),
        "points": 24,
        "detail": "The message appears to request a payment related to a delivery.",
    },
    {
        "code": "account_takeover_threat",
        "title": "Account Restriction or Unauthorized Access Claim",
        "pattern": re.compile(r"\b(?:unauthorized (?:login|access|transaction)|account (?:has been|is|will be) (?:frozen|suspended|restricted|blocked|locked)|permanent account suspension)\b", re.I),
        "points": 25,
        "detail": "The message claims an account is compromised or will be restricted.",
    },
    {
        "code": "sensitive_credential_harvest",
        "title": "Potential Credential Harvesting",
        "pattern": re.compile(r"\b(?:send|share|reply with|provide|enter|tell us)\b.{0,70}\b(?:otp|one[- ]time password|cvv|atm pin|netbanking password|password|recovery phrase|seed phrase)\b|\b(?:otp|one[- ]time password|cvv|atm pin|netbanking password|recovery phrase|seed phrase)\b.{0,70}\b(?:send|share|reply|provide|enter|tell us)\b", re.I),
        "points": 48,
        "detail": "The message appears to ask the recipient to disclose a secret credential.",
    },
    {
        "code": "remote_access_trojan",
        "title": "Remote Access or Sideloading Request",
        "pattern": re.compile(r"\b(?:install|download)\b.{0,70}\b(?:anydesk|teamviewer|rustdesk|quicksupport|remote access app|apk file|\.exe)\b|\b(?:anydesk|teamviewer|rustdesk|quicksupport)\b.{0,70}\b(?:install|download|give access|screen share)\b", re.I),
        "points": 40,
        "detail": "The message directs the recipient to install remote-control software or an untrusted app.",
    },
    {
        "code": "fake_lottery_prize",
        "title": "Unsolicited Prize or Reward Claim",
        "pattern": re.compile(r"\b(?:you(?:'|’)ve won|lottery winner|lucky draw winner|unclaimed inheritance|jackpot winner|selected for (?:a|the) prize)\b", re.I),
        "points": 28,
        "detail": "The message claims an unexpected prize or reward.",
    },
    {
        "code": "urgent_call_to_action",
        "title": "Urgency or Artificial Deadline",
        "pattern": re.compile(r"\b(?:act immediately|urgent action required|within (?:15|30|48|60|\d+) minutes?|session expires|final notice|immediately update|account will be closed today)\b", re.I),
        "points": 12,
        "detail": "The message uses urgency or a deadline that may pressure the recipient.",
    },
    {
        "code": "unusual_payment_demands",
        "title": "Potentially Unsafe Payment Request",
        "pattern": re.compile(r"\b(?:gift card|bitcoin address|usdt trc20|western union|moneygram|crypto transfer|security deposit to release|processing fee required)\b", re.I),
        "points": 30,
        "detail": "The message mentions a payment method or fee commonly abused in scams.",
    },
    {
        "code": "job_task_scam",
        "title": "Potential Task or Job Scam",
        "pattern": re.compile(r"\b(?:prepaid task|pay (?:a )?registration fee to get (?:a )?job|deposit money to withdraw earnings|guaranteed daily income|pay to unlock tasks|review and earn)\b", re.I),
        "points": 32,
        "detail": "The message resembles a task or job offer that requires upfront payment.",
    },
    {
        "code": "bank_kyc_pan_alert",
        "title": "Potential Bank or KYC Phishing",
        "pattern": re.compile(r"\b(?:kyc (?:has )?(?:expired|suspended|blocked)|update your pan immediately|re-?activate netbanking|ebanking (?:will be )?suspended)\b", re.I),
        "points": 28,
        "detail": "The message uses a bank/KYC warning that may be intended to prompt unsafe action.",
    },
]

SHORTENERS = {
    "bit.ly", "bitly.com", "tinyurl.com", "t.co", "is.gd", "v.gd", "cutt.ly",
    "rb.gy", "shorturl.at", "ow.ly", "buff.ly", "tiny.cc", "goo.gl", "rebrand.ly",
    "bl.ink", "snip.ly", "clck.ru", "t.ly", "kutt.it", "dub.co", "linktr.ee",
    "smarturl.it", "hyperurl.co", "s.id", "soo.gd", "bc.vc", "adf.ly", "youtu.be",
    "wa.me", "t.me", "lnkd.in", "spoti.fi", "apple.co", "msft.it", "amzn.to",
}

TARGET_BRANDS = {
    "sbi", "onlinesbi", "hdfc", "hdfcbank", "icici", "icicibank", "axisbank", "youtube", "googleadservices"
    "pnb", "kotak", "paytm", "phonepe", "gpay", "bharatpe", "cred", "bhim",
    "paypal", "amazon", "google", "gmail", "microsoft", "outlook", "apple",
    "netflix", "fedex", "dhl", "indiapost", "bluedart", "delhivery", "airtel", "jio",
}

MULTI_LABEL_SUFFIXES = {
    "co.in", "firm.in", "net.in", "org.in", "gen.in", "ind.in", "ac.in", "edu.in",
    "gov.in", "res.in", "mil.in", "co.uk", "org.uk", "ac.uk", "gov.uk", "com.au",
    "net.au", "org.au", "co.nz", "com.sg", "com.my", "co.jp", "com.br", "com.cn",
}

URL_RE = re.compile(r"(?:https?://[^\s<>\"']+|\b(?:www\.)?[a-z0-9][a-z0-9.-]*\.[a-z]{2,}(?:/[^\s<>\"']*)?)", re.I)
CRITICAL_CODES = {"raw_ip_host", "at_sign_masquerade", "direct_executable_download", "strong_brand_spoof", "sensitive_credential_harvest"}


def calculate_shannon_entropy(value: str) -> float:
    if not value:
        return 0.0
    counts: dict[str, int] = {}
    for char in value:
        counts[char] = counts.get(char, 0) + 1
    return -sum((count / len(value)) * math.log2(count / len(value)) for count in counts.values())


def is_ip_host(hostname: str) -> bool:
    try:
        ipaddress.ip_address(hostname.strip("[]"))
        return True
    except ValueError:
        return False


def clean_and_normalize_url(raw: str) -> tuple[str, str, str]:
    cleaned = (raw or "").strip(" [](){}<>\"',;:!?\n\r\t")
    test_url = cleaned if re.match(r"^https?://", cleaned, re.I) else f"https://{cleaned}"
    try:
        parsed = urlparse(test_url)
        hostname = (parsed.hostname or "").lower().rstrip(".")
        return cleaned, hostname, parsed.path or ""
    except ValueError:
        return cleaned, "", ""


def registered_domain(hostname: str) -> str:
    labels = hostname.lower().strip(".").split(".")
    if len(labels) <= 2:
        return hostname.lower().strip(".")
    suffix2 = ".".join(labels[-2:])
    if suffix2 in MULTI_LABEL_SUFFIXES and len(labels) >= 3:
        return ".".join(labels[-3:])
    return suffix2


def inspect_url(raw_url: str) -> list[dict]:
    findings: list[dict] = []
    clean_url, hostname, path = clean_and_normalize_url(raw_url)
    if not hostname or "." not in hostname:
        return findings

    def add(code: str, title: str, detail: str, severity: str, points: int) -> None:
        findings.append({"code": code, "title": title, "detail": detail, "severity": severity, "points": points})

    if clean_url.lower().startswith("http://"):
        add("non_https_url", "Unencrypted HTTP Link", f"'{hostname}' uses HTTP rather than HTTPS. This alone does not prove a scam.", "low", 5)
    if is_ip_host(hostname):
        add("raw_ip_host", "Direct IP Address Destination", f"The URL uses IP address '{hostname}' instead of a normal domain.", "high", 45)
    if hostname in SHORTENERS:
        add("shortened_url", "Shortened Link", f"The destination is hidden behind URL shortener '{hostname}'.", "low", 8)
    if hostname.startswith("xn--") or ".xn--" in hostname:
        add("punycode_domain", "Punycode Domain", f"The domain '{hostname}' uses internationalized-domain encoding; verify it carefully.", "medium", 18)
    authority = clean_url.split("://", 1)[-1].split("/", 1)[0]
    if "@" in authority:
        add("at_sign_masquerade", "Misleading URL Authority", "An @ symbol in the URL authority can disguise the actual destination.", "high", 45)

    reg_domain = registered_domain(hostname)
    labels = hostname.split(".")
    # Brand impersonation is only raised when brand is in a subdomain/path-like
    # hostname but is not the registered domain's actual brand label, or when
    # deceptive hyphenated brand labels are used. Official domains such as sbi.co.in
    # are not flagged just because the brand is not in the final two labels.
    for brand in TARGET_BRANDS:
        registered_labels = reg_domain.split(".")
        registered_name = registered_labels[0] if registered_labels else ""

        official_brand_domain = registered_name == brand
        lookalike_registered_name = (
            brand in registered_name
            and registered_name != brand
            and ("-" in registered_name or registered_name.startswith(brand) or registered_name.endswith(brand))
        )
        brand_in_unregistered_subdomain = any(
            (label == brand or label.startswith(brand + "-") or label.endswith("-" + brand))
            for label in labels[:-len(registered_labels)]
        ) if len(labels) > len(registered_labels) else False
        if (lookalike_registered_name and not official_brand_domain) or brand_in_unregistered_subdomain:
            add("strong_brand_spoof", "Possible Brand-Impersonation Domain", f"Brand-like text appears in hostname '{hostname}' without being the exact registered brand label.", "high", 38)
            break

    lure_terms = ("verification", "security-update", "verify-account", "delivery-tracking", "tracking-update", "kyc-update")
    if any(term in hostname for term in lure_terms):
        add("suspicious_domain_lure", "Phishing-Like Domain Wording", f"The hostname '{hostname}' contains a commonly abused lure phrase.", "medium", 18)

    tld = labels[-1] if labels else ""
    # TLD reputation is weak evidence only; never make it critical.
    if tld in {"xyz", "top", "click", "work", "loan", "icu", "cam", "bid", "win", "download", "racing", "review", "trade", "live", "vip", "support", "help", "pw", "tk", "ml", "ga", "cf", "gq"}:
        add("uncommon_tld", "Less-Common Domain Ending", f"The domain ends in .{tld}; this is only a weak signal and is not proof of fraud.", "low", 5)

    if path.lower().endswith((".apk", ".exe", ".scr", ".bat", ".vbs", ".cmd", ".iso")):
        add("direct_executable_download", "Direct Executable Download", f"The URL points directly to a potentially risky file ('{path}').", "high", 45)
    domain_label = labels[-2] if len(labels) >= 2 else labels[0]
    if len(domain_label) > 18 and calculate_shannon_entropy(domain_label) > 3.85:
        add("high_entropy_domain", "Unusual Domain Name", f"The domain label '{domain_label}' has unusual character distribution; this is a weak signal.", "low", 6)
    return findings


def call_remote_scam_model(text: str) -> dict | None:
    """Call the preferred ngrok model. Return None on any network/schema issue."""
    if not EXTERNAL_MODEL_URL:
        return None
    try:
        payload = json.dumps({"text": text}, ensure_ascii=False).encode("utf-8")
        request = Request(EXTERNAL_MODEL_URL, data=payload, headers={"Content-Type": "application/json", "User-Agent": "ScamLens-Engine/2.3"}, method="POST")
        with urlopen(request, timeout=EXTERNAL_MODEL_TIMEOUT) as response:
            if response.status != 200:
                return None
            data = json.loads(response.read().decode("utf-8"))
            return data if isinstance(data, dict) else None
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, OSError, ValueError) as exc:
        logger.info("Remote scam model unavailable; using local fallback: %s", exc)
        return None
    except Exception:
        logger.exception("Unexpected remote scam model failure; using local fallback")
        return None


def _number(value, default=None):
    try:
        number = float(value)
        if not math.isfinite(number):
            return default
        # Accept either 0..1 probabilities or 0..100 percentages.
        if number > 1:
            number /= 100.0
        return max(0.0, min(1.0, number))
    except (TypeError, ValueError):
        return default


def _model_probability(scores: dict, *keys: str):
    for key in keys:
        if key in scores and scores[key] is not None:
            return _number(scores[key])
    return None


def _dedupe_findings(findings: list[dict]) -> list[dict]:
    result, seen = [], set()
    for finding in findings:
        code = finding.get("code")
        if code and code not in seen:
            seen.add(code)
            result.append(finding)
    return result


def analyze(text: str, source_url: str | None = None, source_type: str = "message") -> dict:
    cleaned_text = (text or "").strip()[:40000]

    
    model_res = call_remote_scam_model(cleaned_text)

    findings: list[dict] = []
    for rule in CONTENT_RULES:
        if rule["pattern"].search(cleaned_text):
            findings.append({
                "code": rule["code"], "title": rule["title"], "detail": rule["detail"],
                "severity": "medium" if rule["points"] < 25 else "high",
                "points": rule["points"],
            })

    urls = list(dict.fromkeys(URL_RE.findall(cleaned_text)))
    if source_url:
        urls.insert(0, source_url)
    for url in list(dict.fromkeys(urls))[:50]:
        findings.extend(inspect_url(url))
    findings = _dedupe_findings(findings)

    heuristic_raw = sum(int(f.get("points", 0)) for f in findings)
    critical_indicators = any(f.get("code") in CRITICAL_CODES for f in findings)
    
    heuristic_score = min(100, heuristic_raw)
    if critical_indicators:
        heuristic_score = max(heuristic_score, 82)

    model_scores = (model_res or {}).get("scores") or {}
    if not isinstance(model_scores, dict):
        model_scores = {}
    m_fraud = _model_probability(model_scores, "fraud", "fraud_score")
    m_spam = _model_probability(model_scores, "spam", "spam_score")
    m_legit = _model_probability(model_scores, "legitimate", "legitimate_score")
    if m_fraud is None:
        m_fraud = _number((model_res or {}).get("fraud_score"))
    if m_spam is None:
        m_spam = _number((model_res or {}).get("spam_score"))
    if m_legit is None:
        m_legit = _number((model_res or {}).get("legitimate_score"))

    raw_risk = (model_res or {}).get("risk_level")
    raw_verdict = str((model_res or {}).get("verdict") or "").strip().lower()
    raw_safe = (model_res or {}).get("is_safe")

    if model_res is not None:
        # Derive model risk from its strongest available confidence signal.
        if m_fraud is not None:
            model_score = round(m_fraud * 100)
        elif raw_risk in ("high", "medium", "low", "safe"):
            model_score = {"high": 78, "medium": 52, "low": 25, "safe": 5}[raw_risk]
        elif raw_verdict in {"scam", "fraud", "scam_or_fraud_detected", "high_risk"}:
            model_score = 78
        elif raw_verdict in {"spam", "spam_or_high_risk", "medium_risk"}:
            model_score = 52
        else:
            model_score = 5 if raw_safe is True else 25

        # Treat model as primary; only hard local evidence can force a high score.
        risk_score = max(model_score, 82 if critical_indicators else 0)
        if not critical_indicators and heuristic_score >= 40 and (m_fraud is None or m_fraud < 0.70):
            risk_score = max(risk_score, min(59, heuristic_score))
        if raw_safe is True and not critical_indicators and (m_fraud is None or m_fraud < 0.75):
            risk_score = min(risk_score, 20)
        fraud_score = m_fraud if m_fraud is not None else risk_score / 100
        spam_score = m_spam if m_spam is not None else 0.0
        legitimate_score = m_legit if m_legit is not None else max(0.0, 1.0 - fraud_score - spam_score)
    else:
        risk_score = heuristic_score
        fraud_score = risk_score / 100
        spam_score = 0.0
        legitimate_score = max(0.0, 1.0 - fraud_score)

    risk_score = max(0, min(100, int(round(risk_score))))
    # One final consistent mapping prevents verdict/risk_level/is_safe conflicts.
    if critical_indicators or risk_score >= 70:
        risk_level, verdict = "high", "SCAM_OR_FRAUD_DETECTED"
        confidence = "high" if model_res else ("high" if critical_indicators else "medium")
        summary = "Strong scam indicators detected. Verify independently before interacting."
        primary_category = "fraud"
    elif risk_score >= 40:
        risk_level, verdict = "medium", "SPAM_OR_HIGH_RISK"
        confidence = "medium"
        summary = "Some suspicious signals were detected. Review the findings before taking action."
        primary_category = "spam" if any(f["code"] in {"fake_lottery_prize", "job_task_scam"} for f in findings) else "fraud"
    elif risk_score >= 15:
        risk_level, verdict = "low", "LOW_RISK_CONTENT"
        confidence = "low" if not model_res else "medium"
        summary = "A few weak warning signals were detected; these do not prove malicious intent."
        primary_category = "spam" if any(f["code"] in {"fake_lottery_prize", "job_task_scam"} for f in findings) else "fraud"
    else:
        risk_level, verdict = "safe", "LEGITIMATE_CONTENT"
        confidence = "medium" if model_res else "low"
        summary = "No strong scam indicators were identified. This does not guarantee the content is safe."
        primary_category = "legitimate"

    is_safe = risk_level == "safe"
    if primary_category == "fraud":
        fraud_score = max(fraud_score, risk_score / 100 if risk_level == "high" else 0.0)
        spam_score = 0.0
    elif primary_category == "spam":
        spam_score = max(spam_score, risk_score / 100)
        fraud_score = 0.0
    else:
        fraud_score = 0.0
        spam_score = 0.0
        legitimate_score = max(legitimate_score, 1.0 - risk_score / 100)

    # Clamp and normalize probability scores to prevent malformed remote values
    # and preserve a meaningful probability distribution in the existing schema.
    fraud_score = max(0.0, min(1.0, float(fraud_score)))
    spam_score = max(0.0, min(1.0, float(spam_score)))
    legitimate_score = max(0.0, min(1.0, float(legitimate_score)))
    total = fraud_score + spam_score + legitimate_score
    if total > 0:
        fraud_score, spam_score, legitimate_score = [round(x / total, 4) for x in (fraud_score, spam_score, legitimate_score)]
    else:
        legitimate_score = 1.0

    if risk_level == "high":
        recommendations = [
            "Do not share OTPs, PINs, passwords, CVVs, or recovery phrases.",
            "Do not pay unexpected fees or open suspicious links.",
            "Verify the request through the official app, website, or published support number.",
        ]
    elif risk_level == "medium":
        recommendations = [
            "Check the sender and destination domain before responding.",
            "Avoid payments or sharing personal information until independently verified.",
        ]
    elif risk_level == "low":
        recommendations = ["Verify the sender and destination independently before sharing sensitive information."]
    else:
        recommendations = ["Stay cautious with unexpected links and never share one-time passwords or passwords."]

    now = datetime.now(timezone.utc)
    return {
        "source_type": source_type,
        "verdict": verdict,
        "is_safe": is_safe,
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
        "findings": findings[:15],
        "recommendations": recommendations,
        "critical_indicators": critical_indicators,
        "analysis_version": VERSION,
        "created_at": now,
        "analyzed_at": now.isoformat(),
    }
