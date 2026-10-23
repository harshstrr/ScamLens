from app.services.analyzer import analyze

def test_otp_urgency_flagged():
    r=analyze("Your bank account will be blocked. Enter OTP immediately.")
    assert r["risk_level"] in {"medium","high"}
    assert r["findings"]
def test_plain_text_inconclusive_not_safe():
    r=analyze("The weather is nice today.")
    assert r["risk_level"]=="inconclusive"
    assert "not enough evidence" in r["summary"].lower()
def test_http_link_flagged():
    r=analyze("Visit http://example.com now")
    assert any(x["code"]=="non_https_url" for x in r["findings"])
