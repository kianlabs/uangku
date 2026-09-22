# Roadmap P1 & P2 — UangKu

Status P0: selesai (commit `31c9727`). Dokumen ini scope P1 (sebelum/saat deploy
Fly.io + Neon) dan P2 (setelah live, dari feedback user).

Urutan yang disarankan: **P1-Performa → file deploy Fly.io + Neon → live →
P1-Fitur → P1-UX → P2 dari feedback**.

---

## P1-Performa (syarat Docker Fly.io, ±1 hari)

- [x] **1. Lazy-load jspdf.** `client/src/lib/transactions.ts:3` impor statis
      terseret ke semua halaman. Pindah `exportTransactionsPdf` ke
      `lib/export-pdf.ts` + `await import("jspdf")` di dalam fungsi.
      Berhasil: bundle awal `/beranda` berkurang ~300KB.
- [x] **2. Lazy-load QuickAddModal + config produksi.** `BottomNav.tsx` impor
      modal secara eager → `next/dynamic(..., { ssr: false })`.
      `next.config.ts` tambah: `output: "standalone"`, `compress: true`,
      `poweredByHeader: false`, `images.formats: ["image/avif", "image/webp"]`,
      `experimental.optimizePackageImports: ["lucide-react", "motion"]`.
      Berhasil: image Docker mengecil drastis dari `.next` 584MB.
- [x] **3. Beranda: kritis dulu, susulan kemudian.**
      `beranda/page.tsx:68-77` — render setelah `getMe + summary + metrics`;
      `budgets` + `prevSummary` di effect kedua; hapus request `page_size:1`
      (pakai `summary.recent_transactions` lokal).
      Berhasil: saldo tampil tanpa menunggu delta MoM.
- [x] **4. Video hero 404.** `LandingPhoneVideo.tsx:52` merujuk
      `/videos/UangKu_motiongraph.mp4` yang tidak ada. Hapus `<video>` sampai
      file tersedia, atau sediakan MP4 <800KB + `poster` + `preload="none"`.
      Berhasil: tidak ada request 404 + CLS di landing.
- [x] **5. Cache statis + prefetch.** `next.config.headers()`: `Cache-Control:
      public, max-age=31536000, immutable` untuk `/icons/*` + `/images/*`;
      `apiFetch` jangan set `Content-Type` untuk GET/DELETE;
      `<Link prefetch>` di BottomNav.
      Berhasil: repeat-visit cepat, tanpa preflight tak perlu.
- [x] **6. Logo WebP.** `public/images/logo-uangku-mark.png` (57KB) →
      `.webp`, tambah `sizes` di pemakaian compact, `priority` di header landing.
      Berhasil: LCP landing turun.
- [x] **7. Splash dikembalikan 3 detik (keputusan user).** Sempat 900ms,
      lalu 1,5 dtk — final `MAX_MS = 3000` sesuai permintaan. Animasi Mochi
      sempat dimatikan di banyak tempat lalu **dikembalikan penuh** (user:
      "Mochi tidak bergerak") — pesona di atas penghematan CPU. PageTransition
      memang sudah minimal (fade 0,15 dtk), tidak diubah.

## P1-Fitur

- [x] **8. Anggaran: navigasi bulan + auto-refresh.** Tambah month picker
      (seperti riwayat; server `list_budgets(month)` sudah mendukung) dan
      listener `uangku:tx-changed` + `reloadKey` di `anggaran/page.tsx`.
- [x] **9. Export CSV + batas PDF.** Dua tombol di `export-data/page.tsx`
      ("Unduh PDF" + "Unduh CSV" langsung dari blob); PDF dibatasi ±2000 baris
      dengan pesan "persempit rentang / pakai CSV"; filename
      `uangku-YYYYMMDD-jenis.pdf`.
- [x] **10. Toast global.** Satu komponen toast (success/error/info, ikon +
      warna konsisten); sukses create tampilkan toast sebelum redirect;
      `offlineQueued` → toast info "Tersimpan offline, akan dikirim otomatis".
