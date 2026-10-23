
from app.services.scam_detection.hf_classifier import predict_scam


def test_classifier_returns_expected_fields():
    result = predict_scam(
        "Your account is blocked. Share your OTP immediately."
    )

    assert result["model"]
    assert 0 <= result["fraud_score"] <= 1
    assert 0 <= result["spam_score"] <= 1
    assert 0 <= result["legitimate_score"] <= 1

    assert result["prediction"] in {
        "fraud",
        "spam",
        "legitimate",
    }
