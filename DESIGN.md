# DESIGN.md — UI/UX Light Mode & Safe to Spend Specification for "Uangku"

Dokumen ini mendefinisikan spesifikasi desain, sistem warna tema terang, dan komponen UI utama untuk perombakan antarmuka aplikasi **Uangku** (Next.js Frontend & FastAPI Backend).

---

## 1. Design Philosophy & Guidelines

- **Clean & High-Contrast Light Mode:** Fokus pada estetika putih bersih, segar, dan profesional untuk menciptakan kesan transparan dan tepercaya pada aplikasi keuangan.
- **Hero Feature Focus (Safe to Spend):** Menyoroti rekomendasi batas belanja harian sebagai indikator utama di dashboard agar pengguna dapat mengontrol pengeluaran harian dengan cepat.
- **Mobile-First & One-Hand Ergonomics:** Navigasi bawah (`BottomNav`) dan tombol aksi utama (`FAB`) dirancang agar mudah dijangkau dengan jempol.
- **Smooth Feedback:** Seluruh interaksi wajib memiliki feedback mikro (efek tekan pada tombol, *skeleton loading*, dan transisi halus pada mutasi data).

---

## 2. Color Palette & Theming (Tailwind CSS - Light Mode Only)

> Catatan token: komponen dashboard (`BalanceCard`, `SafeToSpendCard`,
> `SpendingDonut`, `BudgetWarning`, `Header`, `MonthNavigator`, halaman
> `/beranda`) memakai palet slate/emerald di bawah persis seperti tertulis.
> Token OKLCH di `frontend/src/app/globals.css` (`canvas`/`surface`/`accent`/...)
> dipakai halaman non-dashboard (`riwayat`, `akun`, auth) dan dipetakan ke
> warna yang sama secara visual (`accent` ≈ `emerald-600`). Jangan migrasi
> massal satu ke lainnya tanpa review visual di browser.

- **Background Utama:** `bg-slate-50` (putih keabuan sangat lembut)
- **Card / Surface:** `bg-white` dengan border halus `border-slate-100` dan bayangan lembut `shadow-sm`
- **Safe to Spend Card:** `bg-emerald-50/70` dengan border `border-emerald-100`
- **Primary / Accent:** `emerald-600`
- **Income (Pemasukan):** `text-emerald-600` / `bg-emerald-100`
- **Expense (Pengeluaran):** `text-rose-600` / `bg-rose-100`
- **Text System:**
  - Headings / Nominal Utama: `text-slate-900`
  - Subtitle / Label Sekunder: `text-slate-500`
  - Caption / Helper: `text-xs text-slate-400`

---

## 3. Komponen Utama & Layout Dashboard (`/beranda`)

### A. Header & Sapaan (`Header.tsx`)

- Sapaan nama pengguna, tanggal hari ini, serta ikon notifikasi dan pengaturan di pojok kanan atas.

### B. Kartu Saldo Utama (`BalanceCard.tsx`)

- Surface berwarna putih (`bg-white`) dengan sudut `rounded-2xl` dan `shadow-sm`.
- Menampilkan Saldo Bersih dalam format besar (`text-3xl font-bold text-slate-900`).
- Ringkasan mini di bagian bawah kartu: Pemasukan Bulan Ini (`text-emerald-600`) dan Pengeluaran Bulan Ini (`text-rose-600`).

### C. Safe to Spend Widget (`SafeToSpendCard.tsx`) — *Killer Feature*

- Kontainer berlatar `bg-emerald-50/70` dengan sudut `rounded-2xl` dan border `border-emerald-100`.
- Menampilkan teks judul: `💡 Rekomendasi Aman Hari Ini`.
- **Nominal Harian Utama:** Angka batas belanja hari ini ditampilkan mencolok (`text-2xl font-bold text-emerald-700`).
- Detail Informasi Pendukung:
  - Sisa hari hingga akhir bulan (contoh: `📅 Sisa 12 hari lagi`).
  - Sisa saldo aktif yang tersisa untuk dibelanjakan (contoh: `💰 Sisa Saldo: Rp 1.740.000`).

### D. Peringatan Anggaran (`BudgetWarning.tsx`)

- Progress bar anggaran dengan background abu-abu terang (`bg-slate-100`).
- Indikator warna dinamis: Hijau (<75%), Amber/Kuning (75%-90%), Merah (>90%).

### E. Grafik Pengeluaran (`SpendingDonut.tsx`)

