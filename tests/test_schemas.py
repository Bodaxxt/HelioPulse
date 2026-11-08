"""Unit tests for SiteInput Pydantic v2 schema validations."""

from datetime import date, timedelta
import pytest
from pydantic import ValidationError
from app.schemas.site import SiteInput


def test_valid_site_input():
    """Test valid Egyptian industrial rooftop input."""
    valid_data = {
        "site_id": "EGY-10TH-RAMADAN-01",
        "site_name": "10th of Ramadan Manufacturing Plant",
        "latitude": 30.3,
        "longitude": 31.7,
        "capacity_kwp": 250.0,
        "tilt": 25.0,
        "azimuth": 180.0,
        "last_cleaned_date": date.today() - timedelta(days=20),
        "electricity_rate_egp": 2.5,
        "cleaning_cost_egp": 4500.0,
    }
    site = SiteInput(**valid_data)
    assert site.latitude == 30.3
    assert site.longitude == 31.7
    assert site.capacity_kwp == 250.0
    # Auto-calculated panel area: 250 * 5.0 = 1250.0 m2
    assert site.panel_area_m2 == 1250.0


def test_latitude_boundaries():
    """Latitude must strictly be within [22.0, 31.5]."""
    base_kwargs = {
        "longitude": 31.0,
        "capacity_kwp": 100.0,
        "last_cleaned_date": date.today() - timedelta(days=5),
    }

    # Too far south (Sudan border)
    with pytest.raises(ValidationError) as exc:
        SiteInput(latitude=21.9, **base_kwargs)
    assert "latitude" in str(exc.value)

    # Too far north (Mediterranean sea / Europe)
    with pytest.raises(ValidationError) as exc:
        SiteInput(latitude=31.6, **base_kwargs)
    assert "latitude" in str(exc.value)

    # Valid boundary extremes
    site_min = SiteInput(latitude=22.0, **base_kwargs)
    assert site_min.latitude == 22.0

    site_max = SiteInput(latitude=31.5, **base_kwargs)
    assert site_max.latitude == 31.5


def test_longitude_boundaries():
    """Longitude must strictly be within [25.0, 37.0]."""
    base_kwargs = {
        "latitude": 30.0,
        "capacity_kwp": 100.0,
        "last_cleaned_date": date.today() - timedelta(days=5),
    }

    # Too far west (Libyan territory)
    with pytest.raises(ValidationError) as exc:
        SiteInput(longitude=24.9, **base_kwargs)
    assert "longitude" in str(exc.value)

    # Too far east (Red Sea / Saudi border)
    with pytest.raises(ValidationError) as exc:
        SiteInput(longitude=37.1, **base_kwargs)
    assert "longitude" in str(exc.value)

    # Valid boundary extremes
    site_min = SiteInput(longitude=25.0, **base_kwargs)
    assert site_min.longitude == 25.0

    site_max = SiteInput(longitude=37.0, **base_kwargs)
    assert site_max.longitude == 37.0


def test_capacity_boundaries():
    """Capacity must be between 5.0 and 2000.0 kWp."""
    base_kwargs = {
        "latitude": 30.0,
        "longitude": 31.0,
        "last_cleaned_date": date.today() - timedelta(days=5),
    }

    # Below 5 kWp
    with pytest.raises(ValidationError):
        SiteInput(capacity_kwp=4.9, **base_kwargs)

    # Above 2000 kWp
    with pytest.raises(ValidationError):
        SiteInput(capacity_kwp=2000.1, **base_kwargs)

    # Valid extremes
    site_min = SiteInput(capacity_kwp=5.0, **base_kwargs)
    assert site_min.capacity_kwp == 5.0

    site_max = SiteInput(capacity_kwp=2000.0, **base_kwargs)
    assert site_max.capacity_kwp == 2000.0


def test_tilt_and_azimuth_boundaries():
    """Tilt [0-60] and azimuth [0-360] validation."""
    base_kwargs = {
        "latitude": 30.0,
        "longitude": 31.0,
        "capacity_kwp": 100.0,
        "last_cleaned_date": date.today() - timedelta(days=5),
    }

    with pytest.raises(ValidationError):
        SiteInput(tilt=-1.0, **base_kwargs)
    with pytest.raises(ValidationError):
        SiteInput(tilt=60.1, **base_kwargs)

    with pytest.raises(ValidationError):
        SiteInput(azimuth=-0.1, **base_kwargs)
    with pytest.raises(ValidationError):
        SiteInput(azimuth=360.1, **base_kwargs)


def test_future_last_cleaned_date_rejected():
    """Last cleaned date cannot be in the future."""
    tomorrow = date.today() + timedelta(days=1)
    with pytest.raises(ValidationError) as exc:
        SiteInput(
            latitude=30.0,
            longitude=31.0,
            capacity_kwp=100.0,
            last_cleaned_date=tomorrow,
        )
    assert "last_cleaned_date" in str(exc.value)


def test_panel_area_auto_calculation():
    """Ensure panel_area_m2 is automatically computed as capacity_kwp * 5.0 if not provided."""
    site = SiteInput(
        latitude=29.9,
        longitude=31.3,
        capacity_kwp=150.0,
        last_cleaned_date=date.today() - timedelta(days=10),
    )
    assert site.panel_area_m2 == 750.0

    # Explicit area should be respected
    site_custom = SiteInput(
        latitude=29.9,
        longitude=31.3,
        capacity_kwp=150.0,
        last_cleaned_date=date.today() - timedelta(days=10),
        panel_area_m2=820.5,
    )
    assert site_custom.panel_area_m2 == 820.5

