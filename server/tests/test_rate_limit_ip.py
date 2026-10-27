"""Regression test untuk resolusi IP rate-limit.

Menutup temuan T-03/H-3/K-3: X-Forwarded-For bisa dipalsukan sehingga
rate limit login/register di-bypass.
"""

from __future__ import annotations

from starlette.requests import Request

from app.core.config import settings
from app.core.rate_limit import get_client_ip


def _request(peer: str, xff: str | None = None) -> Request:
    headers = []
    if xff is not None:
        headers.append((b"x-forwarded-for", xff.encode()))
    scope = {
        "type": "http",
        "http_version": "1.1",
        "method": "GET",
        "scheme": "http",
        "path": "/api/v1/auth/login",
        "raw_path": b"/api/v1/auth/login",
        "query_string": b"",
        "root_path": "",
        "headers": headers,
        "client": (peer, 51234),
        "server": ("testserver", 80),
    }
    return Request(scope)


def test_untrusted_peer_cannot_spoof_xff() -> None:
    """Client yang bukan proxy: header XFF diabaikan sepenuhnya."""
    assert get_client_ip(_request("8.8.8.8", "1.2.3.4")) == "8.8.8.8"


def test_trusted_proxy_uses_rightmost_hop(monkeypatch) -> None:
    """Hop dibaca dari kanan: entri paling kiri bisa dipalsukan client."""
    monkeypatch.setattr(settings, "trusted_proxy_ips", "10.0.0.0/8")
    # client mengirim "1.2.3.4", proxy asli menambahkan IP sebenarnya di kanan
    assert get_client_ip(_request("10.0.0.5", "1.2.3.4, 203.0.113.9")) == "203.0.113.9"


def test_trusted_proxy_cidr_match(monkeypatch) -> None:
    """TRUSTED_PROXY_IPS mendukung CIDR, bukan hanya exact match."""
    monkeypatch.setattr(settings, "trusted_proxy_ips", "172.18.0.0/16")
    assert get_client_ip(_request("172.18.0.3", "198.51.100.7")) == "198.51.100.7"


def test_rotating_xff_does_not_create_new_buckets(monkeypatch) -> None:
    """Memutar nilai XFF tidak boleh menghasilkan key rate-limit baru."""
    monkeypatch.setattr(settings, "trusted_proxy_ips", "10.0.0.0/8")
    keys = {
        get_client_ip(_request("10.0.0.5", f"10.9.9.{i}, 203.0.113.9"))
        for i in range(1, 6)
    }
    assert keys == {"203.0.113.9"}
