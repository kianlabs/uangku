# UangKu — DESIGN.md

> Source of truth visual untuk frontend UangKu.
>
> UangKu adalah mobile-first PWA untuk pencatatan keuangan pribadi.
> Coding agent WAJIB membaca file ini sebelum menulis atau mengubah UI.
> Jangan mengarang visual direction sendiri.

---

## Hubungan dengan docs

File berikut adalah otoritas produk:
- `docs/product-brief.md`
- `docs/archive/ux-flow.md`
- `docs/archive/ui-wireframe.md`
- `docs/archive/visual-direction.md`

Jika ada konflik antara `DESIGN.md` dan dokumen produk di atas:

**dokumen produk UangKu menang.**

`DESIGN.md` menerjemahkan product direction tersebut menjadi aturan visual dan implementasi frontend.

Jangan mengubah:

- product direction
- user flow
- data model
- API behavior
- arsitektur aplikasi

hanya demi menyesuaikan desain.

Stack frontend:

- Next.js
- TypeScript
- Tailwind CSS v4

Jangan menambah:

- UI framework baru
- shadcn
- component library
- animation library
- design-token framework kompleks

hanya untuk memenuhi file ini.

---

# Cara Menggunakan DESIGN.md

Sebelum melakukan pekerjaan frontend:

1. Baca `docs/archive/visual-direction.md`.
2. Baca `docs/archive/ux-flow.md`.
3. Baca `DESIGN.md`.
4. Periksa existing components dan frontend architecture.
5. Baru implementasikan UI.

Aturan utama:

- Satu screen memiliki satu focal point yang jelas.
- Product needs lebih penting daripada design trend.
- Jangan copy Apple, Linear, atau brand lain secara langsung.
- Gunakan referensi hanya untuk mengambil prinsip visual.
- Jangan mengubah visual language tanpa persetujuan eksplisit.
- Selalu review hasil pada viewport mobile 375–390px.
- Review juga desktop sebelum menganggap UI selesai.

Inspirasi:

### Apple

Ambil prinsip:

- restraint
- whitespace
- tipografi kuat
- satu accent utama
- visual hierarchy yang tenang
- dekorasi minimal
- elevation hanya jika benar-benar diperlukan

Jangan membuat UangKu menjadi clone Apple.

### Linear

Ambil prinsip:

- spacing yang disiplin
- information hierarchy jelas
- compact tetapi tetap nyaman dibaca
- subtle border
- tonal surfaces
- interaction state yang jelas
- density yang terkontrol

Jangan membuat UangKu menjadi clone Linear.

---

# 1. Product Visual Concept

## Modern Personal Ledger

UangKu harus terasa seperti **catatan keuangan pribadi modern**.

Karakter:

- personal
- approachable
- trustworthy
- practical
- lightweight
- calm
- clear

Visual utama berasal dari:

- angka
- transaksi
- kategori
- whitespace
- typography
- subtle dividers

Bukan dari:

- card berlebihan
- ilustrasi besar
- gradient
- glow
- dekorasi abstrak
- chart pajangan

UangKu BUKAN:

- corporate banking app
- stock trading app
- crypto dashboard
- enterprise SaaS dashboard
- gamified finance app
- admin panel
- generic AI-generated finance UI

Urutan prioritas visual:

1. uang / financial numbers
2. transactions
3. categories
4. primary actions
5. supporting information
6. decoration

Decoration selalu berada paling bawah.

---

# 2. Core Visual Principles

Jika dua aturan bertentangan, prioritaskan urutan berikut:

- hierarchy > decoration
- typography > gradients
- spacing > borders
- data > containers
- interaction > ornament
- product-specific decisions > design trends
- clarity > novelty
- consistency > cleverness
- mobile-first

Setiap screen harus memiliki **satu focal point utama**.

Contoh:

- Dashboard → saldo
- Add Transaction → nominal
- Transaction Detail → amount
- History → transaction list
- Categories → category list
- Account → account actions

## Whitespace

Whitespace adalah pemisah utama.