- [ ] **11. Recurring naik ke server (terbesar).** Satukan
      `SubscriptionTemplate` + `RecurringTransaction` jadi satu model
      `templates` server-side (`day, active, type, category_id`); tambah edit +
      toggle aktif; `confirm` hormati `type`; dokumentasikan "pengingat manual,
      bukan auto-debit".
- [ ] **12. Offline edit/hapus ikut antre.** Queue `update/delete` juga
      (atau disable tombol offline dengan jelas); tambah drawer "Antrean
      offline" (lihat/batal/kirim ulang).

## P1-UX

- [ ] **13. Tap-target 44px.** Sisa: `Button size="sm"` (36px), toggle mata
      saldo, ikon gear header, tombol × modal/kembali, link kategori
      (`min-h-36px`), input/tombol `RecurringReminders`, input/switch
      pengaturan, tombol form template.
- [ ] **14. Kontras.** `text-slate-400` → `text-slate-500`/`muted` (beranda);
      `text-amber-600` → `text-amber-700` (anggaran); `text-sky-200/70` → `/90`
      (BalanceCard). Verifikasi pakai tool sebelum rilis.
- [ ] **15. Fokus keyboard.** Focus trap + return-focus `QuickAddModal`;
      fokus tiap langkah + Escape + `aria-live` di `MochiGuide`;
      `SplashScreen` bisa keyboard/button; `role="alert"` error QuickAdd;
      hapus `autoFocus` di empty-state beranda.
- [ ] **16. Onboarding.** Splash 3 dtk + bisa diketuk (final sesuai
      permintaan user);
      tur tampil optimis bila preferences gagal; seed gagal tidak menghapus
      saldo manual; link demo di empty-state beranda; pesan "saldo dilewati";
      sapaan pakai nama/fallback "Teman"; poster asli fallback video;
      typo `Profilaksi`; pesan offline vs server dibedakan + retry reset state;
      `role="status"` skeleton riwayat/anggaran; error inline pengingat.

---

## P2 (setelah live, dari feedback user)

### Konsistensi
- [ ] **1. Glosarium tombol.** `Simpan` (form), `Tambah + objek` (create),
      `Unduh` (file); semua `...` → `…`.
- [ ] **2. `ConfirmDialog` bersama.** Satukan pola hapus transaksi vs kategori.
- [ ] **3. Pengaturan di BottomNav.** Kategori & Export terlalu tersembunyi.

### Validasi & batas
- [ ] **4. Guard budget income.** `upsert_budget` tolak `category.type ==
      "income"` (422).
- [ ] **5. Unique kategori.** Pastikan `(user_id, lower(name), type)` + test.
- [ ] **6. Batas nominal.** `le=` wajar di Pydantic (mis. ≤1e12) + pesan.
- [ ] **7. Parser QuickAdd.** Desimal, `rp`, spasi + pesan contoh spesifik.

### UX kecil
- [ ] **8. Filename export berkonteks.** `uangku-YYYYMMDD-jenis.pdf/csv`.
- [ ] **9. Filter kategori di export.** Dropdown `category_id` (server siap).
- [ ] **10. Teks minimal 12px.** Naikkan `text-[10px]`/`text-[11px]`.
- [ ] **11. Copy.** Typo `Profilaksi`; sapaan pakai nama profil.

### Keamanan & backend (boleh ikut persiapan deploy)
- [ ] **12. `/docs` mati di production** + header HSTS/CSP.
- [ ] **13. Audit dependency di CI** (`npm audit` + `pip-audit`).
- [ ] **14. Rate-limit endpoint tulis** (POST transaksi, CRUD kategori,
      preferences, DELETE budget) + global default limit.

---

## Verifikasi tiap batch

```sh
cd server && uv run ruff check . && uv run pytest -q
cd client && npm run lint && npx tsc --noEmit && npm test
cd client && npx playwright test   # E2E penuh setelah batch besar
```

Target: server 285+, client 137+, E2E 66/66 tetap hijau.
Tidak boleh: ubah migrasi applied, commit secret, push langsung ke `master`.
