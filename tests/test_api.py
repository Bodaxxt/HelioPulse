"""Integration tests for FastAPI endpoints."""

from datetime import date, timedelta
from fastapi.testclient import TestClient
import pytest

from app.main import app

client = TestClient(app)


def test_root_endpoint():
    """Root endpoint responds with online status and links."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["version"] == "1.0.0-uncalibrated"


def test_health_check_endpoint():
    """Health check returns 200 healthy status."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["version"] == "1.0.0-uncalibrated"
    assert "timestamp" in data


def test_optimize_cleaning_endpoint_valid():
    """POST /api/v1/optimize-cleaning with valid Egyptian site."""
    ref_date = date(2026, 11, 8)
    last_cleaned = ref_date - timedelta(days=15)

    payload = {
        "site_id": "TEST-CAIRO-001",
        "site_name": "Helwan Industrial Steel Rooftop",
        "latitude": 29.85,
        "longitude": 31.33,
        "capacity_kwp": 200.0,
        "tilt": 25.0,
        "azimuth": 180.0,
        "last_cleaned_date": last_cleaned.isoformat(),
        "simulation_start_date": ref_date.isoformat(),
        "electricity_rate_egp": 2.2,
        "cleaning_cost_egp": 4000.0,
    }

    response = client.post("/api/v1/optimize-cleaning", json=payload)
    assert response.status_code == 200, response.text
    data = response.json()

    # Core response specification checks
    assert data["model_version"] == "1.0.0-uncalibrated"
    assert "optimal_cleaning_date" in data
    assert "optimal_day_index" in data
    assert 1 <= data["optimal_day_index"] <= 90
    assert "egp_saved" in data
    assert data["egp_saved"] >= 0.0

    # Water metrics (3.0 Liters/m2)
    # Area for 200 kWp = 1000 m2 -> 3000 Liters per clean
    assert data["water_per_clean_liters"] == 3000.0
    assert data["water_saved_liters"] >= 0.0

    # Uncertainty scenarios
    scenarios = data["uncertainty_scenarios"]
    assert "low_dust" in scenarios
    assert "base_dust" in scenarios
    assert "high_dust" in scenarios
    assert scenarios["high_dust"]["optimal_day_index"] <= scenarios["base_dust"]["optimal_day_index"]

    # Date range
    date_range = data["optimal_date_range"]
    assert "earliest" in date_range
    assert "latest" in date_range
    assert "recommended" in date_range

    # Telemetry provenance
    assert data["weather_snapshot_status"] in ["loaded_from_cache", "fetched_and_cached"]

    # Daily breakdown
    daily = data["daily_metrics"]
    assert len(daily) == 90
    assert daily[0]["day_index"] == 1
    assert daily[-1]["day_index"] == 90


def test_optimize_cleaning_validation_errors():
    """Boundary validation errors return 422 Unprocessable Entity."""
    # 1. Invalid latitude outside Egypt (e.g. 45.0 in Europe)
    bad_lat = {
        "latitude": 45.0,
        "longitude": 31.0,
        "capacity_kwp": 100.0,
        "last_cleaned_date": "2026-10-01",
    }
    resp = client.post("/api/v1/optimize-cleaning", json=bad_lat)
    assert resp.status_code == 422

    # 2. Invalid longitude outside Egypt (e.g. 10.0 in Tunisia)
    bad_lon = {
        "latitude": 30.0,
        "longitude": 10.0,
        "capacity_kwp": 100.0,
        "last_cleaned_date": "2026-10-01",
    }
    resp = client.post("/api/v1/optimize-cleaning", json=bad_lon)
    assert resp.status_code == 422

    # 3. Capacity out of bounds (3000 kWp > 2000 kWp limit)
    bad_cap = {
        "latitude": 30.0,
        "longitude": 31.0,
        "capacity_kwp": 3000.0,
        "last_cleaned_date": "2026-10-01",
    }
    resp = client.post("/api/v1/optimize-cleaning", json=bad_cap)
    assert resp.status_code == 422

    # 4. Future last_cleaned_date
    future_date = {
        "latitude": 30.0,
        "longitude": 31.0,
        "capacity_kwp": 100.0,
        "last_cleaned_date": "2099-01-01",
        "simulation_start_date": "2026-11-08",
    }
    resp = client.post("/api/v1/optimize-cleaning", json=future_date)
    assert resp.status_code == 422

