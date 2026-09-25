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

Jika produk memiliki pengguna aktif dan kebutuhan native muncul, aplikasi React Native/Expo dapat dibuat menggunakan server API yang sama.

## MVP Features

### Authentication

- Register
- Login (email/password atau Google OAuth 2.0 — akun Google baru otomatis
  dibuat + kategori default; akun email lama otomatis terhubung)
- Logout
- User session (kedaluwarsa 7 hari)
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
- transaction date (maksimal besok, tahun minimal 2000 — divalidasi server
  dan client)

### Categories

Default expense categories:

- Makanan
- Transportasi
- Belanja
- Hiburan
- Tagihan
- Listrik & Air
- Internet & Telepon
- Langganan Digital
- Cicilan & Pinjaman
- Asuransi
- Pajak & Administrasi
- Kebutuhan Rumah
- Pembayaran Digital
- Kesehatan
- Pendidikan
- Donasi & Zakat
- Lainnya

Default income categories:

- Gaji
- Freelance
- Bonus
- Penjualan
- Lainnya

User juga dapat membuat kategori sendiri.

Aturan hapus:

- kategori yang dipakai transaksi tidak bisa langsung dihapus — user memilih
  kategori tujuan, transaksi + anggaran dipindahkan, baru kategori asal
  dihapus (atomik; anggaran digabung bila tujuan sudah punya)
- kategori terakhir per tipe tidak bisa dihapus (cegah jalan buntu)
- dialog hapus menyebut bila ada anggaran yang ikut terhapus

### Transaction Filtering

Filter berdasarkan:

- bulan
- tanggal
- income / expense
- kategori

### Export

- CSV export API + tombol Unduh CSV di Pengaturan
- Formatted PDF export from Pengaturan (dibatasi 2000 baris; data besar
  pakai CSV; filename `uangku-YYYYMMDD-jenis.pdf`)

### Connectivity and recurring transactions

- The app is online-only: network failures while saving show a clear,
  retryable error — nothing is queued on the device and nothing is sent
  automatically later.
- Monthly recurring reminders live on the server (synced across devices):
  edit, pause/resume, income or expense, manual confirm creates one
  transaction per month (idempotent).
- These features do not run as a background server scheduler or push notification.

### Budgets (simple)

Anggaran belanja bulanan per kategori:

- satu batas per kategori, berlaku tiap bulan (tidak perlu isi ulang)
- progress pemakaian dengan peringatan 75% / 90%
- diatur dari halaman Kategori, dipantau dari Beranda
- navigasi bulan ‹ › yang muncul setelah anggaran pertama dibuat dan
  berhenti di bulan tersebut (bulan sebelumnya tidak dapat diakses);
  bulan lampau hanya menampilkan kategori yang beranggaran
- progress refresh otomatis setelah tambah/hapus transaksi
- hapus hanya lewat tombol Hapus + konfirmasi (mengosongkan input = batal edit)

Ini bukan complex budgeting (tanpa rollover, tanpa multi-periode) — batas
tersebut tetap di luar cakupan v1.

### Onboarding & Mochi Agent

Mochi adalah maskot pemandu UangKu yang berperan sebagai **agen keuangan
pribadi**: menyambut, menjelaskan, dan mengingatkan — bukan sekadar dekorasi.

Kepribadian:

- ramah, ringkas, tidak menggurui
- bicara Bahasa Indonesia santai
- tidak pernah mengklaim sebagai AI penasihat keuangan

Titik interaksi:

- splash screen saat aplikasi dibuka
- tur 3 langkah untuk user baru (selesai → langsung tambah transaksi)
- empty state (beranda, riwayat, kategori) dengan ajakan bertindak jelas
- tips kontekstual (misal kategori hampir jebol anggaran)
- perayaan kecil saat user menyelesaikan sesuatu (misal export berhasil)

Aturan produk:

- Mochi tidak boleh memblokir aksi user; selalu bisa dilewati/ditutup
- maksimal satu interupsi per sesi (tur hanya untuk user baru tanpa transaksi)
- status tur (`onboarding_done`) tersimpan di server agar lintas perangkat
- seluruh animasi hormat prefers-reduced-motion

Bukan Mochi:

- chatbot / AI advisor (tidak ada klaim analisis cerdas)
- notifikasi push atau pengingat otomatis berbasis server
- gamifikasi (poin, streak reward, level)

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

Client:

- Next.js
- TypeScript
- Tailwind CSS
- PWA support

Server:

- FastAPI
- Python

Database:

- PostgreSQL

Server tetap berupa API terpisah agar di masa depan dapat digunakan oleh:

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
- server-side recurring transaction scheduler
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
- export CSV/PDF bekerja
- server tests lulus
- browser E2E flow lulus
- lint dan build lulus
- production deployment berhasil
- README dan dokumentasi tersedia

## Portfolio Goal

UangKu harus menunjukkan kemampuan:

- product thinking
- mobile-first client engineering
- PWA
- server API design
- PostgreSQL relational modeling
- authentication
- authorization
- business logic
- testing
- security
- deployment
- documentation

Project tidak boleh terlihat seperti sekadar aplikasi CRUD tutorial.