Sebelum menambahkan:

- card
- border
- background surface
- shadow

coba selesaikan hierarchy dengan spacing terlebih dahulu.

## Containers

Default UI bukan card.

Gunakan card/surface hanya jika grouping informasi benar-benar membutuhkan boundary visual.

---

# 3. Color System

Gunakan **color roles**, bukan warna acak langsung di component.

Contoh nilai berikut adalah starting point.

Final color tetap harus diuji WCAG AA.

| Role            | Starting point                          | Fungsi                                               |
| --------------- | --------------------------------------- | ---------------------------------------------------- |
| `canvas`        | `#FAF9F6` / `#F7F5F0`                   | app background                                       |
| `surface`       | `#FFFFFF`                               | sheet, dialog, grouping penting                      |
| `surface-muted` | warm neutral                            | category icon background, skeleton, inactive control |
| `border`        | `#E8E4DC`                               | divider, input border, subtle boundary               |
| `text`          | `#1A1C1A`                               | primary text                                         |
| `muted`         | `#6B6F6B`                               | metadata, secondary label                            |
| `accent`        | deep forest green (`#1B4D3E`–`#14532D`) | CTA, nav active, focus                               |
| `accent-ink`    | `#FFFFFF`                               | content on accent                                    |
| `income`        | dark semantic green                     | income indicator                                     |
| `expense`       | accessible dark red                     | expense indicator                                    |
| `danger`        | accessible dark red                     | destructive data action                              |
| `focus`         | accent                                  | focus ring                                           |

## Canvas

Default canvas harus:

- terang
- netral
- sedikit hangat

Jangan menggunakan:

- blue-tinted white
- gradient background
- blurred blob background
- dark mode untuk v1

UangKu v1 adalah **light theme only**.

Jangan mengarang dark mode.

## Accent

Hanya satu brand accent utama:

**deep forest green**

Gunakan accent untuk:

- primary CTA
- active navigation
- focus ring
- selected state
- small emphasis

Jangan menjadikan seluruh interface hijau.

## Income dan Expense

Income/expense tidak boleh dibedakan hanya berdasarkan warna.

Gunakan minimal dua dari:

- `+` / `-`
- label
- icon
- color

Contoh:

```text
+ Rp 4.500.000
Pemasukan
```

```text
- Rp 25.000
Pengeluaran
```

## Forbidden color treatments

Dilarang:

- random blue/purple gradient
- gradient cards
- neon green
- colored glow
- glassmorphism
- decorative blobs
- excessive semantic colors
- rainbow category palette tanpa alasan

---

# 4. Typography

Gunakan satu font family utama untuk v1.

Font harus:

- modern
- neutral
- readable
- memiliki angka yang jelas
- mendukung tabular numbers

Acceptable:

- system UI stack
- Inter
- font sans-serif setara

Jangan menambah:

- decorative serif
- display font
- handwriting font

hanya untuk membuat aplikasi terlihat unik.

Keunikan datang dari hierarchy dan interaction, bukan font gimmick.

## Financial Numbers

Semua angka finansial gunakan:

```css
font-variant-numeric: tabular-nums;
```

atau utility setara.

Tujuannya agar digit tidak bergeser saat nilai berubah.

## Type Scale

| Level            | Ukuran acuan |  Weight | Penggunaan              |
| ---------------- | -----------: | ------: | ----------------------- |
| Balance          |      32–36px | 700–800 | saldo dashboard         |
| Primary amount   |      24–32px |     700 | form/detail transaction |
| Secondary amount |      20–24px | 650–700 | monthly income/expense  |
| Section heading  |      18–20px | 650–700 | section penting         |
| Body             |         16px | 400–500 | content                 |
| Secondary        |         14px | 400–500 | metadata / label        |
| Caption          |      12–13px | 400–500 | tanggal / hint          |

Jangan gunakan body utama 12–14px hanya supaya layout terlihat compact.

## Line Height

Guideline:

- financial display: `1.1–1.2`
- heading: `1.25–1.35`
- body: `1.5`
- metadata: `1.4`

