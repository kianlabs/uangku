"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, MotionConfig } from "motion/react";
import { Mascot } from "@/components/brand/Mascot";
import { QuickAddInline } from "@/components/dashboard/QuickAddInline";

interface QuickAddModalProps {
  open: boolean;
  onClose: () => void;
}

export function QuickAddModal({ open, onClose }: QuickAddModalProps) {
  const closeTimer = useRef<number | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
      if (closeTimer.current !== null) {
        clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <MotionConfig reducedMotion="user">
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        role="dialog"
        aria-modal="true"
        aria-label="Catat transaksi cepat"
      >
        <button
          type="button"
          aria-label="Tutup dialog"
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/30 backdrop-blur-[2px] cursor-default"
        />
        <motion.div
          initial={{ opacity: 0, y: 48, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 380, damping: 34 }}
          className="relative w-full max-w-lg mx-4 mb-24 sm:mb-0 rounded-t-[28px] sm:rounded-[28px] bg-surface/85 border border-white/60 shadow-xl backdrop-blur-2xl backdrop-saturate-150 p-6 pt-3 flex flex-col items-center gap-4"
        >
          <div aria-hidden="true" className="h-1.5 w-12 rounded-full bg-slate-900/15" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="absolute top-3 right-3 flex items-center justify-center w-9 h-9 rounded-lg text-muted hover:bg-surface-muted hover:text-text transition-colors"
        >
          <svg
            aria-hidden="true"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        {!saved && <Mascot size={72} mood="happy" />}
        {!saved && (
          <div className="flex flex-col items-center gap-1 text-center">
            <h2 className="text-lg font-bold text-text">Catat cepat</h2>
          </div>
        )}
        <QuickAddInline
          onSave={() => {
            window.dispatchEvent(new CustomEvent("uangku:tx-changed"));
            // Kasih waktu lihat Mochi celebrating, lalu tutup otomatis.
            if (closeTimer.current !== null) clearTimeout(closeTimer.current);
            closeTimer.current = window.setTimeout(onClose, 1400);
          }}
          onSuccessChange={(s) => {
            setSaved(s);
            // User pilih "Catat lagi" → batalkan tutup otomatis.
            if (!s && closeTimer.current !== null) {
              clearTimeout(closeTimer.current);
              closeTimer.current = null;
            }
          }}
        />
        {!saved && (
          <Link
            href="/transaksi/tambah"
            onClick={onClose}
            className="text-sm font-medium text-accent hover:underline"
          >
            atau isi form manual
          </Link>
        )}
        </motion.div>
      </div>
    </MotionConfig>
  );
}
