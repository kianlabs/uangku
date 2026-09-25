# UangKu — Architecture v1

## Overview

UangKu v1 menggunakan arsitektur full-stack terpisah:

- Client: Next.js + TypeScript
- Server: FastAPI + Python
- Database: PostgreSQL

Client dan server berada dalam satu repository, tetapi dipisahkan sebagai dua aplikasi.

## Repository Structure

Struktur awal:

```text
uangku/
├── client/
├── server/
├── docs/
├── AGENTS.md
├── mise.toml
└── README.md
```

Target detail:

```text
uangku/
├── client/            # Next.js (src/app, src/components, src/lib, ...)
├── server/            # FastAPI (app/, migrations/, tests/)
├── docs/              # architecture, erd, product-brief, maintenance
├── AGENTS.md
├── DESIGN.md
├── mise.toml
├── vercel.json        # build dari Root Directory=client (tanpa prefix cd)
└── README.md
```

Folder final boleh sedikit berubah saat implementation jika ada alasan teknis yang jelas.

## High-Level Architecture

```text
User
 │
 ▼
Mobile Browser / PWA
 │
 ▼
Next.js Client
 │
 │ HTTPS / JSON
 ▼
FastAPI Server
 │
 ▼
PostgreSQL
```

Client tidak boleh mengakses database secara langsung.

Seluruh business logic dan authorization penting berada di server.

## Client Responsibilities

Client bertanggung jawab atas:

- mobile-first UI
- navigation
- form handling
- client-side validation dasar
- menampilkan dashboard
- visualisasi transaksi
- maskot & panduan Mochi (agen interaktif: splash, tur onboarding,
  empty state, tips kontekstual — komponen di `components/brand/`
  dan `components/onboarding/`, lihat DESIGN.md §5)
- PWA behavior
- loading/error state
- komunikasi dengan server API

Client tidak boleh menjadi sumber kebenaran utama untuk:

- authorization
- ownership data
- perhitungan finansial penting
- validasi business rule utama

Validasi client digunakan untuk UX.

Server tetap melakukan validasi ulang.

## Server Responsibilities

FastAPI bertanggung jawab atas:

- authentication
- authorization
- user management
- transaction CRUD
- category CRUD
- dashboard aggregation
- business rules
- CSV export API and client-generated PDF export
- database access
- API validation
- security boundaries

Contoh business rule yang wajib divalidasi server:

- user hanya mengakses data miliknya
- category milik user yang sama
- transaction type sama dengan category type
- amount lebih dari 0
- transaction_date maksimal besok (toleransi gaji) dan tahun >= 2000
- category yang sedang digunakan tidak boleh sembarang dihapus: hapus
  ditolak 409 (`CATEGORY_IN_USE`) kecuali via transfer atomik
  (`POST /api/v1/categories/{id}/transfer` memindahkan transaksi + budget
  + pengingat lalu menghapus kategori asal dalam satu commit); kategori
  terakhir per tipe tidak boleh dihapus (409 `CATEGORY_IS_LAST`)
- recurring: type cocok dengan kategori; confirm idempotent per bulan
  (409 `ALREADY_CONFIRMED`), template nonaktif ditolak (409)
- hapus budget hanya lewat aksi eksplisit (bukan input dikosongkan)
- `GET /budgets` mengirim `earliest_created_at` (created_at anggaran
  tertua); klien memakainya sebagai batas bawah navigasi bulan — bulan
  sebelum anggaran pertama dibuat tidak dapat diakses karena anggaran
  berlaku lintas bulan sehingga bulan itu tidak punya makna

## Database

Database menggunakan PostgreSQL.

ORM:

- SQLAlchemy 2.x

Migration:

- Alembic

Database connection dikelola server.

Client tidak menyimpan credential PostgreSQL.

## Authentication Strategy

UangKu v1 menggunakan authentication berbasis session/token yang disimpan melalui secure HTTP-only cookie.

Target:

- cookie tidak dapat dibaca JavaScript
- `Secure` aktif pada production
- `SameSite` dikonfigurasi dengan tepat
- sesi kedaluwarsa 7 hari: cookie `Max-Age=604800` + batas absolut `issued_at`
  yang dicek server-side (cookie bisa refresh, cap absolut tidak)
- password disimpan dalam bentuk hash (Argon2); akun Google-only punya
  `password_hash = NULL` dan login password ditolak untuknya
