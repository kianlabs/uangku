from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from starlette.middleware.sessions import SessionMiddleware

from app.api.v1.auth import router as auth_router
from app.api.v1.categories import router as categories_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.export import router as export_router
from app.api.v1.transactions import router as transactions_router
from app.core.config import settings
from app.core.rate_limit import limiter

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

app.add_middleware(
    SessionMiddleware,
    secret_key=settings.secret_key,
    https_only=settings.https_only,
    same_site="lax",
    session_cookie="session",
    max_age=None,
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


app.include_router(auth_router, prefix="/api/v1")
app.include_router(categories_router, prefix="/api/v1")
app.include_router(dashboard_router, prefix="/api/v1")
app.include_router(transactions_router, prefix="/api/v1")
app.include_router(export_router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok"}
