# UangKu Client

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4.
Mobile-first PWA: bottom navigation, offline transaction queue, installable manifest.

## Development

```sh
npm install
cp .env.example .env.local   # optional, defaults to SERVER_URL=http://localhost:8000
npm run dev                  # http://localhost:3000
```

The client proxies `/api/*` to the FastAPI server via Next.js rewrites
(`SERVER_URL` in `next.config.ts`, server-side only — no CORS needed, no
`NEXT_PUBLIC_*` secrets). The `/api/*` middleware (`src/proxy.ts`) forwards
the browser's host (`X-Forwarded-Host`, for the server CSRF check) and the
outer client IP (`X-Forwarded-For`, for per-user rate limiting).

## Commands

```sh
npm test        # Vitest unit tests
npm run lint    # ESLint
npx tsc --noEmit
npm run build   # production build
npx playwright test        # E2E (needs client + server running)
npx playwright install     # browsers, first time only
```

## Structure

- `src/app/` — routes: landing `/`, auth (`/masuk`, `/daftar`), app (`/beranda`,
  `/riwayat`, `/anggaran`, `/pengaturan`, `/transaksi/...`)
- `src/components/` — `ui/` (Button, Input, Select, BottomNav, EmptyState),
  `brand/` (Mascot, SplashScreen, MochiGuide), `dashboard/`, `auth/`, `landing/`
- `src/lib/` — API clients (`api.ts`, `transactions.ts`, ...), `local-storage.ts`
  (device cache + offline queue, server is source of truth), `date.ts`, `format.ts`
- `src/context/AuthContext.tsx` — session state, login/register/logout
- `public/` — PWA manifest, icons, `sw.js`
- `e2e/` — Playwright specs (unique `e2e+*@example.com` users per run)

Visual source of truth: `DESIGN.md` (repo root). Mascot spec: `DESIGN.md` §5.
