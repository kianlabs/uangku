# UangKu

Personal finance tracking app for managing income and expenses.

## Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Backend**: FastAPI, SQLAlchemy, PostgreSQL
- **Tooling**: mise (dev environment), Alembic (migrations)

## Setup

```sh
mise install
mise run dev
```

Frontend: http://localhost:3000  
Backend: http://localhost:8000  
API docs: http://localhost:8000/docs

## Development

```sh
mise run test   # Run backend tests
mise run lint   # Run linters
mise run build  # Build frontend
```

## Architecture

- `frontend/src/` — Next.js app
- `backend/app/` — FastAPI app
- `backend/tests/` — pytest suite
- `backend/migrations/` — Alembic migrations
- `docs/` — architecture, ERD, product brief
