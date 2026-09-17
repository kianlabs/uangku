# UangKu — Visual Direction v1

## Design Goal

UangKu harus terasa seperti aplikasi finansial pribadi yang:

- tenang
- jelas
- cepat dipahami
- mobile-first
- modern tetapi tidak trend-chasing
- tidak terlihat seperti dashboard SaaS generik
- tidak terlihat seperti template AI

Fokus utama visual adalah:

1. angka
2. transaksi
3. kategori
4. tindakan cepat

Dekorasi selalu berada di bawah fungsi.

---

## Brand Personality

UangKu harus terasa:

- personal
- approachable
- trustworthy
- practical
- lightweight

Bukan:

- corporate banking
- fintech trading
- crypto app
- enterprise dashboard
- playful/gamified finance

---

## Core Visual Idea

Konsep utama:

**"Personal Ledger"**

Tampilan mengambil inspirasi dari catatan keuangan pribadi modern:

- angka besar
- list transaksi seperti ledger
- divider sederhana
- kategori mudah dipindai
- ruang kosong cukup
- summary singkat

UI tidak dibangun dari kumpulan card.

Gunakan surface/card hanya ketika benar-benar membantu grouping.

---

## Color Direction

Gunakan palette netral sebagai foundation.

Background utama:

- off-white / warm white untuk light mode

Text:

- near-black
- muted gray untuk secondary information

Accent utama:

- satu warna brand UangKu

Income dan expense menggunakan semantic color, tetapi tidak boleh hanya mengandalkan warna.

Contoh:

Income:

`+ Rp 1.500.000`

Expense:

`- Rp 25.000`

Tetap tampilkan tanda `+` dan `-`.

### Avoid

Jangan gunakan:

- neon finance green sebagai seluruh brand
- gradient biru-ungu generic AI
- gradient card
- glow
- glassmorphism
- terlalu banyak semantic color

---

## Brand Accent

Arah awal brand accent:

**Deep Green / Forest**

Alasan:

- berhubungan dengan finansial tanpa terasa seperti trading app
- lebih tenang dibanding emerald/neon
- mudah dipadukan dengan neutral background

Accent digunakan untuk:

- primary action
- selected navigation
- focus state
- small highlights

Bukan sebagai background semua card.

Warna final harus diuji terhadap WCAG contrast sebelum implementation selesai.

---

## Typography

Gunakan sans-serif modern yang memiliki angka jelas.

Prioritas:

- readability
- tabular/financial numbers
- karakter angka mudah dibedakan
- tidak terlalu dekoratif

Gunakan maksimal 1 primary font family pada v1.

Hierarchy:

### Financial Number

Saldo:

besar dan dominant.

Contoh:

`Rp 2.450.000`

Harus menjadi elemen pertama yang terlihat pada dashboard.

### Heading

Gunakan heading seperlunya.

Jangan membuat setiap section menjadi heading besar.

### Body

Ringkas dan mudah dipindai.

### Metadata

Gunakan ukuran lebih kecil untuk:

- tanggal
- kategori
- secondary information

Jangan terlalu kecil untuk mobile.

---

## Number Styling

Financial amount harus mudah dibaca.

Contoh:

`Rp 2.450.000`

Bukan:

`IDR 2,450,000.00`

Untuk user Indonesia, default formatting menggunakan locale Indonesia.

Income:

`+ Rp 4.500.000`

Expense:

`- Rp 25.000`

Gunakan tabular numbers jika font mendukung agar angka tidak bergeser saat berubah.

---

## Spacing

Gunakan spacing system konsisten.

Prefer kelipatan:

- 4
- 8
- 12
- 16
- 24
- 32

Mobile horizontal padding:

sekitar 16–20px.

Section vertical spacing harus cukup lega agar dashboard tidak terasa penuh.

Jangan menggunakan terlalu banyak container untuk menciptakan spacing.

---

## Border Radius

Gunakan radius moderat.

Bukan:

- semua elemen berbentuk pill
- card super-rounded
- tombol kapsul di seluruh UI

Pill hanya untuk:

- filter
- segmented control
- small state/status

Primary button boleh memiliki radius nyaman tetapi tidak harus pill.

---

## Borders and Shadows

Prefer:

- subtle border
- tonal surface difference

daripada:

- shadow besar
- floating card berlebihan

Shadow hanya jika benar-benar menunjukkan elevation seperti:

- bottom sheet
- modal
- floating action

---

## Dashboard

Dashboard tidak boleh terlihat seperti kumpulan KPI cards.

Hindari:

```text
[ Saldo ] [ Income ]
[ Expense ] [ Count ]
```

Prefer visual hierarchy langsung:

```text
September 2026

Saldo
Rp 2.450.000

+ Rp 4.500.000 pemasukan
- Rp 2.050.000 pengeluaran

----------------------------

Pengeluaran bulan ini

[ visualization ]

Makanan
Rp 850.000

Transportasi
Rp 400.000
```

Data menjadi interface utama.

---

## Transaction List

Transaction list merupakan salah satu elemen visual utama UangKu.

Pattern:

```text
[icon] Makanan                 - Rp 25.000
       Makan siang
       17 Sep
```

Atau layout yang lebih compact jika usability lebih baik.

Prioritas:

1. category
2. amount
3. description
4. date

Jangan bungkus setiap transaction ke dalam card terpisah.

Gunakan row + divider atau spacing.

---

## Category Icons

Gunakan satu icon library konsisten.

Contoh:

- food
- transport
- shopping
- health
- entertainment
- salary

Jangan mencampur:

