# UangKu — Mobile UX Flow v1

## Design Principle

UangKu dirancang mobile-first.

Target utama:

- layar 375–390px
- penggunaan satu tangan
- transaksi baru dapat dicatat secepat mungkin
- angka keuangan menjadi visual hierarchy utama
- navigasi sederhana
- tidak terasa seperti dashboard SaaS desktop yang diperkecil

## Main Navigation

Navigasi authenticated menggunakan bottom navigation.

```text
┌─────────────────────────┐
│                         │
│      PAGE CONTENT       │
│                         │
│                         │
├─────────────────────────┤
│  Home   Riwayat   Akun  │
└─────────────────────────┘
```

Tombol tambah transaksi harus mudah dijangkau.

Prefer:

- floating action button
- atau primary action yang jelas dekat bottom navigation

## Screen 1 — Landing

Tujuan:
menjelaskan UangKu secara singkat dan membawa user ke register/login.

```text
┌─────────────────────────┐
│ UangKu                  │
│                         │
│ Catat uangmu.           │
│ Pahami pengeluaranmu.   │
│                         │
│ Expense tracker simpel  │
│ untuk penggunaan harian │
│                         │
│ [ Mulai Gratis ]        │
│                         │
│ Sudah punya akun? Login │
│                         │
└─────────────────────────┘
```

Landing page tidak perlu panjang pada v1.

## Screen 2 — Register / Login

```text
┌─────────────────────────┐
│ ←        UangKu         │
│                         │
│ Buat akun               │
│                         │
│ Email                   │
│ [____________________]  │
│                         │
│ Password                │
│ [____________________]  │
│                         │
│ [      Daftar       ]   │
│                         │
│ Sudah punya akun? Login │
└─────────────────────────┘
```

Form harus:

- jelas
- tidak terlalu banyak field
- error tampil dekat field
- keyboard mobile sesuai tipe input

## Screen 3 — Home / Dashboard

Home adalah halaman utama.

```text
┌─────────────────────────┐
│ UangKu              👤  │
│ September 2026      ▾   │
│                         │
│ Saldo                   │
│ Rp 2.450.000            │
│                         │
│ ↑ Pemasukan             │
│ Rp 4.500.000            │
│                         │
│ ↓ Pengeluaran           │
│ Rp 2.050.000            │
│                         │
│ Pengeluaran Bulan Ini   │
│ [ simple chart ]        │
│                         │
│ Kategori Terbesar       │
│ Makanan       Rp850.000 │
│ Transportasi  Rp400.000 │
│                         │
│ Transaksi Terbaru   →   │
│ 🍜 Makan       -25.000  │
│ 🚗 Grab        -18.000  │
│ 💰 Gaji     +4.500.000  │
│                         │
│            [+]          │
├─────────────────────────┤
│ Home    Riwayat   Akun  │
└─────────────────────────┘
```

Home tidak boleh berisi terlalu banyak card kecil.

Gunakan hierarchy:

1. saldo
2. income/expense bulan berjalan
3. insight pengeluaran
4. transaksi terbaru

## Screen 4 — Add Transaction

Tambah transaksi menggunakan bottom sheet atau halaman sederhana.

```text
┌─────────────────────────┐
│ Tambah Transaksi        │
│                         │
│ [ Pengeluaran | Masuk ] │
│                         │
│ Nominal                 │
│ Rp                      │
│ 25.000                  │
│                         │
│ Kategori                │
│ [ Makanan          ▾ ]  │
│                         │
│ Tanggal                 │
│ [ 17 Sep 2026       ]   │
│                         │
│ Catatan                 │
│ [ Makan siang       ]   │
│                         │
│ [ Simpan Transaksi ]    │
└─────────────────────────┘
```

Nominal harus menjadi field paling dominan.

Saat membuka form:

- default type: expense
- default date: hari ini
- amount langsung siap diisi

Target:
user dapat menyimpan transaksi dengan sangat sedikit interaction.

## Screen 5 — Transaction History

