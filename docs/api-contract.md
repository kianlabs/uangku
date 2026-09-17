# UangKu — API Contract v1

## Overview

Backend UangKu menggunakan REST API dengan prefix:

`/api/v1`

Semua response menggunakan JSON kecuali endpoint export CSV.

Backend adalah source of truth untuk:

- authentication
- authorization
- business rules
- financial calculations
- ownership data

## Base URL

Local development:

`http://localhost:8000/api/v1`

Production URL ditentukan saat deployment.

---

# Authentication

Authentication menggunakan secure HTTP-only cookie.

Frontend tidak perlu menyimpan access token di localStorage.

## Register

`POST /api/v1/auth/register`

Request:

```json
{
  "email": "user@example.com",
  "password": "strong-password"
}
```

Response:

`201 Created`

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "created_at": "2026-09-17T10:00:00Z"
  }
}
```

Behavior:

- email dinormalisasi
- email harus unique
- password di-hash
- default categories dibuat
- authentication session dapat langsung dibuat setelah register

Possible errors:

- `400` invalid request
- `409` email already registered
- `422` validation error

---

## Login

`POST /api/v1/auth/login`

Request:

```json
{
  "email": "user@example.com",
  "password": "strong-password"
}
```

Response:

`200 OK`

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

Server mengirim authentication cookie.

Possible errors:

- `401` invalid credentials
- `422` validation error

---

## Logout

`POST /api/v1/auth/logout`

Response:

`204 No Content`

Server menghapus atau menginvalidasi session/cookie.

---

## Current User

`GET /api/v1/auth/me`

Response:

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "created_at": "2026-09-17T10:00:00Z"
}
```

Possible errors:

- `401` unauthenticated

---

# Categories

Semua endpoint category membutuhkan authentication.

## List Categories

`GET /api/v1/categories`

Optional query:

```text
?type=expense
```

Response:

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Makanan",
      "type": "expense"
    }
  ]
}
```

---

## Create Category

`POST /api/v1/categories`

Request:

```json
{
  "name": "Internet",
  "type": "expense"
}
```

Response:

`201 Created`

```json
{
  "id": "uuid",
  "name": "Internet",
  "type": "expense",
  "created_at": "2026-09-17T10:00:00Z"
}
```

Possible errors:

- `409` duplicate category
- `422` validation error

---

## Update Category

`PATCH /api/v1/categories/{category_id}`

Request:

```json
{
  "name": "Internet & Data"
}
```

Response:

```json
{
  "id": "uuid",
  "name": "Internet & Data",
  "type": "expense",
  "updated_at": "2026-09-17T10:10:00Z"
}
```

User hanya boleh mengubah kategori miliknya.

---

## Delete Category

`DELETE /api/v1/categories/{category_id}`

Response:

`204 No Content`

Jika category masih digunakan transaction:

`409 Conflict`

```json
{
  "error": {
    "code": "CATEGORY_IN_USE",
    "message": "Category masih digunakan oleh transaksi."
  }
}
```

---

# Transactions

Semua endpoint transaction membutuhkan authentication.

## List Transactions

`GET /api/v1/transactions`

Optional query parameters:

```text
?page=1
&page_size=20
&type=expense
&category_id=<uuid>
&date_from=2026-09-01
&date_to=2026-09-30
```

Response:

```json
{
  "items": [
    {
      "id": "uuid",
      "type": "expense",
      "amount": "25000.00",
      "description": "Makan siang",
      "transaction_date": "2026-09-17",
      "category": {
        "id": "uuid",
        "name": "Makanan",
        "type": "expense"
      },
      "created_at": "2026-09-17T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total_items": 38,
    "total_pages": 2
  }
}
```

Money dikirim sebagai string decimal agar tidak kehilangan precision pada client.

Default sorting:

`transaction_date DESC, created_at DESC`

---

## Create Transaction

`POST /api/v1/transactions`

Request:

```json
{
  "type": "expense",
  "amount": "25000.00",
  "category_id": "uuid",
  "description": "Makan siang",
  "transaction_date": "2026-09-17"
}
```

Response:

`201 Created`

```json
{
  "id": "uuid",
  "type": "expense",
  "amount": "25000.00",
  "description": "Makan siang",
  "transaction_date": "2026-09-17",
  "category": {
    "id": "uuid",
    "name": "Makanan",
    "type": "expense"
  },
  "created_at": "2026-09-17T10:00:00Z"
}
```

Backend harus memvalidasi:

- amount > 0
- category milik current user
- category type sama dengan transaction type

---

## Get Transaction

`GET /api/v1/transactions/{transaction_id}`

Response:

```json
{
  "id": "uuid",
  "type": "expense",
  "amount": "25000.00",
  "description": "Makan siang",
  "transaction_date": "2026-09-17",
  "category": {
    "id": "uuid",
    "name": "Makanan",
    "type": "expense"
  }
}
```

User tidak boleh mengakses transaksi milik user lain.

Untuk resource yang bukan milik user, backend boleh merespons `404` agar tidak membocorkan keberadaan resource.

---

## Update Transaction

`PATCH /api/v1/transactions/{transaction_id}`

Semua field bersifat optional.

Request contoh:

```json
{
  "amount": "30000.00",
  "description": "Makan malam"
}
```

Response:

```json
{
  "id": "uuid",
  "type": "expense",
  "amount": "30000.00",
  "description": "Makan malam",
  "transaction_date": "2026-09-17",
  "updated_at": "2026-09-17T10:15:00Z"
}
```

Jika type atau category berubah, backend harus memvalidasi ulang compatibility keduanya.

---

## Delete Transaction

`DELETE /api/v1/transactions/{transaction_id}`

Response:

`204 No Content`

---

# Dashboard

## Dashboard Summary

`GET /api/v1/dashboard/summary`

Optional:

```text
?month=2026-09
```

Jika `month` tidak diberikan, gunakan bulan berjalan sesuai aturan timezone aplikasi.

Response:

```json
{
  "period": "2026-09",
  "balance": "2450000.00",
  "monthly_income": "4500000.00",
  "monthly_expense": "2050000.00",
  "transaction_count": 38,
  "expense_by_category": [
    {
      "category_id": "uuid",
      "category_name": "Makanan",
      "amount": "850000.00",
      "percentage": 41.46
    }
  ],
  "recent_transactions": [
    {
      "id": "uuid",
      "type": "expense",
      "amount": "25000.00",
      "description": "Makan siang",
      "transaction_date": "2026-09-17",
      "category_name": "Makanan"
    }
  ]
}
```

`balance` merupakan:

```text
total income seluruh waktu
-
total expense seluruh waktu
```

Sedangkan:

- `monthly_income`
- `monthly_expense`
- `transaction_count`
- `expense_by_category`

menggunakan periode yang diminta.

---

# Export

## Export Transactions CSV

`GET /api/v1/export/transactions.csv`

Optional filters sama dengan list transactions:

```text
?type=expense
&category_id=<uuid>
&date_from=2026-09-01
&date_to=2026-09-30
```

Response:

```text
Content-Type: text/csv
Content-Disposition: attachment; filename="uangku-transactions.csv"
```

Export hanya berisi transaksi current user.

---

# Error Format

Semua application error menggunakan format konsisten:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

Validation error dapat memiliki field tambahan:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request tidak valid.",
    "fields": {
      "amount": "Amount harus lebih dari 0."
    }
  }
}
```

Contoh code:

- `UNAUTHENTICATED`
- `INVALID*CREDENT*
