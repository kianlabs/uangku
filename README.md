# UangKu — Personal Finance Tracker with AI Receipt Scanning

[![CI](https://github.com/kianlabs/uangku/actions/workflows/ci.yml/badge.svg)](https://github.com/kianlabs/uangku/actions/workflows/ci.yml)
[![Live Demo](https://img.shields.io/badge/Live_Demo-uangku--web.my.id-024691?logo=vercel&logoColor=white)](https://uangku-web.my.id)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-20232A?logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript 5](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.141-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL 16](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docker.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

A mobile-first personal finance tracker for individuals who want daily income/expense tracking, category budgets, and AI receipt scanning — live in production with Google sign-in, automated CI/CD, and PDF/CSV export.

🌐 **Live demo:** [https://uangku-web.my.id](https://uangku-web.my.id)

---

## Screenshots

| Landing Page | Google OAuth & Session Login |
|:---:|:---:|
| <img src="docs/screenshots/01-landing.png" width="400" alt="UangKu landing page"/> | <img src="docs/screenshots/02-login.png" width="400" alt="UangKu login page with Google sign-in"/> |

| Dashboard & Metrics | Monthly Budget Engine |
|:---:|:---:|
| <img src="docs/screenshots/03-dashboard.png" width="400" alt="UangKu dashboard with balance summary"/> | <img src="docs/screenshots/04-budget.png" width="400" alt="UangKu monthly budget page"/> |

---

## Features

- 🧾 **AI Receipt Scanner (Vision OCR)**: Capture receipts with a smartphone camera or file upload (`POST /api/v1/transactions/scan-receipt`). Vision LLM / OCR parsing extracts the merchant name, transaction date, total amount, and predicts the expense category, with instant form pre-filling in both `QuickAddModal` and the Add Transaction page.
- 🤖 **Mochi Mascot Guide & Monthly Wrap-Up**: Interactive personal finance agent offering retrospective monthly summaries, savings ratio tracking, top spending categories, and AI-driven budget adherence insights.
- 🎯 **Indicator Spotlight Tour**: Guided onboarding spotlighting essential metrics — Safe-to-Spend calculations, overall balance vs. safe cushion, category budget pacing, and daily recording streaks.
- 📊 **Dynamic Budgeting Engine**: Real-time budget tracking with 75% and 90% threshold warning notifications, 400ms debounced autosave, zero-flicker UI, and strict chronological month navigation.
- 🔄 **Idempotent Recurring Reminders**: Server-side monthly transaction templates synchronized across devices, requiring explicit user confirmation before recording to prevent accidental duplicate entries.
- 🔐 **Enterprise Auth & Security**: Secure server-side sessions (`httpOnly`, `SameSite=lax`, 7-day TTL, Argon2id hashing) alongside Google OAuth 2.0 with automatic account linking and strict user-scoped row-level queries.
- 📄 **Export & Offline-Resilient PWA**: Formatted monthly PDF financial statements (2,000-row cap) and raw CSV export; installable as a mobile-first Progressive Web App.

---

## System Architecture

```mermaid
flowchart TD
    subgraph ClientLayer["Frontend Client (Next.js 16 App Router)"]
        UI["Web / Mobile PWA (React 19 + Tailwind 4)"]
        Scanner["AI Receipt Scanner (Camera / Upload UI)"]
        Dashboard["Financial Dashboard & Mochi Guide"]
        Proxy["Next.js API Rewrites (/api/*)"]
    end

    subgraph ServerLayer["Backend API (FastAPI & Python 3.13)"]
        Auth["Session Auth & Google OAuth 2.0"]
        TxService["Transaction & Budget Engine"]
        VisionService["Vision OCR / Receipt Extraction Engine"]
        ExportService["PDF & CSV Export Engine"]
        ReminderService["Recurring Monthly Reminders"]
    end

    subgraph DataLayer["Persistence & External Services"]
        DB[("PostgreSQL 16 Database")]
        GoogleAuth["Google Cloud Identity (OAuth 2.0)"]
        VisionAI["Gemini / Vision LLM Gateway"]
    end

    UI --> Proxy
    Scanner --> Proxy
    Dashboard --> Proxy
    Proxy -->|Reverse Proxy / HTTP| ServerLayer

    Auth -->|OAuth 2.0 Verification| GoogleAuth
    Auth -->|User & Session Data| DB
    TxService -->|ACID Transactions| DB
    ReminderService -->|Sync Reminders| DB
    VisionService -->|Multipart Image / Prompt| VisionAI
    VisionAI -->|Parsed JSON: Merchant, Date, Amount| VisionService
```

### Architectural Principles
- **Strict User Scoping**: All database queries are explicitly filtered by `current_user.id`. Client-supplied resource IDs are never trusted for ownership.
- **Typed Error Envelope**: The service layer raises domain exceptions (`DomainError`), mapped by FastAPI exception handlers into a consistent contract:
  ```json
  {
    "error": {
      "code": "INSUFFICIENT_FUNDS",
      "message": "Saldo tidak mencukupi untuk transaksi ini"
    }
  }
  ```
- **Single Source of Truth**: Mutations are online-only; network failures prompt retryable alerts rather than desynchronizing local optimistic state.

---

## Tech Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend Framework** | [Next.js 16](https://nextjs.org/) | App Router, Server Components, Route Rewrites |
| **UI Library** | [React 19](https://react.dev/) | React Server Components, Suspense, Hooks |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) | Modern CSS tokens, dark/light responsive layout |
| **Backend Framework** | [FastAPI 0.141](https://fastapi.tiangolo.com/) | Asynchronous Python REST API, ASGI |
| **Runtime & Language** | Python 3.13 & Node.js 24 | Managed via [mise](https://mise.jdx.dev/) |
| **Database & ORM** | [PostgreSQL 16](https://www.postgresql.org/) + [SQLAlchemy 2](https://www.sqlalchemy.org/) | Relational database, Async Alembic migrations |
| **Data Validation** | [Pydantic v2](https://docs.pydantic.dev/) | Strict boundary and request/response typing |
| **Authentication** | Argon2 + Google OAuth 2.0 | Signed `httpOnly` cookies, Google Identity Provider |
| **Testing** | pytest, Vitest, Playwright | 320+ backend unit tests, 175+ frontend tests, E2E |
| **Infrastructure** | Vercel + Render | Custom domain SSL, Dockerized container deployment |

---

## Quickstart

### Option A: Docker Compose (Fastest)

Launch the entire stack (PostgreSQL 16, FastAPI backend, and Next.js frontend) in a single command:

```bash
# Clone the repository
git clone https://github.com/kianlabs/uangku.git
cd uangku

# Setup environment
cp .env.example .env

# Spin up services
docker compose up -d --build
```
- **Client (Web & PWA):** [http://localhost:3000](http://localhost:3000)
- **FastAPI API Server:** [http://localhost:8000](http://localhost:8000)
- **Interactive Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Option B: Local Development via mise

#### 1. Prerequisites
- [mise-en-place](https://mise.jdx.dev/) (automatically provisions Python 3.13, Node.js 24, and tools)
- Local PostgreSQL 16 server running on default port `5432`

#### 2. Installation & Database Setup

```bash
# Install runtimes via mise
mise install

# Setup environment files
cp server/.env.example server/.env
cp client/.env.example client/.env.local

# Create local PostgreSQL databases
createdb uangku
createdb uangku_test

# Run database schema migrations
cd server
uv run alembic upgrade head
cd ..
```

#### 3. Run Development Servers

```bash
# Start both Next.js frontend and FastAPI backend concurrently
mise run dev
```

The application is now accessible at:
- **Client (Web & PWA):** [http://localhost:3000](http://localhost:3000)
- **FastAPI API Server:** [http://localhost:8000](http://localhost:8000)
- **Interactive Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **API Health Check:** [http://localhost:8000/health](http://localhost:8000/health)

*(The frontend automatically proxies `/api/*` requests to port `8000` via Next.js rewrites, eliminating CORS setup in local development).*

---

## Testing

```bash
# Run both backend pytest and frontend vitest suites
mise run test

# Run code formatters and linters (Ruff + ESLint)
mise run lint

# Run End-to-End Playwright test suite (dev server must be running)
mise run test:e2e

# Execute production client build
mise run build
```

Individual service commands:
```bash
# Backend pytest & linter
cd server && uv run pytest && uv run ruff check .

# Frontend vitest, linter, & build
cd client && npm test && npm run lint && npm run build
```

---

## Environment Configuration

| Variable | Scope | Example | Description |
|---|---|---|---|
| `DATABASE_URL` | Server | `postgresql+psycopg://...` | Primary database connection string |
| `DATABASE_URL_TEST` | Server | `postgresql+psycopg://...` | Isolated test database |
| `SECRET_KEY` | Server | `random_string_min_32_characters` | Required session signing secret |
| `HTTPS_ONLY` | Server | `false` (dev) / `true` (prod) | Enforces SSL flags on session cookies |
| `SERVER_URL` | Client | `http://localhost:8000` | Target URL for Next.js server-side API proxying |
| `APP_ENV` | Server | `development` / `production` | Enforces production security guards |
| `TRUSTED_PROXY_IPS` | Server | `10.0.0.1` | Reverse proxy IP whitelist for accurate rate limiting |
| `GOOGLE_CLIENT_ID` | Server | `...apps.googleusercontent.com` | Google Cloud Console OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | Server | `GOCSPX-...` | Google Cloud Console OAuth 2.0 Secret |
| `GEMINI_API_KEY` | Server | `AIzaSy...` | API key for AI Receipt Scanner vision extraction |

---

## Production Deployment

```
Internet Users (Desktop Browser / Mobile PWA)
      │
      │ HTTPS (TLS 1.3)
      ▼
uangku-web.my.id ───► Vercel Edge Network (Next.js 16)
      │
      │ /api/* Rewrites (Secure HTTPS)
      ▼
Render Managed Containers (FastAPI ASGI Service)
      │
      │ PostgreSQL SSL Connection (?sslmode=require)
      ▼
Managed PostgreSQL Production Cluster
```

- **Frontend**: Hosted on Vercel (`client` root directory). Production branch: `master`. Custom apex domain `uangku-web.my.id` with automatic 308 canonical redirects from `www` and Vercel preview domains.
- **Backend**: Hosted on Render (`server/Dockerfile`). Production branch: `master`. `entrypoint.sh` automatically runs database migrations (`alembic upgrade head`) before booting Gunicorn/Uvicorn workers.
- **Rate Limiting**: Built-in SlowAPI rate limiting protects sensitive routes (`/api/v1/auth/*` limited to 5 requests/minute per IP; export limited to 30 requests/minute).

---

## What I Learned

- **Owning the full stack end to end.** Frontend (Next.js), backend (FastAPI), database (PostgreSQL), and deployment (Vercel + Render) in one repo taught me how a production request actually travels — and where each layer can fail.
- **Auth is a security boundary, not a login form.** `httpOnly` cookies, Argon2id hashing, Google OAuth with account linking, and strict user-scoped queries: every one of those exists because the alternative is a data leak.
- **Idempotency is a product feature.** Recurring reminders require explicit user confirmation before recording, because a duplicated transaction is worse than a missing one.
- **AI features need a human in the loop.** The receipt scanner extracts merchant, date, amount, and category — but the user confirms the pre-filled form before anything is saved. The model assists; it never commits.
- **Tests across the stack pay off.** 320+ backend tests, 175+ frontend tests, and Playwright E2E caught regressions that no single layer's tests would have found.

---

## License

This project is licensed under the [MIT License](./LICENSE) © 2026 Ridzkyan Buti Pratama (Kyan).