## Weight

Jangan menggunakan terlalu banyak weight dalam satu layar.

Prefer:

- regular
- medium/semibold
- bold

---

# 5. Money Formatting

Default locale:

```text
id-ID
```

Display Rupiah:

```text
Rp 25.000
Rp 2.450.000
```

Income:

```text
+ Rp 4.500.000
```

Expense:

```text
- Rp 25.000
```

Jangan tampilkan:

```text
25000
IDR 25,000
Rp 25.000,00
25000.00
```

di user-facing UI v1.

Backend boleh mengirim decimal string seperti:

```text
"25000.00"
```

tetapi frontend harus memformatnya untuk user Indonesia.

## Alignment

Dashboard:

- financial number rata kiri

Transaction list:

- amount rata kanan
- tabular numbers
- jangan wrap ke baris kedua

Add transaction:

- `Rp` kecil/muted
- nominal besar

## Truncation

Jangan ellipsis financial amount.

Jika ruang sempit:

- ringkas label
- ubah layout

Jangan menyembunyikan nilai uang.

---

# 6. Spacing System

Base spacing:

```text
4px
```

Gunakan skala:

```text
4
8
12
16
24
32
```

Hindari arbitrary spacing seperti:

```text
7
11
13
19
27
```

kecuali ada alasan layout yang kuat.

## Mobile horizontal padding

Pilih satu nilai utama:

```text
16px
```

Gunakan konsisten.

Boleh menjadi 20px hanya pada layar tertentu jika benar-benar dibutuhkan, tetapi jangan campur tanpa alasan.

## Section spacing

Dashboard:

```text
24–32px
```

antara section utama.

## Transaction row

Vertical padding:

```text
12–16px
```

Interactive area minimal:

```text
44px
```

## Surface padding

Default:

```text
16px
```

## Rule

Jangan membuat nested container hanya untuk menghasilkan spacing.

Gunakan spacing utility terlebih dahulu.

---

# 7. Radius, Border, dan Shadow

## Radius

Primary button:

```text
10–12px
```

Inputs:

```text
10–12px
```

Regular surface:

```text
12–16px
```

Bottom sheet:

```text
16–20px pada top corners
```

Pill (`9999px`) hanya untuk:

- filter chip
- segmented control
- small status badge

Jangan menggunakan pill untuk seluruh UI.

## Border

Gunakan:

```text
1px hairline
```

Prefer warm subtle border.

Tidak ada:

- thick decorative border
- double border
- glowing border

## Shadow

Gunakan shadow hanya jika elevation memiliki arti.

Boleh pada:

- FAB
- modal
- dialog
- bottom sheet
- dropdown

Contoh:

```text
0 8px 24px rgb(0 0 0 / 0.08)
```

Jangan gunakan shadow pada:

- transaction row
- standard button
- static text section
- ordinary dashboard grouping

Tanpa colored glow.

---

# 8. Application Layout

Mobile adalah source layout.

Design pertama harus bekerja pada:

```text
375–390px
```

## Mobile

- single column
- bottom navigation
- FAB
- ledger list
- simple charts
- 16px horizontal padding

## Content width

Mobile app shell:

```text
max ~480px
```

Desktop:

```text
max ~1024–1120px
```

Di layar lebih besar:

- tambah breathing room
- jangan membuat content semakin lebar tanpa batas

## One focal point

Dashboard:

```text
Saldo
```

Add transaction:

```text
Nominal
```

History:

```text
Transaction list
```

Detail:

```text
Amount + transaction information
```

## Avoid

Jangan membuat:

```text
[ Balance ] [ Income ]
[ Expense ] [ Count ]
```

sebagai dashboard utama.

Jangan membuat authenticated application seperti landing page marketing.

---

# 9. Navigation

Main navigation:

```text
Home
Riwayat
Akun
```

Selalu tampilkan:

- icon
- label

Bukan icon-only navigation.

## Add Transaction

Tambah transaksi **bukan navigation tab**.

Gunakan satu pattern untuk seluruh v1:

