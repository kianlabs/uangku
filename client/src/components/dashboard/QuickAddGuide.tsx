"use client";

import { useState } from "react";
import { HelpCircle, ChevronDown, ChevronUp } from "lucide-react";

/**
 * Panduan instruksi lengkap format input Catat Cepat.
 * Menampilkan ringkasan format, contoh pengeluaran & pemasukan,
 * serta aturan penulisan nominal yang didukung.
 */
export function QuickAddGuide() {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <div className="w-full max-w-sm flex flex-col gap-2 pt-1 text-xs">
      {/* Kartu Ringkasan Instruksi Format */}
      <div className="rounded-2xl bg-surface-muted/60 border border-border p-3 flex flex-col gap-2 text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-semibold text-text">
            <HelpCircle className="w-3.5 h-3.5 text-accent" />
            <span>Format: [Kegiatan] [Nominal]</span>
          </div>
          <button
            type="button"
            onClick={() => setShowDetail((prev) => !prev)}
            aria-expanded={showDetail}
            className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 active:scale-95"
          >
            {showDetail ? "Tutup" : "Contoh"}
            {showDetail ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
        </div>

        {/* Contoh Pengeluaran & Pemasukan */}
        <div className="grid grid-cols-2 gap-2 text-[11px] text-muted">
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-text text-[10px] uppercase tracking-wider">
              Pengeluaran
            </span>
            <span className="font-mono text-text">kopi 25k</span>
            <span className="font-mono text-text">makan siang 35rb</span>
            <span className="font-mono text-text">bensin 30ribu</span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-text text-[10px] uppercase tracking-wider">
              Pemasukan
            </span>
            <span className="font-mono text-text">gaji 5jt</span>
            <span className="font-mono text-text">bonus 2jt</span>
            <span className="font-mono text-text">freelance 1jt</span>
          </div>
        </div>

        {/* Detail Tambahan Saat Di-expand */}
        {showDetail && (
          <div className="pt-2 mt-1 border-t border-border flex flex-col gap-1.5 text-[11px] text-muted leading-relaxed">
            <p>
              <strong className="text-text">Satuan nominal:</strong>
              <br />
              • <code className="font-mono text-text">k</code> /{" "}
              <code className="font-mono text-text">rb</code> /{" "}
              <code className="font-mono text-text">ribu</code> = Ribuan (cth:{" "}
              <span className="font-mono text-text">45k</span> → Rp 45.000)
              <br />
              • <code className="font-mono text-text">jt</code> /{" "}
              <code className="font-mono text-text">juta</code> = Jutaan (cth:{" "}
              <span className="font-mono text-text">5jt</span> → Rp 5.000.000)
            </p>
            <p>
              <strong className="text-text">Deteksi otomatis:</strong>
              <br />
              Kata seperti <em>gaji</em>, <em>freelance</em>, <em>bonus</em>, dan{" "}
              <em>jualan</em> otomatis tercatat sebagai <strong>Pemasukan</strong>.
              Kata lainnya otomatis masuk sebagai <strong>Pengeluaran</strong>{" "}
              dengan kategori yang relevan.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
