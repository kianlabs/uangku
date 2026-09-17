# UangKu — Mobile UX & Wireframe v1

## Design Principle

UangKu dirancang mobile-first.

Target utama:

- cepat mencatat transaksi
- informasi saldo langsung terlihat
- satu tangan nyaman dipakai
- navigasi sederhana
- tidak terasa seperti dashboard SaaS desktop yang diperkecil

Ukuran acuan awal:

- 375px
- 390px

Desktop merupakan enhancement dari mobile layout.

---

# Navigation

Navigasi utama menggunakan bottom navigation.

```text
┌─────────────────────────┐
│                         │
│       Page Content      │
│                         │
├─────────────────────────┤
│  Home   Riwayat   Akun  │
└─────────────────────────┘
```

Primary destinations:

- Home
- Riwayat
- Akun

Kategori tidak perlu menjadi tab utama.

Kategori dapat dikelola melalui Settings/Akun atau dari transaction flow jika diperlukan.

---

# 1. Home / Dashboard

Tujuan:

Pengguna langsung memahami:

- saldo sekarang
- pemasukan bulan ini
- pengeluaran bulan ini
- pengeluaran terbesar
- transaksi terbaru

Wireframe:

```text
┌─────────────────────────────┐
│ UangKu                 👤   │
│ Kamis, 17 September         │
│                             │
│ Saldo Saat Ini              │
│ Rp 2.450.000                │
│                             │
│ ↑ Pemasukan   ↓ Pengeluaran │
│ Rp 4.500.000   Rp 2.050.000│
│                             │
│ Pengeluaran Bulan Ini       │
│                             │
│      [ simple chart ]       │
│                             │
│ Makanan             41%     │
│ Transportasi        23%     │
│ Tagihan             18%     │
│                             │
│ Transaksi Terbaru           │
│                             │
│ 🍜 Makan siang              │
│ Makanan          -Rp25.000  │
│                             │
│ 🚗 Grab                     │
│ Transportasi     -Rp18.000  │
│                             │
│ 💰 Gaji                     │
│ Gaji           +Rp4.500.000 │
│                             │
│             ＋              │
├─────────────────────────────┤
│   Home    Riwayat    Akun   │
└─────────────────────────────┘
```

## Dashboard Rules

Saldo menjadi hierarchy visual terbesar.

Jangan tampilkan terlalu banyak metric card.

Pemasukan dan pengeluaran cukup menjadi secondary summary.

Chart harus membantu membaca data, bukan menjadi dekorasi.

Transaksi terbaru maksimal sekitar 5 item sebelum tombol "Lihat semua".

---

# 2. Add Transaction

Tambah transaksi adalah interaction paling penting.

Pengguna harus dapat membukanya dari tombol utama di dashboard.

Prefer menggunakan full-screen sheet/page pada mobile.

```text
┌─────────────────────────────┐
│ ← Tambah Transaksi          │
│                             │
│     Pengeluaran | Pemasukan │
│                             │
│ Nominal                     │
│                             │
│ Rp  [ 25.000            ]   │
│                             │
│ Kategori                    │
│ [ 🍜 Makanan             ▼ ]│
│                             │
│ Tanggal                     │
│ [ Hari ini               ]  │
│                             │
│ Catatan                     │
│ [ Makan siang            ]  │
│                             │
│                             │
│ [      Simpan Transaksi   ] │
└─────────────────────────────┘
```

## Interaction Priority

Urutan field:

1. type
2. amount
3. category
4. date
5. description

Nominal harus langsung fokus ketika form dibuka jika UX memungkinkan.

Description optional.

Default date:

Hari ini.

---

# 3. Transaction Type

Income dan Expense harus jelas.

Jangan hanya mengandalkan warna.

Contoh:

```text
[ ↓ Pengeluaran ] [ ↑ Pemasukan ]
```

Gunakan:

- icon
- label
- color

secara bersamaan.

---

# 4. Transaction History

```text
┌─────────────────────────────┐
│ Riwayat                     │
│                             │
│ September 2026              │
│ [ Filter ]                  │
│                             │
│ Hari ini                    │
│                             │
│ 🍜 Makan siang              │
│ Makanan          -Rp25.000  │
│                             │
│ 🚗 Grab                     │
│ Transportasi     -Rp18.000  │
│                             │
│ 16 September                │
│                             │
│ 💰 Freelance                │
│ Freelance      +Rp1.500.000 │
│                             │
│ ...                         │
├─────────────────────────────┤
│   Home    Riwayat    Akun   │
└─────────────────────────────┘
```

Default ordering:

- transaction date descending
- created time descending

Grouping berdasarkan tanggal dapat digunakan untuk meningkatkan readability.

---

# 5. Filter Transactions