### Floating Action Button

Lokasi:

- kanan bawah
- sedikit di atas bottom navigation
- mudah dijangkau ibu jari

FAB memiliki:

- accent background
- accessible label `Tambah transaksi`
- touch target minimal 48×48px
- subtle functional shadow

Jangan menggunakan center elevated tab.

Jangan menggunakan dua pola add action sekaligus.

## Bottom Navigation

Approx height:

```text
64–72px + safe-area
```

Gunakan:

```css
env(safe-area-inset-bottom)
```

Background:

- canvas / surface

Boundary:

- top hairline

Jangan:

- blur dekoratif
- glass nav
- giant shadow

## Navigation count

V1 tetap:

```text
3 navigation items
```

Kategori melalui:

```text
Akun → Kategori
```

---

# 10. Transaction Ledger

Transaction list adalah signature visual UangKu.

Default pattern:

```text
[icon]  Makanan                    - Rp 25.000
        Makan siang
        17 Sep
```

Bukan:

```text
┌─────────────────────────┐
│ 🍜 Makanan              │
│ Makan siang             │
│ - Rp 25.000             │
└─────────────────────────┘
```

Setiap transaksi tidak boleh menjadi card sendiri.

## Row hierarchy

1. category
2. amount
3. description
4. date

## Amount

- right aligned
- tabular numbers
- sign always visible

## Description

Optional.

Maximum display biasanya 1 line pada list.

Detail lengkap tersedia pada detail transaction.

## Date grouping

History boleh dikelompokkan:

```text
Hari ini

Makanan                 - Rp 25.000
Transportasi            - Rp 18.000

Kemarin

Belanja                 - Rp 75.000
```

## Divider

Pilih satu pattern:

**ledger rows menggunakan hairline divider.**

Jangan campur divider dan card untuk item yang sama.

## Icon

Gunakan satu icon library.

Style:

- outline
- consistent stroke
- consistent size

Icon container:

```text
36–40px
surface-muted
radius 10–12px
```

Jangan gunakan emoji sebagai production icon.

Emoji pada wireframe hanya placeholder.

---

# 11. Dashboard

Dashboard hierarchy wajib:

## 1. Period + Balance

Contoh:

```text
September 2026 ▾

Saldo
Rp 2.450.000
```

Saldo adalah visual terbesar.

## 2. Monthly income / expense

Tampilkan langsung.

Contoh:

```text
↑ Pemasukan
+ Rp 4.500.000

↓ Pengeluaran
- Rp 2.050.000
```

Boleh dua kolom jika ruang cukup.

Jangan membuat masing-masing sebagai card KPI.

## 3. Expense Insight

Tujuan:

**menjawab “uang saya paling banyak habis ke mana?”**

Prefer:

```text
Pengeluaran terbesar

Makanan
Rp 850.000
████████████

Transportasi
Rp 400.000
██████
```

## 4. Recent Transactions

Maximum sekitar 5.

Di bawahnya:

```text
Lihat semua →
```

Gunakan ledger row yang sama seperti History.

## Dashboard forbidden

Dilarang:

- 4 KPI card grid
- hero illustration
- giant greeting
- 3–5 charts
- nested cards
- large meaningless metric
- decoration-heavy header

---

# 12. Add Transaction

Ini interaction paling penting.

Target:

**user bisa mencatat transaksi dalam sedikit langkah.**

Order:

```text
type
amount
category
date
description
```

## Type

Segmented control:

```text
[ Pengeluaran | Pemasukan ]
```

Default:

```text
Pengeluaran
```

Selected state harus jelas lewat:

- contrast
- weight
- icon jika digunakan

Bukan hanya warna.

## Amount

Amount adalah focal point.

Approx:

```text
24–32px
```

Format:

```text
Rp
25.000
```

Input:

```html
inputmode="numeric"
```

atau decimal jika memang diperlukan.

Autofocus ketika masuk form jika tidak mengganggu mobile keyboard UX.

## Category

Gunakan:

- selector
- sheet
- list

