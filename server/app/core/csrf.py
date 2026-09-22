"""Origin/Referer check untuk mitigasi CSRF pada cookie-based auth.

Session dipakai via cookie ``SameSite=lax`` — cukup untuk browser modern,
tapi request top-level GET tetap kirim cookie dan subdomain jahat bisa
mencoba POST cross-site pada browser lama. Middleware ini menolak
state-changing request (POST/PATCH/PUT/DELETE) yang membawa header
``Origin``/``Referer`` dengan host berbeda dari ``Host`` request.

Request tanpa header Origin/Referer (non-browser, TestClient, curl)
diizinkan — client same-origin via Next.js rewrite selalu kirim Origin
yang cocok saat fetch dari browser.
"""

from __future__ import annotations

import ipaddress
from urllib.parse import urlparse

_STATE_CHANGING = frozenset({"POST", "PATCH", "PUT", "DELETE"})


def _normalize_host(host: str) -> str:
    """Ambil hostname tanpa port; tangani literal IPv6 "[::1]:8000"."""
    host = host.lower().strip()
    if host.startswith("["):
        return host[1:].split("]")[0]
    return host.split(":")[0]


def is_loopback_peer(peer: str) -> bool:
    """True jika koneksi langsung berasal dari mesin sendiri.

    Meliputi 127.0.0.1, ::1, bentuk IPv4-mapped (::ffff:127.0.0.1 yang
    dilaporkan uvicorn saat diakses via proxy lokal), dan "localhost".
    """
    if peer == "localhost":
        return True
    try:
        return ipaddress.ip_address(peer).is_loopback
    except ValueError:
        return False


def is_csrf_allowed(
    *,
    method: str,
    host: str,
    origin: str | None,
    referer: str | None,
    forwarded_host: str | None = None,
) -> bool:
    """Return True jika request lolos CSRF check.

    ``forwarded_host`` adalah ``X-Forwarded-Host`` yang dipasang reverse
    proxy (mis. Next.js rewrite) berisi host yang dilihat browser. Cocok
    untuk akses via IP/hostname lain (mis. Tailscale) di mana ``Host`` yang
    sampai ke backend adalah milik backend sendiri (localhost:8000).
    Pemanggil WAJIB hanya meneruskan header ini dari peer terpercaya
    (loopback / TRUSTED_PROXY_IPS) — kalau tidak, penyerang bisa memalsukan
    keduanya (Origin + X-Forwarded-Host) dari request langsung.
    """
    if method.upper() not in _STATE_CHANGING:
        return True
    candidate = origin or referer
    if not candidate:
        return True
    try:
        parsed = urlparse(candidate)
    except ValueError:
        return False
    if not parsed.hostname:
        return False
    origin_host = parsed.hostname.lower()
    if origin_host == _normalize_host(host):
        return True
    return bool(forwarded_host and origin_host == _normalize_host(forwarded_host))
