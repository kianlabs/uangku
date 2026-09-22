"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Mascot } from "@/components/brand/Mascot";

const SEEN_KEY = "uangku_splash_seen";
const AUTH_SPLASH_MS = 3000;
/** Splash standar web app: singkat, maksimal tampil 1,8 detik. */
const MAX_MS = 1800;

function storageGet(): string | null {
  try {
    return sessionStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

function shouldShowSplash(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof window.matchMedia !== "function") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return false;
  }
  return storageGet() !== "1";
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
  const [showAuthSplash, setShowAuthSplash] = useState(false);

  const dismiss = useCallback(() => {
    storageSet();
    setShow(false);
  }, []);

  // Tampil sebelum paint pertama agar konten tidak sempat berkedip
  // (konten → splash → konten) di tab baru. Satu render ekstra sebelum
  // paint tidak terlihat user; setTimeout di effect biasa justru telat
  // 1–2 frame sehingga splash menampar konten yang sudah tampil.
  useLayoutEffect(() => {
    if (shouldShowSplash()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- disengaja: cegah kedip first-paint
      setShow(true);
    }
  }, []);

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(dismiss, MAX_MS);
    return () => clearTimeout(t);
  }, [show, dismiss]);

  useEffect(() => {
    function handleAuthSuccess() {
      setShowAuthSplash(true);
    }
    window.addEventListener("uangku:auth-success", handleAuthSuccess);
    return () => window.removeEventListener("uangku:auth-success", handleAuthSuccess);
  }, []);

  useEffect(() => {
    if (!showAuthSplash) return;
    const timer = setTimeout(() => setShowAuthSplash(false), AUTH_SPLASH_MS);
    return () => clearTimeout(timer);
  }, [showAuthSplash]);

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
            <Mascot size={148} variant="cap" />
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
        {showAuthSplash && (
          <motion.div
            key="auth-splash"
            role="status"
            aria-label="Menyiapkan UangKu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-canvas p-4"
          >
            <Mascot size={148} mood="celebrating" variant="cap" />
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
              className="max-w-[18rem] text-center text-2xl font-bold leading-tight tracking-tight sm:text-3xl"
            >
              <span className="block text-[#024691]">Selamat datang di</span>
              <span className="block text-[#27865a]">UangKu</span>
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.45, delay: 0.35 }}
              className="text-center text-sm font-medium tracking-wide text-[#798787]"
            >
              Menyiapkan berandamu...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