- server menentukan current user dari credential yang valid
- login Google (OAuth 2.0 Authorization Code Flow): `GET /auth/google/login`
  menyimpan `state` CSRF + `redirect_uri` di session lalu redirect ke Google;
  `GET /auth/google/callback` verifikasi state, tukar code, ambil profil,
  lalu find-or-create user by `google_id` (auto-link ke akun email yang sama,
  user baru dibuat + seed kategori default). `redirect_uri` diturunkan dari
  `X-Forwarded-Host` (lihat `src/proxy.ts`) atau override
  `GOOGLE_REDIRECT_URI`; persis 1 nilai ini yang didaftarkan di Google Cloud
- tombol Google ada di form masuk & daftar; keduanya auto-registrasi akun baru

Hindari menyimpan long-lived authentication token di `localStorage`.

Implementasi final dapat menggunakan access token/session mechanism yang sesuai, tetapi security property di atas harus dipertahankan.

## Authentication Flow

```text
Register
   │
   ▼
FastAPI
   │
   ├── validate email/password
   ├── hash password
   ├── create user
   └── create default categories

Login
   │
   ▼
FastAPI
   │
   ├── verify credentials
   └── issue authenticated session/cookie

Login (Google OAuth 2.0)
   │
   ▼ Next.js rewrite /api/* (proxy.ts teruskan X-Forwarded-Host)
FastAPI /auth/google/login
   │
   ├── simpan state + redirect_uri di session
   └── 302 ke accounts.google.com ──► user setuju/batal
           │
           ▼ callback ?code&state (atau ?error)
FastAPI /auth/google/callback
   │
   ├── verifikasi state (gagal → /masuk?error=google_csrf_failed)
   ├── tukar code → access token → profil (sub, email)
   ├── find-or-create by google_id (link email lama / buat baru)
   └── session login → 302 /beranda

Authenticated Request
   │
   ▼
FastAPI
   │
   ├── identify current user
   ├── authorize resource
   └── return user's data
```

## API Boundary

Client berkomunikasi dengan FastAPI melalui REST API.

Prefix awal:

```text
/api/v1
```

Contoh resource:

```text
/api/v1/auth
/api/v1/transactions
/api/v1/categories
/api/v1/categories/{id}/transfer
/api/v1/recurring
/api/v1/dashboard
/api/v1/export
/api/v1/budgets
/api/v1/user/preferences
```

API contract detail akan ditulis terpisah sebelum implementation.

## Dashboard Architecture

Dashboard tidak harus menghitung seluruh data di client.

Server menyediakan summary yang sudah teragregasi.

Contoh response concept:

```json
{
  "balance": 2450000,
  "monthly_income": 4500000,
  "monthly_expense": 2050000,
  "transaction_count": 38,
  "expense_by_category": [],
  "recent_transactions": []
}
```

Hal ini menjaga:

- business logic konsisten
- client lebih sederhana
- aplikasi native masa depan dapat menggunakan endpoint yang sama

## Money Handling

Nilai uang tidak menggunakan floating-point untuk perhitungan server/database.

Database:

```text
NUMERIC / DECIMAL
```

Server:

```text
Decimal
```

API dapat mengirim nilai dalam representasi yang tidak menyebabkan precision loss.

## PWA Architecture

Client dirancang mobile-first dan dapat dikembangkan menjadi installable PWA.

PWA responsibilities:

- web app manifest
- installability
- icons
- responsive mobile UI

The app is online-only (decision 2026-09-22, offline queue removed): network
failures surface as regular API errors with a clear retryable message —
nothing is queued or replayed on the device. The server remains the single
source of truth for all transaction data.

Recurring transaction reminders live on the server (`recurring_templates`).
They require explicit user confirmation before creating a server transaction
(one per month, idempotent) and do not require a background scheduler.

## State Management

Jangan menambah global state library secara otomatis.

Prefer terlebih dahulu:

- React state
- server data/query abstraction yang ringan
- URL state untuk filter jika cocok

Tambahkan state library hanya jika kompleksitas aplikasi benar-benar membutuhkan.

## Error Handling

Server harus menggunakan error response konsisten.

Client harus membedakan:

- validation error
- authentication error
- authorization error
- resource not found
- server error
- network error

User tidak boleh menerima raw stack trace.

