# Project Overview

- Purpose: Describe the user-facing goal of this project.
- Stack: List the primary languages, frameworks, and data stores.

# Development

- Package manager: `<npm | pnpm | bun | uv | other>`
- Install: `<command>`
- Dev: `<command>`
- Test: `<command>`
- Lint: `<command>`
- Build: `<command>`

# Architecture

- Frontend: `<path or none>`
- Backend: `<path or none>`
- Tests: `<path>`
- Docs: `<path>`
- Database and migrations: `<path or none>`

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

# Specialist Delegation (Hermes-native lane)

Main session remains the orchestrator. Specialist work runs as Hermes-native
children through `omh_delegate_route` + `delegate_task`.

Always resolve the current category head from OMH routing.
Do not duplicate or override model-chain configuration in this file.

Task → category:

- planning / architecture → `architect`
- deep reasoning / hard investigation → `deep`
- normal backend/general implementation → `capable`
- frontend implementation → `visual-engineering`
- visual exploration / UI direction → `artistry`
- tiny lookup / trivial analysis / very small task → `quick`
- small scoped implementation / maintenance → `simple-work`

Mandatory lifecycle per lane:

`status` → `set category` → `delegate_task` → verify result →
`fallback` + re-dispatch on model rejection/error-without-usage →
`clear` → `status`

Rules:

- One lane, one category.
- `clear` is mandatory after every lane, success or failure.
- Never assume a child succeeded only because delegation reports completed; verify the result.
- If a child returns a model/provider error without usage, use the category fallback and re-dispatch.
- Keep delegated scopes narrow and give explicit acceptance criteria and verification steps.
- Do not change model chains, providers, or the main session model from project instructions.

# Definition of Done

- The requested behavior is implemented and manually verified where relevant.
- Tests, lint, and build pass using the commands above.
- Apply `verification-before-completion` and review the final diff before finishing.

## Frontend Design

For any user-facing frontend work:

- Read `DESIGN.md` before implementation.
- Treat `DESIGN.md` as the visual source of truth.
- Respect `docs/ux-flow.md`, `docs/ui-wireframe.md`, and `docs/visual-direction.md`.
- Project-specific product docs take precedence if they conflict.
- Do not introduce a new visual language without explicit approval.
- Render and review the result in a browser before considering UI work complete.
