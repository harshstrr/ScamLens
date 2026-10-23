from functools import lru_cache
from threading import Lock

from transformers import pipeline

MODEL_ID = "Horizon-Labs/phishing-scam-detector-base"
MAX_TOKENS = 384

_inference_lock = Lock()


@lru_cache(maxsize=1)
def _load_classifier():
    """Load once per Python process and reuse the model."""
    return pipeline(
        task="text-classification",
        model=MODEL_ID,
        top_k=None,
        device=-1,  # CPU; use a supported GPU configuration if available
    )


def predict_scam(text: str) -> dict:
    """
    Return model scores for fraud, spam and legitimate.

    These are model scores, not guaranteed calibrated probabilities.
    """
    if not isinstance(text, str) or not text.strip():
        raise ValueError("Text must be a non-empty string.")

    # Bound input size. The model supports at most 384 tokens.
    text = text[:30_000]

    classifier = _load_classifier()

    with _inference_lock:
        output = classifier(
            text,
            truncation=True,
            max_length=MAX_TOKENS,
        )

    if output and isinstance(output[0], list):
        output = output[0]
        
    scores = {
        item["label"].lower(): float(item["score"])
        for item in output
    }
    
    required_labels = {"fraud", "spam", "legitimate"}
    if not required_labels.issubset(scores):
        raise RuntimeError(
            f"Unexpected classifier labels: {sorted(scores)}"
        )

    return {
        "model": MODEL_ID,
        "fraud_score": scores["fraud"],
        "spam_score": scores["spam"],
        "legitimate_score": scores["legitimate"],
        "prediction": max(scores, key=scores.get),
    }
