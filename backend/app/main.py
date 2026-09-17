from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from starlette.middleware.sessions import SessionMiddleware

from app.api.v1.auth import router as auth_router
from app.api.v1.categories import router as categories_router
from app.core.config import settings

app = FastAPI(title="UangKu API")

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


app.include_router(auth_router, prefix="/api/v1")
app.include_router(categories_router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok"}
