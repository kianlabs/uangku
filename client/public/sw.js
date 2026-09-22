/**
 * UangKu Service Worker — minimal v1
 *
 * Hanya handle install + activate untuk memenuhi PWA installability requirement.
 * Offline transaction queue dikelola oleh aplikasi melalui localStorage.
 * Service worker sengaja pass-through agar tidak menyimpan response finansial.
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

// Fetch: pass-through; jangan cache response finansial.
self.addEventListener("fetch", () => {
  // Biarkan browser menangani semua request secara normal.
});

// Notifikasi pengingat: ketuk → buka/fokus ke halaman pengingat.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const url = typeof data.url === "string" ? data.url : "/pengaturan";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("navigate" in client && "focus" in client) {
            return client.navigate(url).then((c) => c.focus());
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
        return undefined;
      })
  );
});
