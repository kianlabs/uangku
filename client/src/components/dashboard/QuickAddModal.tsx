"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Mascot } from "@/components/brand/Mascot";
import { QuickAddInline } from "@/components/dashboard/QuickAddInline";

interface QuickAddModalProps {
  open: boolean;
  onClose: () => void;
}

export function QuickAddModal({ open, onClose }: QuickAddModalProps) {
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
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
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
        className="absolute inset-0 bg-black/40 cursor-default"
      />
      <div className="relative w-full max-w-lg mx-4 mb-24 sm:mb-0 rounded-2xl bg-surface border border-border shadow-xl p-6 flex flex-col items-center gap-4">
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
        <Mascot size={72} mood="happy" />
        <div className="flex flex-col items-center gap-1 text-center">
          <h2 className="text-lg font-bold text-text">Catat cepat</h2>
          <p className="text-sm text-muted">Ketik contoh: Makan siang 45k</p>
        </div>
        <QuickAddInline
          onSave={() => {
            window.dispatchEvent(new CustomEvent("uangku:tx-changed"));
          }}
        />
        <Link
          href="/transaksi/tambah"
          onClick={onClose}
          className="text-sm font-medium text-accent hover:underline"
        >
          atau isi form manual
        </Link>
      </div>
    </div>
  );
}