Filter dibuka menggunakan bottom sheet.

```text
┌─────────────────────────────┐
│ Filter Transaksi            │
│                             │
│ Jenis                       │
│ ○ Semua                     │
│ ○ Pengeluaran               │
│ ○ Pemasukan                 │
│                             │
│ Kategori                    │
│ [ Semua kategori         ▼ ]│
│                             │
│ Periode                     │
│ [ 01 Sep ] - [ 30 Sep ]    │
│                             │
│ [ Reset ]    [ Terapkan ]   │
└─────────────────────────────┘
```

Jangan pindahkan user ke halaman filter terpisah jika bottom sheet sudah cukup.

---

# 6. Transaction Detail

Tap transaction membuka detail.

```text
┌─────────────────────────────┐
│ ← Detail Transaksi      ⋮   │
│                             │
│ Pengeluaran                 │
│                             │
│ -Rp25.000                   │
│                             │
│ Kategori                    │
│ Makanan                     │
│                             │
│ Tanggal                     │
│ 17 September 2026           │
│                             │
│ Catatan                     │
│ Makan siang                 │
│                             │
│ [ Edit ]                    │
└─────────────────────────────┘
```

Menu:

- Edit
- Delete

Delete membutuhkan confirmation.

---

# 7. Categories

Category management bukan primary screen.

Dapat ditempatkan di:

Akun → Kategori

```text
┌─────────────────────────────┐
│ ← Kategori                  │
│                             │
│ Pengeluaran                 │
│                             │
│ 🍜 Makanan                  │
│ 🚗 Transportasi             │
│ 🛍 Belanja                  │
│ 🎮 Hiburan                  │
│                             │
│ + Tambah kategori           │
│                             │
│ Pemasukan                   │
│                             │
│ 💼 Gaji                     │
│ 💻 Freelance                │
│                             │
│ + Tambah kategori           │
└─────────────────────────────┘
```

---

# 8. Account / Settings

```text
┌─────────────────────────────┐
│ Akun                        │
│                             │
│ user@example.com            │
│                             │
│ Kategori                 >  │
│ Export Data              >  │
│ Tentang UangKu           >  │
│                             │
│ Keluar                       │
│                             │
├─────────────────────────────┤
│   Home    Riwayat    Akun   │
└─────────────────────────────┘
```

v1 tidak membutuhkan settings yang kompleks.

---

# 9. Empty States

Dashboard user baru tidak boleh terlihat rusak atau kosong.

Contoh:

```text
Belum ada transaksi

Mulai catat pemasukan atau pengeluaran
pertamamu hari ini.

[ + Tambah Transaksi ]
```

Empty state harus memberikan next action yang jelas.

---

# 10. Loading State

Gunakan skeleton sederhana untuk:

- balance
- summary
- transaction list

Jangan menggunakan full-screen spinner untuk setiap request kecil.

---

# 11. Error State

Error harus actionable.

Contoh:

```text
Gagal memuat transaksi.

Periksa koneksi internet lalu coba lagi.

[ Coba Lagi ]
```

Jangan tampilkan raw backend error.

---

# 12. Mobile Interaction Rules

Minimum touch target sekitar:

44x44px

Hindari:

- tombol terlalu kecil
- icon tanpa label untuk action penting
- hover-only interaction
- tabel horizontal
- form panjang tanpa hierarchy

Prefer:

- bottom sheet
- large primary action
- native-feeling input
- thumb-friendly navigation

---

# 13. Desktop Enhancement

Desktop tidak membutuhkan redesign total.

Layout dapat berubah menjadi:

```text
┌─────────────────────────────────────────────┐
│ UangKu                                      │
├──────────────┬──────────────────────────────┤
│ Navigation   │ Dashboard                    │
│              │                              │
│ Home         │ Saldo                        │
│ Riwayat      │ Summary                      │
│ Akun         │ Chart                        │
│              │ Recent Transactions          │
└──────────────┴──────────────────────────────┘
```

Tetapi mobile tetap menjadi source design utama.

---

# 14. Accessibility

- Income/expense tidak dibedakan hanya dengan warna.
- Text contrast harus cukup.
- Form memiliki label yang jelas.
- Error message terkait langsung dengan input.
- Keyboard navigation tetap didukung pada desktop.
- Icon-only button harus memiliki accessible label.
- Chart harus memiliki text summary.

---

# 15. Design Responsibilities

CREATE / IMPLEMENT:

`impeccable`

REVIEW / CRITIQUE:

`frontend-design-review`

Design implementation tidak dimulai sebelum project scaffolding selesai.

Visual final boleh berkembang dari wireframe ini, tetapi user flow utama tidak boleh berubah tanpa alasan produk yang jelas.