Tampilkan:

- icon
- category name

Jangan free-text pada transaction form.

## Date

Default:

```text
Hari ini
```

Display:

```text
17 Sep 2026
```

## Description

Optional.

Example placeholder:

```text
Makan siang
```

Jangan jadikan wajib.

## Primary CTA

```text
Simpan Transaksi
```

- full width
- 48–52px
- accent
- radius 10–12px

## Validation

Gunakan Bahasa Indonesia.

Baik:

```text
Nominal harus lebih dari 0.
Pilih kategori terlebih dahulu.
```

Buruk:

```text
Validation failed.
Something went wrong.
```

## Success

Setelah sukses:

- close sheet/page flow
- update relevant data
- subtle confirmation

Jangan membuat celebration animation besar.

## Delete

Delete transaction wajib confirmation.

`danger` color digunakan untuk destructive data actions seperti delete.

Logout bukan destructive data action.

Logout gunakan:

- secondary
- ghost
- neutral action

bukan tombol danger merah besar.

---

# 13. Charts dan Data Visualization

Chart harus menjawab pertanyaan produk.

Pertanyaan utama:

> Pengeluaran terbesar saya apa?

## Preferred

Untuk mobile:

- proportional horizontal bars
- category list
- amount
- percentage

Lebih baik daripada chart kompleks.

## Optional

Simple donut boleh digunakan jika:

- readable di 375px
- tidak mengambil terlalu banyak ruang
- memiliki text summary

## Maximum

Dashboard:

```text
1–2 visualizations
```

Prefer hanya 1 pada v1.

## Forbidden

Dilarang:

- 3D chart
- gradient chart
- chart glow
- decorative chart
- line chart tanpa pertanyaan jelas
- terlalu banyak legend
- chart tanpa angka
- chart-only information

## Accessibility

Selalu beri textual equivalent.

Contoh:

```text
Makanan
41% · Rp 850.000
```

---

# 14. Motion

Motion harus menjelaskan:

- state change
- continuity
- feedback

Bukan dekorasi.

## Timing

Default:

```text
150–250ms
ease-out
```

## Allowed

- bottom sheet
- modal
- segmented control
- hover / pressed state
- toast
- navigation feedback

## Press state

Boleh:

```text
scale 0.97–0.98
```

atau:

- opacity
- subtle background

Jangan bounce.

## Forbidden

- entrance cascade
- animation semua cards
- scroll reveal berlebihan
- animated gradient
- parallax dekoratif
- endless floating shapes
- spring physics untuk setiap button

## Reduced motion

WAJIB respect:

```css
prefers-reduced-motion
```

## Financial number animation

Jangan membuat counting animation panjang.

Financial information harus langsung bisa dibaca.

---

# 15. Loading States

Loading tidak boleh menyebabkan layout melompat.

## Skeleton

Dashboard:

- balance skeleton
- summary skeleton
- 3–5 transaction rows

Jangan membuat 20 skeleton boxes.

Use:

```text
surface-muted
```

subtle.

## Small requests

Gunakan:

- inline spinner
- disabled state
- loading label

Jangan full-screen loader.

---

# 16. Empty States

Empty states harus actionable.

## New dashboard

```text
Belum ada transaksi.

Catat pengeluaran atau pemasukan pertamamu untuk mulai melihat kondisi keuangan.

[ Tambah transaksi ]
```

## Empty history

```text
Belum ada transaksi pada periode ini.

[ Tambah transaksi ]
```

## Empty filtered result

```text
Tidak ada transaksi yang cocok dengan filter ini.

[ Reset filter ]
```

## Empty categories

```text
Belum ada kategori.

[ Tambah kategori ]
```

Jangan menggunakan giant illustration hanya untuk empty state.

---

# 17. Error States

Gunakan Bahasa Indonesia.

Harus:

- jelas
- singkat
- actionable

Baik:

```text
Transaksi gagal disimpan. Coba lagi.
```

```text
Gagal memuat transaksi.
Periksa koneksi lalu coba lagi.

[ Coba lagi ]
```

