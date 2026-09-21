/**
 * UangKu Service Worker — minimal v1
 *
 * Hanya handle install + activate untuk memenuhi PWA installability requirement.
 * Offline-first tidak diimplementasi di v1 (sesuai architecture.md).
 * Caching dan offline sync dapat ditambahkan di versi mendatang.
 */

const SW_VERSION = "uangku-v1";

self.addEventListener("install", (event) => {
  // Skip waiting agar SW aktif segera tanpa menunggu tab lama ditutup
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  // Claim semua client agar SW langsung mengontrol halaman yang sudah terbuka
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Bersihkan cache dari versi lama jika ada di masa depan
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SW_VERSION)
            .map((key) => caches.delete(key))
        )
      ),
    ])
  );
});

// Fetch: pass-through (tidak ada caching di v1)
self.addEventListener("fetch", () => {
  // Biarkan browser menangani semua request secara normal
  // Jangan intercept — tidak ada offline support di v1
});
