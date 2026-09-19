"""Fixture global untuk isolasi test."""

import pytest

from app.core.rate_limit import limiter


@pytest.fixture(autouse=True)
def _reset_rate_limit():
    """Reset budget rate-limit (storage in-memory global) sebelum tiap test
    agar satu test tidak menghabiskan jatah test lain. Test 429 tetap valid
    karena 6 request-nya terjadi dalam satu test yang sama."""
    limiter._storage.reset()
    yield
    limiter._storage.reset()
