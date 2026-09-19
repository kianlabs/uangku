"""Shared rate limiter for auth endpoints.

``get_client_ip`` resolves the real client IP safely:
- If the direct connection comes from a configured TRUSTED_PROXY_IP, the first
  address in the ``X-Forwarded-For`` header is used (set by the proxy).
- Otherwise (local dev, or untrusted caller) we fall back to
  ``request.client.host`` so an attacker cannot spoof the header by simply
  adding it to their own request.

Production setup:
  Set ``TRUSTED_PROXY_IPS`` env var to the IP(s) of your reverse proxy, e.g.
  ``TRUSTED_PROXY_IPS=10.0.0.1`` for a single Nginx instance.
  Multiple IPs are comma-separated: ``TRUSTED_PROXY_IPS=10.0.0.1,10.0.0.2``.
"""

from fastapi import Request
from slowapi import Limiter

from app.core.config import settings


def get_client_ip(request: Request) -> str:
    """Return the real client IP, accounting for trusted reverse proxies."""
    direct_ip = request.client.host if request.client else "unknown"

    # Only read X-Forwarded-For when the direct connection is from a trusted proxy.
    if direct_ip in settings.trusted_proxy_set:
        forwarded_for = request.headers.get("X-Forwarded-For", "")
        if forwarded_for:
            # X-Forwarded-For may be a comma-separated list; first entry is client IP.
            client_ip = forwarded_for.split(",")[0].strip()
            if client_ip:
                return client_ip

    return direct_ip


limiter = Limiter(key_func=get_client_ip)
