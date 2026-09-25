# Project Overview

- Purpose: Personal finance tracking app for managing income and expenses
- Stack: Next.js (client), FastAPI (server), PostgreSQL

# Development

- Package manager: `mise` (manages Node.js, Python, PostgreSQL)
- Install: `mise install`
- Dev: `mise run dev` (starts both client and server)
- Test: `mise run test` (runs both server pytest and client vitest); or directly: `cd server && uv run pytest` / `cd client && npm test`
- Lint: `mise run lint` (runs both ruff and eslint)
- Build: `mise run build` (Next.js standalone build)

# Architecture

- Client: `client/src/` (Next.js 16, React 19, TypeScript, Tailwind CSS)
- Server: `server/app/` (FastAPI, SQLAlchemy, PostgreSQL)
- Tests: `server/tests/` (pytest)
- Docs: `docs/` (architecture, ERD, product brief, maintenance runbook, DESIGN); archived in `docs/archive/`: api-contract, ux-flow, ui-wireframe, visual-direction
- Database and migrations: `server/migrations/` (Alembic)

# Coding Rules

- Follow the conventions already present in adjacent code.
- Prefer the smallest correct change; do not add abstractions without a concrete need.
- Do not add dependencies without explaining why existing code or dependencies are insufficient.

# Agent Rules

- Inspect the project and its existing commands before editing.
- Do not edit `.env`, expose secrets, or commit credentials.
- Do not push directly to `main` or run destructive Git commands.
- Do not change migrations without a clear requirement and impact review.
- Use Context7 or `source-driven-development` for libraries and APIs that may have changed.
- Consult relevant installed skills (`skill` tool) when planning, implementing, or reviewing code.

# Engineering Skills & Quality Standards

The following skills are installed in `~/.agents/skills/` and available via the `skill` tool:

## 1. Fullstack Architecture & Quality Gates
- **`source-driven-development`**: Ground library and API patterns (Next.js 16, React 19, FastAPI, SQLAlchemy) in official documentation rather than outdated memory.
- **`verification-before-completion`**: Enforce fresh evidence before claiming success. Run tests, linter, and build commands, and inspect outputs before any completion claim.
- **`code-simplification`**: Eliminate cognitive complexity, trim unnecessary abstractions, and prune dead code while preserving behavior.
- **`debugging-and-error-recovery`**: Systematic root-cause diagnosis, reproducible test cases, and graceful error boundary patterns.

## 2. Frontend Engineering (Client: Next.js 16, React 19, Tailwind CSS)
- **`react-best-practices`**: Vercel-maintained performance guidelines (eliminating async waterfalls, optimizing bundle size, server vs. client boundaries, and avoiding re-renders).
- **`frontend-ui-engineering`**: Production-grade state management, accessible component hierarchies, and resilient client-side error handling.
- **`frontend-design`** & **`tailwind-design-system`**: Distinctive, intentional visual design respecting `DESIGN.md` and anti-slop rules.

## 3. Backend & Database Engineering (Server: FastAPI, PostgreSQL, Alembic)
- **`api-and-interface-design`**: RESTful interface standards, unified error schemas, status codes, and backward-compatible contracts.
- **`security-and-hardening`**: OWASP defenses, input validation, SQL/ORM injection mitigation, session security, and secret isolation.
- **`deprecation-and-migration`**: Zero-downtime database migrations (expand-and-contract patterns) and structured schema evolutions for Alembic/Postgres.

## 4. Testing & Verification
- **`webapp-testing`**: End-to-end testing with Playwright and server lifecycle management for live browser-level verification.

# Coordinator Role (Pi → omp worker)

Pi is the coordinator. For any coding, file editing, implementation, or
multi-step technical task, spawn an omp worker instead of doing it yourself.

## When to spawn omp

- File write/edit tasks
- Multi-step technical investigation
- Client or server implementation
- Debugging, refactoring, testing

## When NOT to spawn omp

- Simple file reads or verification (read directly)
- Simple questions or clarifications (answer directly)
- Planning/architecture discussion only (answer directly)

## How to spawn omp

Use the bash tool to run:

```bash
/home/k14n/.local/bin/pi-spawn-omp.sh "<full task description with context and acceptance criteria>"
```

The script will:
1. Create a fresh omp terminal (model: kr/claude-sonnet-4.5)
2. Dispatch the task as a supervised Orca worker
3. Return the worker dispatch result JSON including the terminal handle

After spawning, DO NOT tell the user to watch a terminal handle. Instead:
1. Wait for the bash tool to return — it blocks until omp sends worker_done
2. Parse the result: look for `"type":"worker_done"` or `"type":"escalation"` in the events array
3. If worker_done: tell the user the task is complete and summarize what was done
4. If escalation or question: relay omp's message to the user and ask for input
5. If timeout or error: tell the user the worker failed and ask if they want to retry

Do NOT do the coding work yourself.

If `/home/k14n/.local/bin/pi-spawn-omp.sh` does not exist, run `pi-coord` first or wait a few seconds.

## Task description format

Write the spec as if briefing a senior engineer cold:
- What to do and where (file paths if known)
- Acceptance criteria
- What NOT to change
- Relevant context from the conversation

# Definition of Done

- The requested behavior is implemented and manually verified where relevant.
- Tests, lint, and build pass using the commands above.
- Apply `verification-before-completion` and review the final diff before finishing.

## Client Design

For any user-facing client work:

- Read `DESIGN.md` before implementation.
- Treat `DESIGN.md` as the visual source of truth.
- Mochi mascot spec lives in `DESIGN.md` §5 (moods, animation rules,
  placements); implementation in `client/src/components/brand/Mascot.tsx`.
- Respect `docs/archive/ux-flow.md`, `docs/archive/ui-wireframe.md`, and `docs/archive/visual-direction.md`.
- Project-specific product docs take precedence if they conflict.
- Do not introduce a new visual language without explicit approval.
- Render and review the result in a browser before considering UI work complete.
