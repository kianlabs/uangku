import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from sqlalchemy.exc import DBAPIError
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.api.v1.auth import router as auth_router
from app.api.v1.budgets import router as budgets_router
from app.api.v1.categories import router as categories_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.export import router as export_router
from app.api.v1.transactions import router as transactions_router
from app.api.v1.user import router as user_router
from app.core.config import settings
from app.core.rate_limit import limiter

logger = logging.getLogger("uangku")

app = FastAPI(title="UangKu API")
app.state.limiter = limiter


def custom_rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={
            "error": {
                "code": "RATE_LIMITED",
                "message": "Rate limit exceeded. Please try again later.",
            }
        },
    )


app.add_exception_handler(RateLimitExceeded, custom_rate_limit_handler)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "same-origin"
        return response


app.add_middleware(SecurityHeadersMiddleware)


class CsrfOriginMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        from app.core.csrf import is_csrf_allowed, is_loopback_peer

        host = request.headers.get("host", "")
        origin = request.headers.get("origin")
        referer = request.headers.get("referer")
        # Percaya X-Forwarded-Host hanya dari proxy lokal/tepercaya
        # (pola yang sama seperti get_client_ip di rate_limit.py).
        peer = request.client.host if request.client else ""
        forwarded_host = request.headers.get("x-forwarded-host")
        if peer not in settings.trusted_proxy_set and not is_loopback_peer(peer):
            forwarded_host = None
        if not is_csrf_allowed(
            method=request.method,
            host=host,
            origin=origin,
            referer=referer,
            forwarded_host=forwarded_host,
        ):
            return JSONResponse(
                status_code=403,
                content={
                    "error": {
                        "code": "CSRF_FAILED",
                        "message": "Cross-origin request rejected.",
                    }
                },
            )
        return await call_next(request)


app.add_middleware(CsrfOriginMiddleware)

app.add_middleware(
    SessionMiddleware,
    secret_key=settings.secret_key,
    https_only=settings.https_only,
    same_site="lax",
    session_cookie="session",
    max_age=7 * 24 * 3600,
)


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException):
    if isinstance(exc.detail, dict) and "code" in exc.detail:
        content = {"error": exc.detail}
    else:
        content = {
            "error": {
                "code": f"HTTP_{exc.status_code}",
                "message": str(exc.detail),
            }
        }

    return JSONResponse(
        status_code=exc.status_code,
        content=content,
        headers=exc.headers,
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError):
    fields = [
        {
            "field": ".".join(str(loc) for loc in err["loc"] if loc != "body"),
            "message": err["msg"],
        }
        for err in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed.",
                "fields": fields,
            }
        },
    )


@app.exception_handler(DBAPIError)
async def db_error_handler(request: Request, exc: DBAPIError):
    # DB down/timeout/integrity yang lolos guard service -> 503 agar client
    # menampilkan "coba lagi", bukan hang sampai timeout.
    logger.warning("DB error: %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=503,
        content={
            "error": {
                "code": "SERVICE_UNAVAILABLE",
                "message": "Layanan sibuk, coba lagi.",
            }
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error: %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "Terjadi kesalahan server.",
            }
        },
    )


app.include_router(auth_router, prefix="/api/v1")
app.include_router(budgets_router, prefix="/api/v1")
app.include_router(categories_router, prefix="/api/v1")
app.include_router(dashboard_router, prefix="/api/v1")
app.include_router(transactions_router, prefix="/api/v1")
app.include_router(export_router, prefix="/api/v1")
app.include_router(user_router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok"}
