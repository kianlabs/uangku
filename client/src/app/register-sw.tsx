"use client";

import { useEffect } from "react";

/**
 * RegisterSW — mendaftarkan service worker di browser.
 * Dipasang di root layout sebagai client component.
 * Tidak merender apapun ke DOM.
 */
export function RegisterSW() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // Daftarkan SW setelah halaman selesai load agar tidak menghambat rendering
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .catch(() => {
          // SW registration gagal — tidak fatal, app tetap berjalan normal
        });
    });
  }, []);

  return null;
}