- emoji
- icon outline
- icon filled
- illustration

dalam interface yang sama.

Icon berada sebagai helper, bukan elemen dekoratif utama.

---

## Add Transaction Experience

Tambah transaksi adalah interaction paling penting.

Amount menjadi fokus visual pertama.

Concept:

```text
Pengeluaran

Rp
25.000

Kategori
Makanan

Tanggal
Hari ini

Catatan
Makan siang

[ Simpan ]
```

Saat sheet/form dibuka:

- cursor siap pada nominal
- numeric keyboard digunakan di mobile
- default tanggal = hari ini
- default type = expense

User tidak boleh melewati banyak langkah untuk transaksi sederhana.

---

## Income / Expense Selector

Gunakan segmented control:

```text
[ Pengeluaran | Pemasukan ]
```

State aktif harus terlihat melalui:

- contrast
- text weight
- optional icon

Jangan hanya warna merah/hijau.

---

## Bottom Navigation

Main navigation:

- Home
- Riwayat
- Akun

Tambah transaksi bukan tab utama.

Gunakan separate primary action.

Layout concept:

```text
Home       Riwayat       Akun
              +
```

Atau floating button di atas navigation jika secara visual lebih baik.

Jangan menambah banyak navigation item pada v1.

---

## Charts

Chart harus menjawab pertanyaan, bukan menjadi dekorasi.

Pertanyaan utama:

**"Uang saya paling banyak habis untuk apa?"**

Prefer:

- horizontal category bars
- simple donut jika readability tetap baik

Hindari:

- chart 3D
- gradient chart
- terlalu banyak legend
- line chart tanpa purpose
- 5 chart dalam satu dashboard

Pada layar kecil, list + proportional bars sering lebih berguna daripada chart kompleks.

---

## Empty State

Empty state harus membuat user langsung tahu langkah berikutnya.

Contoh:

### Belum ada transaksi

Belum ada yang bisa diringkas.

Catat transaksi pertamamu untuk mulai melihat kondisi keuangan.

`[ Tambah transaksi ]`

Tidak perlu illustration besar.

---

## Loading State

Gunakan skeleton hanya jika membantu menjaga layout.

Jangan skeleton seluruh layar dengan 20 kotak.

Loading cepat dapat menggunakan subtle indicator.

---

## Error State

Gunakan bahasa sederhana.

Contoh:

`Transaksi belum tersimpan.`

`Coba lagi`

Bukan:

`An unexpected application error has occurred.`

Untuk technical details, log di tempat yang sesuai.

---

## Motion

Motion minimal dan purposeful.

Boleh:

- bottom sheet transition
- small state transition
- feedback setelah transaksi tersimpan
- navigation transition jika ringan

Hindari:

- entrance animation semua elemen
- scroll animation berlebihan
- spring/bounce tanpa fungsi
- animated gradient

Respect reduced-motion preference.

---

## Responsive Desktop

Mobile merupakan source layout utama.

Desktop dapat menggunakan:

- max-width container
- more horizontal breathing room
- 2-column dashboard jika membantu

Tetapi tidak perlu berubah menjadi SaaS sidebar dashboard.

Possible desktop structure:

```text
┌──────────────────────────────────────────┐
│ UangKu                            Account │
├─────────────────────┬────────────────────┤
│                     │                    │
│ Financial summary   │ Recent activity    │
│                     │                    │
│ Spending breakdown  │                    │
│                     │                    │
└─────────────────────┴────────────────────┘
```

Tetap sederhana.

---

## Accessibility

Wajib:

- minimum touch target yang nyaman
- semantic HTML
- form label jelas
- focus state visible
- keyboard navigation
- sufficient contrast
- error tidak hanya menggunakan warna
- income/expense tidak dibedakan hanya warna
- icon-only action memiliki accessible label

---

## PWA Experience

Saat di-install:

UangKu harus terasa seperti aplikasi, bukan website yang kebetulan ada di Home Screen.

Pastikan:

- standalone display sesuai
- safe area mobile diperhitungkan
- bottom navigation tidak bentrok gesture area
- input tidak tertutup mobile keyboard
- viewport tidak menyebabkan accidental zoom/layout shift

---

## Design Skill Responsibilities

Saat implementation:

### CREATE / IMPLEMENT

Gunakan:

`impeccable`

Tugas:

- membuat visual direction menjadi UI nyata
- hierarchy
- spacing
- typography
- component implementation

### REVIEW / CRITIQUE

Gunakan:

`frontend-design-review`

Tugas:

- accessibility
- consistency
- interaction
- responsive behavior
- generic AI pattern detection

Reviewer tidak boleh otomatis mengganti seluruh design tanpa alasan.

---

## Anti-Pattern Checklist

Sebelum UI dianggap selesai, pastikan tidak terdapat:

- generic SaaS dashboard
- semua informasi dibungkus card
- nested cards
- random gradients
- glassmorphism
- giant hero di authenticated application
- floating pill untuk setiap control
- decorative blobs
- excessive rounded rectangles
- meaningless chart
- excessive animation
- desktop UI yang hanya diperkecil ke mobile
- emoji sebagai primary icon system
- inconsistent spacing
- meaningless metric

---

## Visual Success Criteria

UangKu berhasil secara visual jika pengguna baru dapat menjawab dalam beberapa detik:

1. Berapa saldo saya?
2. Berapa pengeluaran bulan ini?
3. Pengeluaran terbesar saya apa?
4. Di mana saya menambah transaksi?
5. Apa transaksi terakhir saya?

Tanpa tutorial.
