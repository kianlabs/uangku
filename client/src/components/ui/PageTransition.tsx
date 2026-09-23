"use client";

import { MotionConfig, motion } from "motion/react";
import { usePathname } from "next/navigation";

/** Subtle cross-fade saat halaman masuk; tanpa transform agar context position: fixed tidak rusak di Safari. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
        className="w-full"
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}
