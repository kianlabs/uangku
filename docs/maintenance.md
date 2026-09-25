# UangKu — Maintenance Runbook

Panduan operasional untuk menjaga `uangku-web.my.id` tetap hidup.
Prinsip: semua deploy lewat Git (`master`), tidak ada perubahan manual
langsung di server kecuali env vars.

## 1. Peta Layanan

| Komponen | Provider | URL / Lokasi | Deploy |
|---|---|---|---|
| Frontend (Next.js) | Vercel, project `uangku`, Root `client` | `https://uangku-web.my.id` | Otomatis dari `master` |
| Backend (FastAPI Docker) | Render, service `uangku-api` | `https://uangku-api.onrender.com` | Otomatis dari `master` |
| Database (PostgreSQL) | ikut `DATABASE_URL` di Render Environment | — | Migrasi otomatis via `entrypoint.sh` |
| Domain + DNS | Idwebhost (`NS1/NS2.IDWEBHOST.ID`) | `uangku-web.my.id` | Manual (panel Idwebhost) |
| OAuth Client ID | Google Cloud Console (`uangku-app`) | — | Manual |

Alur request: browser → Vercel → rewrite `/api/*` → Render → PostgreSQL.
`SERVER_URL` (Vercel) = `https://uangku-api.onrender.com`.

## 2. Deploy Normal (tanpa ganggu user)

1. Kerja di branch: `git checkout -b fitur-x` (jangan push langsung ke `master`
   kecuali darurat).
2. Push → Vercel membuat **Preview URL** sendiri → test di sana
   (login, tambah transaksi, dashboard).
3. Merge ke `master` → Vercel + Render deploy otomatis (2–5 menit).
4. Verifikasi produksi (ganti bila perlu):
   ```bash
   curl -s https://uangku-web.my.id/api/v1/auth/config
   # {"google_enabled":true}
   curl -s -o /dev/null -w "%{http_code}\n" https://uangku-web.my.id/
   # 200
   ```
5. Session user **tidak logout** saat deploy (session di cookie signed;
   hanya ganti `SECRET_KEY` yang memaksa logout massal).

Aturan migrasi DB: tambah kolom nullable dulu → deploy → baru isi data.
Jangan rename/hapus kolom di deploy yang sama dengan kode pemakainya.
Jangan edit migrasi yang sudah ter-apply.

## 3. Environment & Secrets

Backend (Render → Environment): `APP_ENV=production`, `SECRET_KEY` (acak,
min 32 char), `HTTPS_ONLY=true`, `DATABASE_URL` (`?sslmode=require`),
`ALLOWED_ORIGINS=https://uangku-web.my.id`,
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
Opsional bila darurat: `GOOGLE_REDIRECT_URI`
(mis. `https://uangku-web.my.id/api/v1/auth/google/callback`).

Frontend (Vercel → Settings → Environment Variables):
`SERVER_URL=https://uangku-api.onrender.com`.
Tiap ubah env → **Redeploy** agar berlaku.

Aturan: secret tidak pernah masuk Git (`.env` di-ignore — sudah
diverifikasi). Token dashboard (Vercel/Render/Fly) yang dibagikan ke
asisten/AI harus di-revoke setelah tugas selesai.

## 4. Domain & DNS (Idwebhost)

Zone `uangku-web.my.id`:

| Type | Name | Value |
|---|---|---|
| `A` | `@` | IP dari Vercel Domains (saat ini `216.198.79.1`) |
| `CNAME` | `www` | hostname dari Vercel Domains (bentuk `<id>.vercel-dns-017.com`) |

Vercel → project `uangku` → Settings → Domains: apex = Production,
`www` + `*.vercel.app` redirect 308 ke apex. SSL otomatis.
Sumber kebenaran nilai DNS = halaman Domains tersebut (Vercel bisa
merotasi IP — prioritaskan nilainya dibanding catatan ini).

## 5. Playbook Insiden

| Gejala | Penyebab paling mungkin | Aksi |
|---|---|---|
| Custom domain `404 NOT_FOUND`, `*.vercel.app` OK | Deployment production ERROR (pernah: `vercel.json` pakai `cd client && ...` padahal Root Directory sudah `client`) | Vercel → Deployments → baca build log → fix → push; domain pulih saat deployment READY |
| Reload berulang `/masuk` ↔ `/beranda` | Cookie sesi basi (terjadi setelah batalkan Google OAuth di tengah jalan) | User: hapus cookie situs / incognito. Kode sudah diperbaiki (`AuthContext` menunggu logout selesai sebelum redirect) |
| Redirect ke `/masuk?error=google_not_configured` | `GOOGLE_CLIENT_ID/SECRET` belum masuk env backend | Isi di Render Environment → redeploy |
| Error Google `redirect_uri_mismatch` | Host yang diterima backend ≠ yang terdaftar | Set `GOOGLE_REDIRECT_URI` eksplisit di Render → redeploy |
| Buka pertama lambat 30–60 dtk, lalu ngebut | Cold start Render free (tidur setelah ±15 mnt idle) | Normal di paket gratis. Solusi permanen: Render Starter atau migrasi Fly.io (`fly.server.toml` siap) |
| `429` saat testing login berkali-kali | Rate-limit login dipakai bersama (proxy IP tidak statis) | Tunggu semenit, ulangi pelan-pelan |
| Favicon/preview link masih lama | Cache browser / cache aplikasi chat | Hard refresh; test preview pakai URL `?v=2` |
| `google_enabled: false` padahal env sudah diisi | Lupa redeploy setelah ubah env | Redeploy service-nya |

## 6. Rutinitas

- **Bulanan**: cek log deploy terakhir Vercel + Render; cek `/api/v1/auth/config`;
  putar backup DB produksi (pg_dump, simpan di luar server).
- **Triwulanan**: `mise run test && mise run lint && mise run build` lokal;
  update dependency minor (Next, FastAPI, uv lock); review error log Render.
- **Insidental**: rotasi `SECRET_KEY` (logout massal sekali — umumkan dulu);
  rotasi Google client secret bila pernah bocor ke chat/log, lalu update
  `.env` lokal + Render.

## 7. Rollback

- Kode: `git revert <commit>` → push → auto-deploy (jangan force-push `master`).
- DB: restore dari backup bila migrasi merusak data (migrasi Alembic hanya
  maju — tidak ada downgrade otomatis).
- Darurat domain: redirect/pindah nameserver kembali di panel Idwebhost.
