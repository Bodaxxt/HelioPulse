"""Tests for automated WhatsApp dispatch service and API endpoint."""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.whatsapp_service import normalize_phone_number, whatsapp_service
from app.schemas.dispatch import WhatsAppDispatchRequest

client = TestClient(app)


def test_normalize_phone_number_egyptian_formats():
    """Verify Egyptian phone formats are converted to +20 international format."""
    # Local format with leading 0
    assert normalize_phone_number("01012345678") == "+201012345678"
    assert normalize_phone_number("01198765432") == "+201198765432"
    assert normalize_phone_number("01234567890") == "+201234567890"
    assert normalize_phone_number("01555555555") == "+201555555555"

    # With spaces or dashes
    assert normalize_phone_number(" 010-1234-5678 ") == "+201012345678"

    # Already with 20 prefix but missing +
    assert normalize_phone_number("201012345678") == "+201012345678"

    # Full international format
    assert normalize_phone_number("+201012345678") == "+201012345678"


def test_whatsapp_service_simulation_dispatch():
    """Verify dispatch returns successful simulation result when no credentials are provided."""
    req = WhatsAppDispatchRequest(
        recipient_phone="01012345678",
        message="☀️ HelioPulse Cleaning Alert: Recommended wash date is 2026-11-20.",
        site_name="10th of Ramadan Manufacturing Plant",
    )
    res = whatsapp_service.dispatch(req)

    assert res.success is True
    assert res.status in ("simulated", "delivered")
    assert res.recipient_phone == "+201012345678"
    assert res.message_id.startswith("sim_wa_") or res.message_id.startswith("wamid_")
    assert "HelioPulse" in res.delivered_text


def test_api_dispatch_whatsapp_endpoint():
    """Verify POST /api/v1/dispatch/whatsapp works properly."""
    payload = {
        "recipient_phone": "01098765432",
        "message": "☀️ *HelioPulse Alert* 🇪🇬 Clean site on 2026-11-25 to save 14,000 EGP.",
        "site_id": "EGY-RAMADAN-01",
        "site_name": "Al-Amal Textiles Factory",
    }
    response = client.post("/api/v1/dispatch/whatsapp", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["success"] is True
    assert data["recipient_phone"] == "+201098765432"
    assert data["status"] in ("simulated", "delivered")
    assert len(data["message_id"]) > 5
