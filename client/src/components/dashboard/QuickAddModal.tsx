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
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      // Focus trap: Tab berputar di dalam dialog (P1-15).
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !dialogRef.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !dialogRef.current.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Fokus masuk ke dialog; simpan elemen asal untuk return-focus saat tutup.
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => dialogRef.current?.focus());
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
      restoreFocusRef.current?.focus?.();
      restoreFocusRef.current = null;
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
          aria-hidden="true"
          tabIndex={-1}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/30 backdrop-blur-[2px] cursor-default"
        />
        <motion.div
          ref={dialogRef}
          tabIndex={-1}
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
          className="absolute top-2 right-2 flex items-center justify-center w-11 h-11 rounded-lg text-muted hover:bg-surface-muted hover:text-text transition-colors"
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
        {!saved && <Mascot size={72} mood="happy" variant="bow" />}
        {!saved && (
          <div className="flex flex-col items-center gap-1 text-center">
            <h2 className="text-lg font-bold text-text">Catat cepat</h2>
          </div>
        )}
        <QuickAddInline
          onSave={() => {
            // tx-changed sudah didispatch QuickAddInline segera setelah submit
            // (pola perceived-instant) — di sini cukup tutup dengan jeda agar
            // user sempat lihat Mochi celebrating.
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
