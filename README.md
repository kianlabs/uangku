# UangKu

Personal finance tracking app for managing income and expenses.

## Stack

- **Client**: Next.js 16, React 19, TypeScript 5, Tailwind CSS 4
- **Server**: FastAPI 0.141, SQLAlchemy 2, Pydantic 2, PostgreSQL 16, Alembic
- **Auth**: server-side sessions (signed cookie, Argon2 password hashing)
- **Testing**: pytest (server), Vitest (client)
- **Tooling**: mise (dev environment), Ruff (Python lint), ESLint (client lint)

## Features

- Email registration/login with server-side sessions
- Income & expense transactions (create, update, delete, filter, paginate)
- Categories per type (income/expense) with ownership isolation
- Monthly budgets per category with 75%/90% usage warnings
- Offline transaction queue with automatic retry when the connection returns
- Monthly recurring transaction reminders with manual confirmation
- Onboarding tour + Mochi mascot guide (personal finance agent)
- Dashboard monthly summary, CSV API export, and formatted PDF export
- Mobile-first UI with bottom navigation

## Prerequisites

- `mise` (manages Node.js 24, Python 3.13, PostgreSQL — see `mise.toml`)
- PostgreSQL running locally with databases `uangku` and `uangku_test`

## Setup

```sh
mise install
cp server/.env.example server/.env   # adjust if needed, never commit .env
createdb uangku
createdb uangku_test
cd server && uv run alembic upgrade head && cd ..
mise run dev
```

Client: http://localhost:3000
Server: http://localhost:8000
API docs: http://localhost:8000/docs
Health: http://localhost:8000/health

The client proxies `/api/*` to the server via Next.js rewrites
(`SERVER_URL`, see `client/next.config.ts`), so no CORS setup is needed.

## Commands

```sh
mise run dev     # client + server together
mise run test    # server pytest + client vitest
mise run lint    # server ruff + client eslint
mise run build   # client production build
mise run test:e2e  # Playwright E2E (butuh dev server running)
```

Direct equivalents:

```sh
cd server && uv run pytest && uv run ruff check .
cd client && npm test && npm run lint && npm run build
cd client && npx playwright test        # E2E
cd client && npx playwright install     # install browsers (first time)
```

## Environment variables

| Variable | Example | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql+psycopg://.../uangku` | dev database |
| `DATABASE_URL_TEST` | `postgresql+psycopg://.../uangku_test` | pytest database |
| `SECRET_KEY` | random string, min 32 chars | **required in production** (`APP_ENV=production` refuses default and enforces min 32 chars) |
| `HTTPS_ONLY` | `false` | must be `true` in production (enforced) or session cookies go over HTTP |
| `SERVER_URL` | `http://localhost:8000` | client env (`client/.env.local`, see `client/.env.example`), rewrite target (server-side only) |
| `APP_ENV` | `development` | set `production` in prod to enable guards |
| `TRUSTED_PROXY_IPS` | `10.0.0.1` | comma-separated IPs of trusted reverse proxies; enables `X-Forwarded-For` reading for rate limiting |

## Architecture

- `client/src/` — Next.js App Router (`app/`), reusable components (`components/`), API clients (`lib/`)
- `server/app/` — FastAPI app: `api/v1/` (HTTP layer), `services/` (business logic), `schemas/` (Pydantic validation), `models/` (SQLAlchemy), `core/` (config, deps, domain errors)
- `server/tests/` — pytest suite (API + service level, per-user isolation)
- `server/migrations/` — Alembic migrations
- `docs/` — architecture, ERD, product brief

Error contract: services raise typed `DomainError`s (`app/core/errors.py`);
the API layer maps them to a stable JSON shape: `{"error": {"code": ..., "message": ...}}`.
Authorization rule: every query is scoped to `current_user.id` — resource IDs
from the client are never trusted for ownership.

## Production notes

- Set `APP_ENV=production`, a strong `SECRET_KEY`, and `HTTPS_ONLY=true`.
- Set `TRUSTED_PROXY_IPS` to the IP(s) of your reverse proxy (e.g. Nginx/Cloudflare) so rate limiting correctly identifies individual clients behind the proxy. Without this, all users share the same rate-limit bucket.
- Run `alembic upgrade head` on deploy; never edit applied migrations.
  Wajib: tanpa ini, query transaksi/dashboard gagal total (mis. kolom
  `is_opening_balance` tidak ada di DB) dan semua halaman tampil
  "Gagal memuat data". Cek dengan `alembic current` — harus di head terbaru.
- Auth endpoints (`/api/v1/auth/register`, `/api/v1/auth/login`) are rate-limited
  in-app to 5 requests/minute per IP (SlowAPI); export to 30/minute and
  dashboard/transaction-list to 60/minute. Storage is in-memory per process —
  for multi-worker production, switch the limiter to Redis (see
  `server/app/core/rate_limit.py`). For defense in depth, also put
  login/register behind reverse-proxy rate limiting (e.g. nginx `limit_req`)
  in production.
- Session cookies are `httpOnly`, `SameSite=lax`, and expire with the browser
  session; logout clears the server-side session.
- Offline transactions are queued in browser storage when the API is unreachable
  and retried when the app opens online or the browser emits an `online` event.
  The queue is device-local and should be treated as pending until the banner
  disappears; the server remains the source of truth.
- Recurring reminders are device-local monthly templates. They never create a
  transaction automatically: the user must confirm each due reminder.
- See `docs/architecture.md` and `docs/erd.md` for deeper design docs.
