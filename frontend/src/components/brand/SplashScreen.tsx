"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Mascot } from "@/components/brand/Mascot";

const SEEN_KEY = "uangku_splash_seen";
/** Splash standar web app: singkat, maksimal tampil 1,8 detik. */
const MAX_MS = 1800;

function storageGet(): string | null {
  try {
    return sessionStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

function storageSet(): void {
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    // mode privat: abaikan, splash tampil lagi di kunjungan berikut
  }
}

/**
 * Splash screen saat aplikasi dibuka: Mochi melambai + nama aplikasi,
 * lalu fade-out ke aplikasi.
 *
 * - Hanya sekali per sesi tab (sessionStorage)
 * - Dilewati jika prefers-reduced-motion
 * - Bisa di-skip dengan ketuk layar
 * - Selalu hilang maksimal MAX_MS
 */
export function SplashScreen() {
  const [show, setShow] = useState(false);

  const dismiss = useCallback(() => {
    storageSet();
    setShow(false);
  }, []);

  useEffect(() => {
    // setState di dalam timeout (bukan body effect) agar lolos lint
    // react-hooks/set-state-in-effect; jeda 0 task tak terlihat user.
    const t = setTimeout(() => {
      if (typeof window.matchMedia !== "function") return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
      }
      if (storageGet()) return;
      setShow(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(dismiss, MAX_MS);
    return () => clearTimeout(t);
  }, [show, dismiss]);

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {show && (
          <motion.div
            key="splash"
            role="status"
            aria-label="Memuat UangKu"
            onClick={dismiss}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-canvas p-4"
          >
            <Mascot size={148} />
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
              className="text-3xl font-bold leading-none tracking-tight"
            >
              <span className="text-[#024691]">Uang</span>
              <span className="text-[#27865a]">Ku</span>
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.45 }}
              className="text-sm font-medium tracking-[0.18em] text-[#798787]"
            >
              Expense Tracker
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