```text
┌─────────────────────────┐
│ Riwayat                 │
│                         │
│ September 2026      ▾   │
│                         │
│ [Semua] [Keluar] [Masuk]│
│                         │
│ 17 September            │
│                         │
│ 🍜 Makanan              │
│ Makan siang   -Rp25.000 │
│                         │
│ 🚗 Transportasi         │
│ Grab          -Rp18.000 │
│                         │
│ 💰 Gaji                 │
│             +Rp4.500.000│
│                         │
│ 16 September            │
│ ...                     │
│                         │
│            [+]          │
├─────────────────────────┤
│ Home    Riwayat   Akun  │
└─────────────────────────┘
```

Filter lanjutan dapat dibuka melalui tombol filter.

Filter:

- tanggal
- kategori
- type

Jangan menampilkan semua filter sekaligus di layar kecil.

## Screen 6 — Transaction Detail / Edit

Tap transaction membuka detail.

```text
┌─────────────────────────┐
│ ← Detail Transaksi      │
│                         │
│ Makanan                 │
│ - Rp25.000              │
│                         │
│ Makan siang             │
│ 17 September 2026       │
│                         │
│ [ Edit ]                │
│                         │
│ [ Hapus Transaksi ]     │
└─────────────────────────┘
```

Delete harus membutuhkan confirmation.

## Screen 7 — Categories

Category management tidak perlu berada di main navigation.

Akses dari Profile/Settings.

```text
┌─────────────────────────┐
│ ← Kategori              │
│                         │
│ Pengeluaran             │
│ 🍜 Makanan          >   │
│ 🚗 Transportasi     >   │
│ 🛍 Belanja          >   │
│                         │
│ + Tambah kategori       │
│                         │
│ Pemasukan               │
│ 💰 Gaji             >   │
│ 💼 Freelance        >   │
│                         │
│ + Tambah kategori       │
└─────────────────────────┘
```

## Screen 8 — Profile / Settings

```text
┌─────────────────────────┐
│ Akun                    │
│                         │
│ user@email.com          │
│                         │
│ Kategori             >  │
│ Export PDF           >  │
│ Tentang UangKu       >  │
│                         │
│ [ Logout ]              │
│                         │
├─────────────────────────┤
│ Home    Riwayat   Akun  │
└─────────────────────────┘
```

## Important UX Rules

### Money Display

Gunakan format Indonesia:

`Rp 25.000`

Bukan:

`25000`

Income:

`+ Rp 4.500.000`

Expense:

`- Rp 25.000`

Warna boleh membantu, tetapi sign dan label tetap harus tersedia.

### Empty States

Dashboard user baru tidak boleh terlihat rusak.

Contoh:

```text
Belum ada transaksi.

Catat pengeluaran atau pemasukan pertamamu.

[ Tambah Transaksi ]
```

### Loading

Gunakan loading state yang stabil.

Hindari layout yang melompat-lompat saat data masuk.

### Errors

Error harus actionable.

Buruk:

`Something went wrong`

Lebih baik:

`Transaksi gagal disimpan. Coba lagi.`

### Delete Confirmation

Delete transaction/category harus meminta confirmation.

### Touch Targets

Button, navigation, dan interactive element harus nyaman digunakan dengan jari.

### Accessibility

- contrast cukup
- icon penting memiliki label
- income/expense tidak dibedakan berdasarkan warna saja
- form memiliki label
- focus state tersedia

## Desktop Enhancement

Desktop tidak membutuhkan redesign total.

Konten mobile dapat diperlebar dengan:

- centered application shell
- max-width yang nyaman
- dashboard menggunakan layout 2 kolom jika ruang cukup

Desktop tidak harus menggunakan sidebar.

## PWA

Saat aplikasi di-install:

- icon UangKu tersedia
- standalone display mode digunakan jika sesuai
- warna browser/theme konsisten
- aplikasi tetap usable sebagai browser biasa

Catatan implementasi saat ini: transaksi yang gagal karena network dapat masuk
queue device-local dan dicoba ulang saat koneksi kembali. Ini bukan background
sync service worker atau server scheduler.

## Core User Journey

Journey utama yang harus terasa sangat baik:

```text
Login
↓
Home
↓
Tap +
↓
Masukkan nominal
↓
Pilih kategori
↓
Simpan
↓
Dashboard langsung ter-update
```

Ini adalah interaction paling penting dalam UangKu v1.
