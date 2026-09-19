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
