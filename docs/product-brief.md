# UangKu

## Overview

UangKu adalah aplikasi personal expense tracker yang membantu pengguna mencatat pemasukan dan pengeluaran serta memahami kondisi keuangan bulanan mereka.

UangKu v1 dibangun sebagai **mobile-first Progressive Web App (PWA)**.

Prioritas utama adalah pengalaman penggunaan melalui smartphone. Desktop tetap didukung, tetapi bukan fokus utama desain.

## Product Type

- Public product
- Portfolio project
- Mobile-first web application
- Installable PWA

## Problem

Banyak orang masih mencatat pengeluaran menggunakan Notes, chat pribadi, spreadsheet, atau bahkan tidak mencatat sama sekali.

Masalah utamanya:

- sulit mengetahui total pengeluaran bulanan
- transaksi mudah terlupakan
- tidak tahu kategori pengeluaran terbesar
- pencatatan manual terasa ribet
- aplikasi finansial yang ada sering terlalu kompleks

## Target Users

Target awal:

- mahasiswa
- pekerja muda
- freelancer
- pengguna yang baru mulai mengatur keuangan pribadi
- pengguna yang ingin expense tracker sederhana

## Product Goal

Pengguna harus dapat mencatat transaksi baru dalam beberapa detik dari smartphone.

UangKu harus terasa:

- cepat
- sederhana
- ringan
- mudah dipahami
- nyaman digunakan dengan satu tangan
- tidak penuh fitur yang tidak diperlukan

## Platform Strategy

### UangKu v1

Mobile-first PWA.

Pengguna dapat:

- membuka UangKu melalui link
- menggunakan aplikasi dari browser
- menambahkan UangKu ke Home Screen jika browser mendukung
- menggunakan layout yang dirancang khusus untuk layar smartphone

### Future

Jika produk memiliki pengguna aktif dan kebutuhan native muncul, aplikasi React Native/Expo dapat dibuat menggunakan backend API yang sama.

## MVP Features

### Authentication

- Register
- Login
- Logout
- User session
- Password hashing
- Data user terisolasi

### Dashboard

Menampilkan:

- current balance
- total income bulan ini
- total expense bulan ini
- jumlah transaksi
- spending breakdown
- transaksi terbaru

### Transactions

Pengguna dapat:

- tambah transaksi
- lihat transaksi
- edit transaksi
- hapus transaksi

Data:

- income / expense
- amount
- category
- description
- transaction date

### Categories

Default expense categories:

- Makanan
- Transportasi
- Belanja
- Hiburan
- Tagihan
- Kesehatan
- Pendidikan
- Lainnya

Default income categories:

- Gaji
- Freelance
- Bonus
- Penjualan
- Lainnya

User juga dapat membuat kategori sendiri.

### Transaction Filtering

Filter berdasarkan:

- bulan
- tanggal
- income / expense
- kategori

### Export

- CSV export

## Mobile UX

Navigasi utama menggunakan bottom navigation.

Rancangan awal:

- Home
- Transactions
- Profile

Tambah transaksi harus sangat mudah diakses melalui tombol utama atau floating action button.

Input amount menjadi fokus utama saat membuat transaksi.

Dashboard tidak boleh dipenuhi banyak card kecil.

Data finansial utama harus memiliki visual hierarchy yang jelas.

## Responsive Strategy

Prioritas breakpoint:

1. Smartphone
2. Tablet
3. Desktop

Desain dimulai dari ukuran sekitar 375–390px.

Desktop merupakan enhancement dari mobile UI, bukan sebaliknya.

## Design Direction

Visual:

- clean
- financial-oriented
- typography kuat
- angka menjadi visual hierarchy utama
- whitespace cukup
- chart sederhana
- interaction jelas

Hindari:

- generic SaaS dashboard
- desktop sidebar sebagai navigasi utama
- nested cards berlebihan
- gradient tanpa alasan
- glassmorphism
- decorative blobs
- animasi berlebihan

Income dan expense tidak boleh dibedakan hanya menggunakan warna.

Gunakan icon, label, dan sign positif/negatif jika diperlukan.

## Technology Direction

Frontend:

- Next.js
- TypeScript
- Tailwind CSS
- PWA support

Backend:

- FastAPI
- Python

Database:

- PostgreSQL

Backend tetap berupa API terpisah agar di masa depan dapat digunakan oleh:

- PWA
- mobile native app
- integration lain

## Not Included in v1

Belum dibuat:

- bank integration
- e-wallet integration
- OCR receipt
- AI financial advisor
- investment tracking
- cryptocurrency
- recurring transactions
- complex budgeting
- financial goals
- family/shared account
- subscription/payment

## Definition of Done

UangKu v1 selesai ketika:

- authentication bekerja
- transaksi CRUD bekerja
- kategori bekerja
- dashboard menampilkan data dengan benar
- data antar user terisolasi
- mobile UX nyaman
- PWA dapat di-install jika environment mendukung
- filter transaksi bekerja
- export CSV bekerja
- backend tests lulus
- browser E2E flow lulus
- lint dan build lulus
- production deployment berhasil
- README dan dokumentasi tersedia

## Portfolio Goal

UangKu harus menunjukkan kemampuan:

- product thinking
- mobile-first frontend engineering
- PWA
- backend API design
- PostgreSQL relational modeling
- authentication
- authorization
- business logic
- testing
- security
- deployment
- documentation

Project tidak boleh terlihat seperti sekadar aplikasi CRUD tutorial.
