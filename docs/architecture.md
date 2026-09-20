# UangKu — Architecture v1

## Overview

UangKu v1 menggunakan arsitektur full-stack terpisah:

- Frontend: Next.js + TypeScript
- Backend: FastAPI + Python
- Database: PostgreSQL

Frontend dan backend berada dalam satu repository, tetapi dipisahkan sebagai dua aplikasi.

## Repository Structure

Struktur awal:

```text
uangku/
├── frontend/
├── backend/
├── docs/
├── AGENTS.md
├── mise.toml
└── README.md
```

Target detail:

```text
uangku/
├── frontend/
│   ├── app/
│   ├── components/
│   ├── features/
│   ├── lib/
│   ├── public/
│   └── tests/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── main.py
│   │
│   ├── migrations/
│   └── tests/
│
├── docs/
│   ├── product-brief.md
│   ├── erd.md
│   └── architecture.md
│
├── AGENTS.md
├── mise.toml
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
Next.js Frontend
 │
 │ HTTPS / JSON
 ▼
FastAPI Backend
 │
 ▼
PostgreSQL
```

Frontend tidak boleh mengakses database secara langsung.

Seluruh business logic dan authorization penting berada di backend.

## Frontend Responsibilities

Frontend bertanggung jawab atas:

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
- komunikasi dengan backend API

Frontend tidak boleh menjadi sumber kebenaran utama untuk:

- authorization
- ownership data
- perhitungan finansial penting
- validasi business rule utama

Validasi frontend digunakan untuk UX.

Backend tetap melakukan validasi ulang.

## Backend Responsibilities

FastAPI bertanggung jawab atas:

- authentication
- authorization
- user management
- transaction CRUD
- category CRUD
- dashboard aggregation
- business rules
- CSV export
- database access
- API validation
- security boundaries

Contoh business rule yang wajib divalidasi backend:

- user hanya mengakses data miliknya
- category milik user yang sama
- transaction type sama dengan category type
- amount lebih dari 0
- category yang sedang digunakan tidak boleh sembarang dihapus

## Database

Database menggunakan PostgreSQL.

ORM:

- SQLAlchemy 2.x

Migration:

- Alembic

Database connection dikelola backend.

Frontend tidak menyimpan credential PostgreSQL.

## Authentication Strategy

UangKu v1 menggunakan authentication berbasis session/token yang disimpan melalui secure HTTP-only cookie.

Target:

- cookie tidak dapat dibaca JavaScript
- `Secure` aktif pada production
- `SameSite` dikonfigurasi dengan tepat
- password disimpan dalam bentuk hash
- backend menentukan current user dari credential yang valid

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

Frontend berkomunikasi dengan FastAPI melalui REST API.

Prefix awal:

```text
/api/v1
```

Contoh resource:

```text
/api/v1/auth
/api/v1/transactions
/api/v1/categories
/api/v1/dashboard
/api/v1/export
/api/v1/budgets
/api/v1/user/preferences
```

API contract detail akan ditulis terpisah sebelum implementation.

## Dashboard Architecture

Dashboard tidak harus menghitung seluruh data di frontend.

Backend menyediakan summary yang sudah teragregasi.

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
- frontend lebih sederhana
- aplikasi native masa depan dapat menggunakan endpoint yang sama

## Money Handling

Nilai uang tidak menggunakan floating-point untuk perhitungan backend/database.

Database:

```text
NUMERIC / DECIMAL
```

Backend:

```text
Decimal
```

API dapat mengirim nilai dalam representasi yang tidak menyebabkan precision loss.

## PWA Architecture

Frontend dirancang mobile-first dan dapat dikembangkan menjadi installable PWA.

PWA responsibilities:

- web app manifest
- installability
- icons
- responsive mobile UI

Offline-first transaction syncing belum menjadi requirement v1.

Jangan membuat kompleksitas offline sync sebelum dibutuhkan.

## State Management

Jangan menambah global state library secara otomatis.

Prefer terlebih dahulu:

- React state
- server data/query abstraction yang ringan
- URL state untuk filter jika cocok

Tambahkan state library hanya jika kompleksitas aplikasi benar-benar membutuhkan.

## Error Handling

Backend harus menggunakan error response konsisten.

Frontend harus membedakan:

- validation error
- authentication error
- authorization error
- resource not found
- server error
- network error

User tidak boleh menerima raw stack trace.

## Testing Layers

### Backend

Pytest untuk:

- business rules
- authentication
- authorization
- transaction service
- category service
- dashboard calculations
- API endpoint utama

### Frontend

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

Frontend dan backend dapat di-deploy terpisah.

Concept:

```text
Frontend
→ Vercel

Backend
→ Railway / Render / VPS

Database
→ Managed PostgreSQL
```

Provider final belum harus dipilih pada tahap architecture.

Environment dibedakan:

- local
- test
- production

Secrets hanya melalui environment variables.

Tidak boleh commit:

- database URL production
- auth secrets
- API keys
- credentials

## Local Development

Target workflow:

```text
tmux
├── frontend
├── backend
├── tests
└── Hermes
```

Runtime dikelola melalui:

- mise
- uv untuk backend Python
- package manager frontend sesuai lockfile project

Target command nantinya:

```text
mise run dev
mise run test
mise run lint
mise run build
```

## Architecture Principles

1. Keep the MVP simple.
2. Backend adalah source of truth untuk business rules.
3. Frontend fokus pada UX.
4. Jangan menambah abstraction sebelum dibutuhkan.
5. Jangan menambah dependency hanya karena populer.
6. Semua resource user harus melalui authorization check.
7. API harus reusable untuk future native mobile client.
8. Jangan memasukkan fitur v2 ke architecture v1 tanpa kebutuhan nyata.

## Future Compatibility

Architecture ini memungkinkan penambahan client native tanpa mengganti backend utama:

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
