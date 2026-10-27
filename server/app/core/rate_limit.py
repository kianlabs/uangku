"""Shared rate limiter for API endpoints.

``get_client_ip`` resolves the real client IP safely:
- If the direct connection comes from a configured TRUSTED_PROXY_IP, the first
  address in the ``X-Forwarded-For`` header is used (set by the proxy).
- Otherwise (local dev, or untrusted caller) we fall back to
  ``request.client.host`` so an attacker cannot spoof the header by simply
  adding it to their own request.

Limits: auth 5/minute (brute-force), export 30/minute (scraping/DoS),
dashboard + transaction list 60/minute (scraping).

Production setup:
  Set ``TRUSTED_PROXY_IPS`` env var to the IP(s) of your reverse proxy, e.g.
  ``TRUSTED_PROXY_IPS=10.0.0.1`` for a single Nginx instance.
  Multiple IPs are comma-separated: ``TRUSTED_PROXY_IPS=10.0.0.1,10.0.0.2``.

Multi-worker note:
  Default storage is in-memory per process (SlowAPI). For multi-worker
  deployments (e.g. gunicorn -k uvicorn.workers with >1 worker), switch to
  Redis storage so buckets are shared, e.g.
  ``Limiter(key_func=get_client_ip, storage_uri="redis://localhost:6379")``.
"""

import ipaddress

from fastapi import Request
from slowapi import Limiter

from app.core.config import settings


def _is_trusted_proxy(ip: str) -> bool:
    """True bila IP adalah proxy tepercaya (CIDR-aware) atau loopback."""
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return False
    if isinstance(addr, ipaddress.IPv6Address) and addr.ipv4_mapped:
        addr = addr.ipv4_mapped
    if addr.is_loopback:
        return True
    return any(addr in net for net in settings.trusted_proxy_networks)


def get_client_ip(request: Request) -> str:
    """Return the real client IP, accounting for trusted reverse proxies.

    X-Forwarded-For hanya dipercaya bila koneksi langsung datang dari proxy
    tepercaya, dan hop dibaca dari KANAN (hop yang ditambahkan proxy kita),
    bukan entri pertama yang bisa dipalsukan client.
    """
    direct_ip = request.client.host if request.client else "unknown"

    if not _is_trusted_proxy(direct_ip):
        return direct_ip

    forwarded_for = request.headers.get("X-Forwarded-For", "")
    hops = [hop.strip() for hop in forwarded_for.split(",") if hop.strip()]
    for hop in reversed(hops):
        try:
            ipaddress.ip_address(hop)
        except ValueError:
            continue
        if not _is_trusted_proxy(hop):
            return hop

    return direct_ip


limiter = Limiter(key_func=get_client_ip)