Envelope: `{"error": {"code": ..., "message": ...}}` (plus `fields` untuk 422).
Error tak terduga menjadi 500 `INTERNAL_ERROR`, error database menjadi 503
`SERVICE_UNAVAILABLE` — traceback hanya masuk log server.

## Testing Layers

### Server

Pytest untuk:

- business rules
- authentication
- authorization
- transaction service
- category service
- dashboard calculations
- API endpoint utama

### Client

Test fokus pada behavior penting.

Tidak perlu mengejar test coverage tinggi tanpa manfaat.

### End-to-End

Playwright untuk flow utama:

```text
register/login
→ tambah expense
→ dashboard update
→ edit transaction
→ filter transaction
→ delete transaction
```

## Deployment Boundary

Client dan server di-deploy terpisah dan terhubung via HTTPS publik.

Arsitektur produksi saat ini (2026-09: Vercel + Render):

```text
Pengguna (Browser / Mobile PWA)
      │ HTTPS
      ▼
uangku-web.my.id (DNS: Idwebhost → Vercel)
      │
      ▼
[Vercel] Client (Next.js, Root Directory=client)
      │
      ├── UI Rendering & Assets
      └── Rewrites (/api/*, SERVER_URL) ──► [Render] Server (FastAPI Docker)
                                                │ SSL (?sslmode=require)
                                                ▼
                                           PostgreSQL produksi
```

1. **Client (Vercel):** project `uangku`, Root Directory `client`, framework
   Next.js auto-detect. `vercel.json` di repo root HANYA berisi default tanpa
   prefix `cd client` (build sudah berjalan di dalam `client/`; prefix
   `cd client && ...` membuat build ERROR `ENOENT` — insiden 2026-09-25).
   Auto-deploy dari branch `master`. Custom domain via Vercel Domains
   (apex = Production, www/vercel.app redirect 308 ke apex).
2. **Server (Render):** service Docker dari `server/Dockerfile`
   (`uv sync --frozen`, entrypoint `entrypoint.sh`). `entrypoint.sh`
   menjalankan `alembic upgrade head` otomatis tiap deploy
   (`RUN_MIGRATIONS=true`). Auto-deploy dari branch `master`.
3. **Rantai proxy & header:** browser → Vercel rewrite → backend.
   `client/src/proxy.ts` meneruskan host asli (`X-Forwarded-Host`, dipakai
   server untuk validasi CSRF origin + `redirect_uri` Google) dan IP luar
   (`X-Forwarded-For`, dipakai rate-limit). Guard UX di proxy (halaman
   proteksi ↔ auth) berdasarkan keberadaan cookie `session`; validitas
   tetap otoritatif di `GET /api/v1/auth/me`.

Alternatif Deployment (tidak aktif saat ini):
- **Fly.io (Region SIN) + Neon PostgreSQL:** `fly.server.toml` + Dockerfile
  sudah siap; butuh billing + `DATABASE_URL` Neon. Tanpa-tidur (~$2/bln).
- **VPS + Docker Compose:** single-host hemat dengan reverse proxy + SSL otomatis.

Environment dibedakan:
- local
- test
- production

Secrets hanya melalui environment variables (Fly Secrets / `.env.production`).

Tidak boleh commit:
- database URL production
- auth secrets (`SECRET_KEY`)
- API keys
- credentials

## Local Development

Target workflow:

```text
tmux
├── client
├── server
├── tests
└── Hermes
```

Runtime dikelola melalui:

- mise
- uv untuk server Python
- package manager client sesuai lockfile project

Target command nantinya:

```text
mise run dev
mise run test
mise run lint
mise run build
```

## Architecture Principles

1. Keep the MVP simple.
2. Server adalah source of truth untuk business rules.
3. Client fokus pada UX.
4. Jangan menambah abstraction sebelum dibutuhkan.
5. Jangan menambah dependency hanya karena populer.
6. Semua resource user harus melalui authorization check.
7. API harus reusable untuk future native mobile client.
8. Jangan memasukkan fitur v2 ke architecture v1 tanpa kebutuhan nyata.

## Future Compatibility

Architecture ini memungkinkan penambahan client native tanpa mengganti server utama:

```text
PWA
  │
  ├──────────┐
  ▼          ▼
FastAPI    Future React Native App
  │          │
  └────┬─────┘
       ▼
   PostgreSQL
```

Future mobile application harus menggunakan API yang sama, bukan mengakses database langsung.
