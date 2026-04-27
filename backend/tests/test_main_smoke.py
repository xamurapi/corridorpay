"""Smoke test: app imports + /health endpoint."""
from fastapi.testclient import TestClient

from app.main import app


def test_health():
    with TestClient(app) as client:
        r = client.get("/health")
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "ok"
        assert body["service"] == "corridorpay"


def test_openapi_loads():
    with TestClient(app) as client:
        r = client.get("/api/openapi.json")
        assert r.status_code == 200
        body = r.json()
        assert body["info"]["title"] == "CorridorPay API"
        # ensure key routes registered
        paths = body["paths"]
        assert "/v1/auth/signup" in paths
        assert "/v1/wallets" in paths
        assert "/v1/public/corridors" in paths
        assert "/admin/v1/dashboard" in paths