- Donut chart interaktif berbasis kategori pengeluaran dengan legenda persentase di sampingnya.

### F. Navigasi Bawah (`BottomNav.tsx`) & FAB (`FAB.tsx`)

- **BottomNav:** Fixed di bagian bawah layar berlatar `bg-white` dengan border atas `border-slate-200`. Item aktif ditandai dengan ikon berwarna `emerald-600` dan indikator pil halus.
- **FAB:** Tombol `(+)` melayang di pojok kanan bawah berwarna `bg-emerald-600 hover:bg-emerald-700` dengan efek bayangan mencolok (`shadow-lg`).

---

## 4. Animation & Motion Standards (Framer Motion)

- **Page Enter:** Menggunakan `motion.div` dengan animasi `initial={{ opacity: 0, y: 10 }}` ke `animate={{ opacity: 1, y: 0 }}` (duration: 0.25s).
- **Interactive Buttons:** Setiap tombol interaktif memiliki properti `whileTap={{ scale: 0.96 }}`.
- **Safe to Spend Counter:** Angka harian pada Safe to Spend disarankan memiliki animasi count-up saat halaman pertama kali dimuat.
- **Skeleton Loading:** Tampilkan komponen *shimmer* bergelombang pada seluruh kartu saat data API sedang di-fetch.

---

## 5. Maskot Mochi — Agen Keuangan Pribadi

Mochi (dompet biru + koin hijau "Rp") adalah wajah dan pemandu UangKu.
Ia muncul di banyak titik aplikasi sebagai agen interaktif — menyapa,
memandu, mengingatkan, merayakan — dengan gaya dan animasi berbeda per
konteks. Implementasi: `frontend/src/components/brand/Mascot.tsx`
(`mood`), `MochiTip.tsx` (gelembung tips), `OnboardingTour.tsx` (tur),
`SplashScreen.tsx`.

### Anatomi & Warna Brand

- Badan dompet: biru `#024691` (tutup `#1259ad`), kaki `#0b1f3a`
- Koin + aksen: hijau `#27865a`; pipi `#f9a8d4`; keringat `#93c5fd`
- Wordmark pendamping: "Uang" `#024691` + "Ku" `#27865a`, tagline `#798787`
- Wajah selalu sederhana: mata + mulut + opsional pipi. Tanpa hidung,
  tanpa detail kecil yang hilang di ukuran 64px ke bawah.

### Mood & Pemakaian

| Mood | Ciri | Dipakai saat |
|---|---|---|
| `happy` | senyum, kedip, melambai | default; empty state netral, sapaan |
| `excited` | mata berbinar, mulut terbuka, memantul | user menyelesaikan sesuatu |
| `thinking` | lirikan, mulut datar, gelembung "?" | filter kosong / tidak ketemu |
| `worried` | alis naik, mulut zigzag, keringat | anggaran ≥90%, peringatan |
| `sleepy` | mata tertutup, "Zzz", tangan turun | (cadangan; belum dipakai) |
| `celebrating` | topi pesta, konfeti, melompat | keberhasilan (export, dsb.) |

### Aturan Animasi

- **Entrance:** fade + naik ≤0.7s, easing `[0.22, 1, 0.36, 1]`; stagger
  maksimal 3 tahap (ikon → kata → tagline).
- **Idle loop:** hanya untuk elemen yang dilirik sekilas (maskot hiasan).
  Durasi ≥3 detik per putaran; gabungkan sumbu (y + rotate + scale) agar
  organik, bukan naik-turun lurus yang terlihat kaku.
- **Splash & tur:** entrance saja, lalu diam. Splash maksimal ~2 detik.
- **Reduced motion:** seluruh loop mati via `MotionConfig reducedMotion="user"`;
  splash dilewati total.
- Jangan: loop cepat (<2s), bounce berlebihan, animasi yang menghalangi
  baca angka atau tombol.

### Aturan Penempatan

- Satu Mochi per layar; ukuran 56–148px sesuai hierarki (hiasan kecil di
  tips, besar di empty state/splash).
- Selalu ditemani teks/aksi jelas — Mochi tidak pernah berdiri sendiri
  tanpa pesan atau next action.
- Interaktif (tur, tips yang bisa ditutup) tidak boleh memblokir alur
  utama; selalu ada "Lewati"/tombol tutup.
- `aria-label="Maskot UangKu"` (atau nama konteks); dekorasi murni
  `aria-hidden`.
