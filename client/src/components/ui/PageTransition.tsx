"use client";

import { MotionConfig, motion } from "motion/react";
import { usePathname } from "next/navigation";

/** Fade-in singkat saat halaman masuk; tanpa exit agar tak ada jeda layar kosong. */
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
