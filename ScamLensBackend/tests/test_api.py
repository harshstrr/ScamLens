from fastapi.testclient import TestClient
from app.main import app
client=TestClient(app)
def test_health():
    r=client.get("/health"); assert r.status_code==200 and r.json()["status"]=="ok"
def test_guest_analyze_does_not_save():
    r=client.post("/api/v1/scans/analyze",json={"source_type":"message","text":"Your account will be blocked. Enter OTP immediately.","save_to_history":False})
    assert r.status_code==200 and r.json()["saved_to_history"] is False
