"""Tests untuk get_client_ip — trusted proxy X-Forwarded-For resolution."""

from unittest.mock import MagicMock, patch

from app.core.rate_limit import get_client_ip


def _make_request(
    client_host: str,
    x_forwarded_for: str | None = None,
) -> MagicMock:
    """Helper: buat mock Request dengan client.host dan optional X-Forwarded-For."""
    request = MagicMock()
    request.client = MagicMock()
    request.client.host = client_host

    headers: dict[str, str] = {}
    if x_forwarded_for is not None:
        headers["X-Forwarded-For"] = x_forwarded_for
    request.headers = headers
    return request


# ---------------------------------------------------------------------------
# Tanpa proxy (default dev setup — TRUSTED_PROXY_IPS kosong)
# ---------------------------------------------------------------------------


def test_no_proxy_returns_client_host():
    """Tanpa trusted proxy, langsung pakai request.client.host."""
    request = _make_request("203.0.113.1")
    with patch("app.core.rate_limit.settings") as mock_settings:
        mock_settings.trusted_proxy_set = frozenset()
        ip = get_client_ip(request)
    assert ip == "203.0.113.1"


def test_no_proxy_ignores_xff_header():
    """Tanpa trusted proxy, X-Forwarded-For harus diabaikan (anti-spoofing)."""
    request = _make_request("203.0.113.1", x_forwarded_for="1.2.3.4")
    with patch("app.core.rate_limit.settings") as mock_settings:
        mock_settings.trusted_proxy_set = frozenset()
        ip = get_client_ip(request)
    # Harus tetap pakai client.host, bukan header yang bisa di-spoof
    assert ip == "203.0.113.1"


# ---------------------------------------------------------------------------
# Dengan trusted proxy — membaca X-Forwarded-For
# ---------------------------------------------------------------------------


def test_trusted_proxy_reads_xff():
    """Request dari trusted proxy → pakai IP pertama di X-Forwarded-For."""
    # 10.0.0.1 adalah IP proxy, 5.6.7.8 adalah client asli
    request = _make_request("10.0.0.1", x_forwarded_for="5.6.7.8")
    with patch("app.core.rate_limit.settings") as mock_settings:
        mock_settings.trusted_proxy_set = frozenset({"10.0.0.1"})
        ip = get_client_ip(request)
    assert ip == "5.6.7.8"


def test_trusted_proxy_xff_chain_takes_first():
    """X-Forwarded-For chain (multi-hop) → ambil IP paling pertama (client asli)."""
    request = _make_request("10.0.0.1", x_forwarded_for="5.6.7.8, 10.0.0.2, 10.0.0.1")
    with patch("app.core.rate_limit.settings") as mock_settings:
        mock_settings.trusted_proxy_set = frozenset({"10.0.0.1"})
        ip = get_client_ip(request)
    assert ip == "5.6.7.8"


def test_trusted_proxy_no_xff_falls_back_to_client_host():
    """Trusted proxy tapi tidak ada X-Forwarded-For → fallback ke client.host."""
    request = _make_request("10.0.0.1", x_forwarded_for=None)
    with patch("app.core.rate_limit.settings") as mock_settings:
        mock_settings.trusted_proxy_set = frozenset({"10.0.0.1"})
        ip = get_client_ip(request)
    assert ip == "10.0.0.1"


def test_untrusted_ip_ignores_xff():
    """Request dari IP yang BUKAN di trusted set → abaikan X-Forwarded-For."""
    # Attacker mencoba spoof dengan mengirim X-Forwarded-For sendiri
    request = _make_request("99.99.99.99", x_forwarded_for="127.0.0.1")
    with patch("app.core.rate_limit.settings") as mock_settings:
        mock_settings.trusted_proxy_set = frozenset({"10.0.0.1"})
        ip = get_client_ip(request)
    assert ip == "99.99.99.99"


def test_no_client_returns_unknown():
    """Edge case: request.client adalah None → return 'unknown'."""
    request = MagicMock()
    request.client = None
    request.headers = {}
    with patch("app.core.rate_limit.settings") as mock_settings:
        mock_settings.trusted_proxy_set = frozenset()
        ip = get_client_ip(request)
    assert ip == "unknown"


# ---------------------------------------------------------------------------
# Settings.trusted_proxy_set parsing
# ---------------------------------------------------------------------------


def test_settings_trusted_proxy_set_empty():
    """TRUSTED_PROXY_IPS kosong → frozenset kosong."""
    from app.core.config import Settings
    s = Settings(trusted_proxy_ips="")
    assert s.trusted_proxy_set == frozenset()


def test_settings_trusted_proxy_set_single():
    """TRUSTED_PROXY_IPS satu IP."""
    from app.core.config import Settings
    s = Settings(trusted_proxy_ips="10.0.0.1")
    assert s.trusted_proxy_set == frozenset({"10.0.0.1"})


def test_settings_trusted_proxy_set_multiple():
    """TRUSTED_PROXY_IPS multiple IP comma-separated."""
    from app.core.config import Settings
    s = Settings(trusted_proxy_ips="10.0.0.1, 10.0.0.2,  192.168.1.1")
    assert s.trusted_proxy_set == frozenset({"10.0.0.1", "10.0.0.2", "192.168.1.1"})


# ---------------------------------------------------------------------------
# Proxy loopback (Next rewrite satu container) — dipercaya implisit
# ---------------------------------------------------------------------------


def test_loopback_proxy_reads_xff():
    """Peer loopback diperlakukan seperti trusted proxy (konsisten dgn CSRF)."""
    for peer in ("127.0.0.1", "::1", "::ffff:127.0.0.1"):
        request = _make_request(peer, x_forwarded_for="5.6.7.8")
        with patch("app.core.rate_limit.settings") as mock_settings:
            mock_settings.trusted_proxy_set = frozenset()
            ip = get_client_ip(request)
        assert ip == "5.6.7.8", f"peer {peer} harus percaya XFF"
