"""
Shared pytest fixtures for HelioPulse test suite.
Provides reusable site inputs, snapshot cache management, and common test data.
"""

import shutil
from datetime import date, timedelta
from pathlib import Path

import pytest

from app.schemas.site import SiteInput

# ---------------------------------------------------------------------------
# Base directory for the project
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
TEST_SNAPSHOT_DIR = BASE_DIR / "snapshots" / "test_run_cache"


# ---------------------------------------------------------------------------
# Snapshot cache: auto-create before tests, auto-clean after
# ---------------------------------------------------------------------------
@pytest.fixture(scope="session", autouse=True)
def manage_test_snapshot_dir():
    """Create a dedicated test snapshot directory and clean it up after the session."""
    TEST_SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
    yield
    if TEST_SNAPSHOT_DIR.exists():
        shutil.rmtree(TEST_SNAPSHOT_DIR, ignore_errors=True)


# ---------------------------------------------------------------------------
# Standard SiteInput instances for reuse across tests
# ---------------------------------------------------------------------------
@pytest.fixture
def valid_site_input() -> SiteInput:
    """A fully valid SiteInput for the 10th of Ramadan industrial zone."""
    return SiteInput(
        latitude=30.3,
        longitude=31.75,
        capacity_kwp=500.0,
        tilt=25.0,
        azimuth=180.0,
        last_cleaned_date=date.today() - timedelta(days=10),
        electricity_rate_egp=2.0,
        cleaning_cost_egp=5000.0,
    )


@pytest.fixture
def small_site_input() -> SiteInput:
    """A small-capacity site (100 kWp) for lightweight physics tests."""
    return SiteInput(
        latitude=29.85,
        longitude=31.33,
        capacity_kwp=100.0,
        tilt=20.0,
        azimuth=180.0,
        last_cleaned_date=date.today() - timedelta(days=5),
        electricity_rate_egp=2.0,
        cleaning_cost_egp=5000.0,
    )


@pytest.fixture
def high_dust_site_input() -> SiteInput:
    """A site configured for high-dust scenario testing."""
    return SiteInput(
        latitude=30.9,
        longitude=29.5,
        capacity_kwp=800.0,
        tilt=25.0,
        azimuth=180.0,
        last_cleaned_date=date.today() - timedelta(days=20),
        electricity_rate_egp=2.5,
        cleaning_cost_egp=8000.0,
    )

