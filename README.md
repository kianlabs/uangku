# UangKu

Personal finance tracking app for managing income and expenses.

## Stack

- **Frontend**: Next.js 16, React 19, TypeScript 5, Tailwind CSS 4
- **Backend**: FastAPI 0.141, SQLAlchemy 2, Pydantic 2, PostgreSQL 16, Alembic
- **Auth**: server-side sessions (signed cookie, Argon2 password hashing)
- **Testing**: pytest (backend), Vitest (frontend)
- **Tooling**: mise (dev environment), Ruff (Python lint), ESLint (frontend lint)

## Features

- Email registration/login with server-side sessions
- Income & expense transactions (create, update, delete, filter, paginate)
- Categories per type (income/expense) with ownership isolation
- Monthly budgets per category with 75%/90% usage warnings
- Onboarding tour + Mochi mascot guide (personal finance agent)
- Dashboard monthly summary, CSV export with formula-injection sanitizing
- Mobile-first UI with bottom navigation

## Prerequisites

- `mise` (manages Node.js 24, Python 3.13, PostgreSQL — see `mise.toml`)
- PostgreSQL running locally with databases `uangku` and `uangku_test`

## Setup

```sh
mise install
cp backend/.env.example backend/.env   # adjust if needed, never commit .env
createdb uangku
createdb uangku_test
cd backend && uv run alembic upgrade head && cd ..
mise run dev
```

Frontend: http://localhost:3000
Backend: http://localhost:8000
API docs: http://localhost:8000/docs
Health: http://localhost:8000/health

The frontend proxies `/api/*` to the backend via Next.js rewrites
(`BACKEND_URL`, see `frontend/next.config.ts`), so no CORS setup is needed.

## Commands

```sh
mise run dev     # frontend + backend together
mise run test    # backend pytest + frontend vitest
mise run lint    # backend ruff + frontend eslint
mise run build   # frontend production build
mise run test:e2e  # Playwright E2E (butuh dev server running)
```

Direct equivalents:

```sh
cd backend && uv run pytest && uv run ruff check .
cd frontend && npm test && npm run lint && npm run build
cd frontend && npx playwright test        # E2E
cd frontend && npx playwright install     # install browsers (first time)
```

## Environment variables

| Variable | Example | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql+psycopg://.../uangku` | dev database |
| `DATABASE_URL_TEST` | `postgresql+psycopg://.../uangku_test` | pytest database |
| `SECRET_KEY` | random string, min 32 chars | **required in production** (`APP_ENV=production` refuses default and enforces min 32 chars) |
| `HTTPS_ONLY` | `false` | must be `true` in production (enforced) or session cookies go over HTTP |
| `BACKEND_URL` | `http://localhost:8000` | frontend env (`frontend/.env.local`), rewrite target (server-side only) |
| `APP_ENV` | `development` | set `production` in prod to enable guards |
| `TRUSTED_PROXY_IPS` | `10.0.0.1` | comma-separated IPs of trusted reverse proxies; enables `X-Forwarded-For` reading for rate limiting |

## Architecture

- `frontend/src/` — Next.js App Router (`app/`), reusable components (`components/`), API clients (`lib/`)
- `backend/app/` — FastAPI app: `api/v1/` (HTTP layer), `services/` (business logic), `schemas/` (Pydantic validation), `models/` (SQLAlchemy), `core/` (config, deps, domain errors)
- `backend/tests/` — pytest suite (API + service level, per-user isolation)
- `backend/migrations/` — Alembic migrations
- `docs/` — architecture, ERD, product brief

Error contract: services raise typed `DomainError`s (`app/core/errors.py`);
the API layer maps them to a stable JSON shape: `{"error": {"code": ..., "message": ...}}`.
Authorization rule: every query is scoped to `current_user.id` — resource IDs
from the client are never trusted for ownership.

## Production notes

- Set `APP_ENV=production`, a strong `SECRET_KEY`, and `HTTPS_ONLY=true`.
- Set `TRUSTED_PROXY_IPS` to the IP(s) of your reverse proxy (e.g. Nginx/Cloudflare) so rate limiting correctly identifies individual clients behind the proxy. Without this, all users share the same rate-limit bucket.
- Run `alembic upgrade head` on deploy; never edit applied migrations.
- Auth endpoints (`/api/v1/auth/register`, `/api/v1/auth/login`) are rate-limited
  in-app to 5 requests/minute per IP (SlowAPI); export to 30/minute and
  dashboard/transaction-list to 60/minute. Storage is in-memory per process —
  for multi-worker production, switch the limiter to Redis (see
  `backend/app/core/rate_limit.py`). For defense in depth, also put
  login/register behind reverse-proxy rate limiting (e.g. nginx `limit_req`)
  in production.
- Session cookies are `httpOnly`, `SameSite=lax`, and expire with the browser
  session; logout clears the server-side session.
- See `docs/architecture.md` and `docs/erd.md` for deeper design docs.