Buruk:

```text
Something went wrong.
Unexpected application error.
500 Internal Server Error.
```

Jangan tampilkan:

- stack trace
- raw API error
- database exception

kepada user.

---

# 18. Accessibility

Accessibility adalah blocking requirement.

## Contrast

Semua text/control harus memenuhi WCAG AA.

Terutama cek:

- accent on canvas
- accent-ink on accent
- muted text
- income/expense
- danger

## Touch targets

Minimum:

```text
44×44px
```

Primary CTA ideal:

```text
48px+
```

## Semantic HTML

Gunakan:

```text
header
main
nav
section
button
label
input
```

secara tepat.

Jangan menggunakan `div` clickable jika `button` lebih benar.

## Focus

Keyboard focus selalu visible.

Gunakan:

```text
2px accent ring
```

Jangan remove outline tanpa replacement.

## Keyboard

Semua core interactions harus usable dengan keyboard.

Dialogs/sheets:

- Escape menutup jika aman
- focus management benar

## Form errors

Gunakan:

- visible text
- `aria-invalid`
- `aria-describedby`

## Icon-only buttons

Harus memiliki accessible label.

Contoh:

```text
Tambah transaksi
Tutup
Hapus transaksi
```

## Color

Jangan menyampaikan informasi penting hanya melalui warna.

---

# 19. Responsive Behavior

Design priority:

1. smartphone
2. tablet
3. desktop

## Mobile

Base:

```text
375–390px
```

- single column
- 16px padding
- bottom nav
- FAB right
- ledger list
- one primary visualization

## Tablet

- centered layout
- more whitespace
- content width meningkat secara terbatas

Jangan langsung berubah menjadi desktop admin dashboard.

## Desktop

Desktop adalah enhancement dari mobile.

Allowed:

```text
┌─────────────────────────────────────────┐
│ UangKu                    Home History  │
├──────────────────┬──────────────────────┤
│                  │                      │
│ Balance          │ Recent Transactions  │
│                  │                      │
│ Spending         │                      │
│ Breakdown        │                      │
│                  │                      │
└──────────────────┴──────────────────────┘
```

Dashboard boleh menjadi dua kolom jika membantu.

Tidak wajib sidebar.

Prefer simple top navigation.

## Desktop forbidden

- enterprise sidebar
- giant content width
- dense admin table
- 4-column KPI grid
- desktop layout yang kemudian dipaksa mengecil ke mobile

---

# 20. PWA Behavior

Ketika di-install, UangKu harus terasa seperti aplikasi.

Pastikan:

- standalone display sesuai
- safe-area mobile dihormati
- bottom navigation tidak bentrok home indicator
- input tidak tertutup keyboard
- viewport tidak menyebabkan accidental zoom
- layout tidak bergeser saat address bar berubah

Offline transaction synchronization bukan scope v1.

Jangan menambah offline-first architecture.

---

# 21. Component Rules

Gunakan Tailwind + React state yang sudah ada.

Jangan menambah dependency hanya untuk membuat component kecil.

## Buttons

### Primary

- accent solid
- accent-ink
- 10–12px radius
- clear pressed state

### Secondary

- surface / canvas
- subtle hairline
- text color

### Ghost

- no permanent container
- hover/pressed surface

### Danger

Hanya destructive data actions.

Contoh:

- delete transaction
- delete category

Logout bukan danger destructive action.

## Input

Pattern:

```text
Label
[ Field ]
Error / hint
```

- radius 10–12px
- hairline
- focus accent
- label selalu visible

## Segmented Control

Digunakan untuk:

```text
Pengeluaran | Pemasukan
```

Pill container diperbolehkan.

## Filter Chip

Pill diperbolehkan.

Inactive:

```text
surface-muted
```

Active:

- accent
- atau high-contrast selected state

## Bottom Sheet

- surface
- top radius
- scrim
- clear close action
- focus handling

## Toast

Gunakan hanya untuk feedback singkat.

Jangan menjadikan semua error toast.

Form error tetap dekat field.

