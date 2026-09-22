"use client";

import Image from "next/image";
import { motion, MotionConfig } from "motion/react";

interface UangkuLogoProps {
  /** Lebar ikon mark dalam px (teks mengikuti skala tetap). */
  markWidth?: number;
  animated?: boolean;
  className?: string;
  priority?: boolean;
  /** Tampilan horizontal ringkas (mark + kata, tanpa tagline) untuk header. */
  compact?: boolean;
}

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Lockup resmi UangKu: ikon dompet+panah (WebP transparan) tersusun di atas
 * wordmark dua-warna + tagline — meniru susunan file desain asli.
 *
 * Animasi hanya saat masuk, bergantian (mark → kata → tagline), lalu diam
 * total. Hormat prefers-reduced-motion via MotionConfig.
 */
export function UangkuLogo({
  markWidth = 120,
  animated = true,
  className = "",
  priority = false,
  compact = false,
}: UangkuLogoProps) {
  const markHeight = Math.round((markWidth * 321) / 410);

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-2 ${className}`}>
        <Image
          src="/images/logo-uangku-mark.webp"
          alt=""
          aria-hidden="true"
          width={markWidth}
          height={markHeight}
          sizes={`${markWidth}px`}
          priority={priority}
        />
        <span role="img" aria-label="UangKu" className="text-xl font-bold leading-none tracking-tight">
          <span aria-hidden="true" className="text-[#024691]">
            Uang
          </span>
          <span aria-hidden="true" className="text-[#27865a]">
            Ku
          </span>
        </span>
      </span>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <span className={`inline-flex flex-col items-center ${className}`}>
        <motion.span
          className="flex"
          initial={animated ? { opacity: 0, scale: 0.9, y: 12 } : false}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.55, ease: EASE }}
        >
          <Image
            src="/images/logo-uangku-mark.webp"
            alt=""
            width={markWidth}
            height={markHeight}
            sizes={`${markWidth}px`}
            priority={priority}
          />
        </motion.span>
        <motion.span
          aria-label="UangKu"
          role="img"
          initial={animated ? { opacity: 0, y: 10 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.12 }}
          className="mt-3 text-3xl font-bold leading-none tracking-tight"
        >
          <span aria-hidden="true" className="text-[#024691]">
            Uang
          </span>
          <span aria-hidden="true" className="text-[#27865a]">
            Ku
          </span>
        </motion.span>
        <span className="mt-2 text-sm font-medium tracking-[0.18em] text-[#798787]">
          Expense Tracker
        </span>
      </span>
    </MotionConfig>
  );
}
