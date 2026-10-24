from functools import lru_cache
from threading import Lock
from app.core.config import get_settings
from transformers import pipeline
settings = get_settings()

HF_TOKEN = settings.hf_token
MODEL_ID = "Horizon-Labs/phishing-scam-detector-base"
MAX_TOKENS = 384

_inference_lock = Lock()


@lru_cache(maxsize=1)
def _load_classifier():
    """
    Loads the text classification pipeline.
    Passes the token directly to the pipeline config to suppress unauthenticated warnings.
    """
    pipeline_kwargs = {
        "task": "text-classification",
        "model": MODEL_ID,
        "top_k": None,
        "device": -1,  # Forces CPU inference
    }
    
    # Explicitly pass the token if it exists in the environment
    if HF_TOKEN:
        pipeline_kwargs["token"] = HF_TOKEN

    return pipeline(**pipeline_kwargs)


def predict_scam(text: str) -> dict:
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


