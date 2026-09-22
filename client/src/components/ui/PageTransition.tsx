"use client";

import { MotionConfig, motion } from "motion/react";
import { usePathname } from "next/navigation";

/**
 * Transisi antar halaman: hanya fade-in singkat saat halaman masuk.
 *
 * Sengaja TANPA AnimatePresence mode="wait" + exit: pola itu mengosongkan
 * layar (~0,22 dtk kanvas kosong) setiap pindah tab sebelum halaman baru
 * dipasang — terlihat kedip. Di sini halaman lama langsung diganti halaman
 * baru yang memudar masuk, tanpa jeda kosong. Tanpa geser vertikal agar
 * tidak terasa "menumpuk" saat konten skeleton bertukar ke daftar.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="w-full"
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}
