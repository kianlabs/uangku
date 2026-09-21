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

from urllib.parse import urlparse

_STATE_CHANGING = frozenset({"POST", "PATCH", "PUT", "DELETE"})


def is_csrf_allowed(*, method: str, host: str, origin: str | None, referer: str | None) -> bool:
    """Return True jika request lolos CSRF check."""
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
    return parsed.hostname.lower() == host.lower().split(":")[0]
