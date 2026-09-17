from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware

from app.api.v1.auth import router as auth_router
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

app.include_router(auth_router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok"}
