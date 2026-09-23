"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, MotionConfig } from "motion/react";
import { Mascot } from "@/components/brand/Mascot";
import { QuickAddInline } from "@/components/dashboard/QuickAddInline";
import { X } from "lucide-react";

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
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label="Catat transaksi cepat"
      >
        {/* Backdrop Gelap Tanpa Blur */}
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 transition-opacity cursor-pointer"
          aria-hidden="true"
        />

        {/* Modal Card Berlabuh di Tengah dengan Radius Lengkap & Bebas Terpotong */}
        <motion.div
          ref={dialogRef}
          tabIndex={-1}
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="relative w-full max-w-md my-auto rounded-3xl bg-surface border border-border shadow-2xl p-6 sm:p-7 flex flex-col items-center gap-4 z-10"
        >
          {/* Tombol Tutup Silang di Kanan Atas */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="absolute top-3.5 right-3.5 flex items-center justify-center w-10 h-10 rounded-full text-muted hover:bg-surface-muted hover:text-text transition-colors active:scale-95 z-20"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header Kartu Catat Cepat (hanya tampil saat belum tersimpan) */}
          {!saved && (
            <div className="flex flex-col items-center gap-2 text-center pt-1">
              <Mascot size={64} mood="happy" variant="bow" label="Mochi siap mencatat" />
              <h2 className="text-lg font-bold text-text">Catat cepat</h2>
            </div>
          )}

          {/* Form & Rekap Hasil Catatan */}
          <QuickAddInline
            onSave={() => {
              // Beri waktu 5 detik agar user sempat membaca rekap transaksi,
              // atau mereka bisa langsung tap "Selesai" kapan saja.
              if (closeTimer.current !== null) clearTimeout(closeTimer.current);
              closeTimer.current = window.setTimeout(onClose, 5000);
            }}
            onSuccessChange={(s) => {
              setSaved(s);
              if (!s && closeTimer.current !== null) {
                clearTimeout(closeTimer.current);
                closeTimer.current = null;
              }
            }}
            onClose={onClose}
          />

          {/* Opsi Form Lengkap (hanya saat form aktif) */}
          {!saved && (
            <Link
              href="/transaksi/tambah"
              onClick={onClose}
              className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline pt-1 pb-1 transition-colors min-h-[32px] flex items-center"
            >
              Atau gunakan formulir manual lengkap →
            </Link>
          )}
        </motion.div>
      </div>
    </MotionConfig>
  );
}