---

# 22. Icon System

Pilih satu icon library.

Gunakan satu style secara konsisten.

Prefer:

- outline
- clean
- simple
- consistent stroke

Jangan campur:

- emoji
- outlined icon
- filled icon
- custom illustration

secara acak.

Category icon boleh memiliki muted background container.

Icon adalah helper.

Bukan decorative centerpiece.

---

# 23. Copywriting

Default language:

**Bahasa Indonesia.**

Tone:

- singkat
- manusiawi
- konkret
- tidak corporate
- tidak terlalu santai

Baik:

```text
Tambah transaksi
Belum ada transaksi
Pengeluaran bulan ini
Coba lagi
```

Buruk:

```text
Unlock the power of your financial journey.
Experience seamless financial management.
Take control of your finances today.
```

Dilarang generic AI marketing copy.

---

# 24. Anti-AI-Slop Rules

Semua hal berikut dianggap blocking issue pada UI review.

## Dilarang

1. generic SaaS dashboard
2. card untuk setiap informasi
3. nested cards
4. random blue/purple gradient
5. gradient card
6. unnecessary glassmorphism
7. decorative blobs
8. neon glow
9. excessive pills
10. excessive rounded rectangles
11. giant authenticated-app hero
12. emoji sebagai production icon system
13. emoji dicampur icon library
14. meaningless charts
15. terlalu banyak charts
16. entrance animation cascade
17. parallax dekoratif
18. floating decorative elements
19. giant illustration tanpa product purpose
20. generic AI copywriting
21. metric besar yang tidak penting
22. enterprise sidebar tanpa kebutuhan
23. desktop dashboard squeezed into mobile
24. visual decoration without product purpose
25. random component styles antar screen
26. inconsistent spacing
27. excessive shadow
28. glow border
29. gradient text
30. hero marketing setelah login

## Positive Rules

Selalu utamakan:

- hierarchy > decoration
- typography > gradient
- spacing > border
- data > containers
- interaction > ornament
- product-specific decisions > trends
- clarity > cleverness
- restrained visual language
- mobile-first
- obvious focal point

---

# 25. Visual Review Checklist

Sebelum frontend dianggap selesai:

- [ ] Dashboard focal point adalah saldo.
- [ ] Saldo terlihat tanpa scroll panjang pada 375–390px.
- [ ] Tidak ada KPI grid.
- [ ] Tidak ada nested card.
- [ ] Tidak ada card untuk setiap transaction.
- [ ] Transaction list menggunakan ledger rows.
- [ ] Amount menggunakan tabular numbers.
- [ ] Income/expense memiliki sign.
- [ ] Bottom nav hanya Home / Riwayat / Akun.
- [ ] Add transaction memakai FAB kanan bawah.
- [ ] Tidak ada emoji sebagai production icon.
- [ ] Hanya satu icon system.
- [ ] Tidak ada random blue/purple gradient.
- [ ] Tidak ada glassmorphism.
- [ ] Tidak ada decorative blob.
- [ ] Tidak ada glow.
- [ ] Maksimal 1–2 visualization.
- [ ] Chart mempunyai text alternative.
- [ ] Motion restrained.
- [ ] Reduced motion dihormati.
- [ ] Empty state actionable.
- [ ] Error state berbahasa Indonesia.
- [ ] Touch target minimal 44px.
- [ ] Focus state visible.
- [ ] Contrast WCAG AA.
- [ ] Desktop terasa seperti enhancement mobile.
- [ ] Tidak ada giant authenticated hero.
- [ ] Tidak ada generic AI marketing copy.
- [ ] UI tetap terasa seperti UangKu, bukan template.

---

# 26. Visual Success Criteria

UI dianggap berhasil jika user baru, tanpa tutorial, dapat menjawab dalam beberapa detik:

1. Berapa saldo saya?
2. Berapa pengeluaran bulan ini?
3. Pengeluaran terbesar saya apa?
4. Di mana saya menambah transaksi?
5. Apa transaksi terakhir saya?

Jika salah satu pertanyaan tersebut sulit dijawab karena:

- decoration
- navigation
- card density
- chart
- layout
- hierarchy

maka desain belum selesai.

---

# 27. Implementation Notes — Tailwind

Gunakan Tailwind sebagai implementation layer.

Jangan membuat design-token framework baru.

## Canvas

Body menggunakan role:

```text
canvas
```

## Surfaces

Gunakan:

```text
surface
surface-muted
```

hanya jika memang diperlukan.

## Financial numbers

Semua amount gunakan utility setara:

```text
tabular-nums
```

## Brand colors

Jangan hardcode Tailwind default seperti:

```text
blue-500
violet-500
fuchsia-500
```

untuk brand UangKu.

Gunakan semantic role dari file ini.

## Spacing

Prefer:

```text
p-4
gap-3
gap-4
space-y-6
space-y-8
```

daripada arbitrary value.

## Responsive

Base style adalah mobile.

Gunakan:

```text
md:
lg:
```

sebagai enhancement.

Jangan membuat desktop first lalu mencoba memperbaiki mobile belakangan.

---

# 28. Hal yang Sengaja Belum Di-Spec Pixel-Perfect

Jangan invent complexity hanya karena bagian ini belum exact.

Belum perlu dikunci:

- exact final forest-green hex
- exact font file
- exact shadow blur per browser
- seluruh component variants
- complex token naming
- dark mode
- animation system
- custom illustration system

Hal tersebut hanya ditambahkan jika ada kebutuhan produk nyata.

---

# 29. Agent Contract

Untuk setiap task frontend, agent harus:

1. membaca `DESIGN.md`
2. membaca dokumen produk terkait
3. memeriksa existing UI sebelum membuat component baru
4. menjaga visual language yang sudah ada
5. menghindari dependency baru kecuali benar-benar diperlukan
6. implement mobile-first
7. menjalankan lint/test/build yang relevan
8. render UI pada browser
9. review screenshot mobile
10. review screenshot desktop
11. memperbaiki obvious visual/accessibility issues
12. baru menyatakan task selesai

Agent tidak boleh:

- mengganti visual direction secara sepihak
- membuat redesign besar di luar scope task
- memasang UI framework tanpa persetujuan
- mengubah backend untuk mempermudah desain
- mengorbankan accessibility demi visual
- menambahkan dekorasi hanya karena ruang terlihat kosong
- mengatakan UI selesai tanpa pernah melihat hasil render

---

# 30. Design Workflow

Untuk pekerjaan visual yang signifikan, gunakan workflow:

```text
Product docs
      ↓
DESIGN.md
      ↓
Art direction / exploration
      ↓
UI implementation
      ↓
Browser render
      ↓
Mobile screenshot review
      ↓
Desktop screenshot review
      ↓
Accessibility / design review
      ↓
Revision
      ↓
Verification
```

Untuk environment saat ini (koordinator Pi → worker omp):

```text
Koordinator Pi
→ parse request, spawn worker via pi-spawn-omp.sh

Worker omp (kr/claude-sonnet-4.5)
→ implementasi UI/frontend/backend
→ verifikasi di browser
→ kirim worker_done

Koordinator Pi
→ relay hasil ke user
```

Worker melakukan implementasi dan verifikasi browser sebelum menyelesaikan task.

`DESIGN.md` tetap menjadi source of truth.

Model atau skill tidak boleh mengganti product design contract ini.

---

# Final Principle

UangKu tidak perlu terlihat "ramai" untuk terlihat premium.

Premium pada UangKu berarti:

- angka mudah dibaca
- hierarchy jelas
- spacing disiplin
- interaction cepat
- detail konsisten
- motion restrained
- visual punya identitas
- user langsung memahami kondisi keuangannya

Jika sebuah elemen tidak membantu user memahami:

- berapa uang yang dimiliki
- dari mana uang masuk
- ke mana uang pergi
- apa transaksi terbaru
- bagaimana mencatat transaksi

maka pertanyakan apakah elemen tersebut perlu ada.
