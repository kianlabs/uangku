"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { createTransaction } from "@/lib/transactions";
import { ApiResponseError } from "@/lib/api";
import { listCategories, createCategory } from "@/lib/categories";
import { parseQuickAdd } from "@/lib/quick-add-parser";
import { todayLocalISO } from "@/lib/date";
import { formatRupiah } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { Mascot } from "@/components/brand/Mascot";
import { QuickAddGuide } from "@/components/dashboard/QuickAddGuide";
import { Check, Plus, X, ArrowRight } from "lucide-react";

interface SavedTransactionInfo {
  amount: number;
  type: "income" | "expense";
  categoryName: string;
  description: string;
}

interface QuickAddInlineProps {
  onSave: () => void;
  onSuccessChange?: (showSuccess: boolean) => void;
  onClose?: () => void;
}

const QUICK_SUGGESTIONS = [
  { label: "☕ Kopi 25k", val: "Kopi 25k" },
  { label: "🍜 Makan 35k", val: "Makan 35k" },
  { label: "🛒 Belanja 120k", val: "Belanja 120k" },
  { label: "💰 Gaji 5jt", val: "Gaji 5jt" },
];

export function QuickAddInline({ onSave, onSuccessChange, onClose }: QuickAddInlineProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [savedTx, setSavedTx] = useState<SavedTransactionInfo | null>(null);

  useEffect(() => {
    onSuccessChange?.(showSuccess);
  }, [showSuccess, onSuccessChange]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = parseQuickAdd(input);
    if (!parsed) {
      setError("Format: [kegiatan] [nominal], misal: Makan siang 45k atau Gaji 5jt");
      haptic.warning();
      return;
    }

    setIsLoading(true);

    try {
      const categories = await listCategories({ type: parsed.type });
      let category = categories.items.find(
        (c) => c.name.toLowerCase() === parsed.category?.toLowerCase()
      );

      if (!category && parsed.category) {
        category = await createCategory({
          name: parsed.category,
          type: parsed.type,
        });
      }

      if (!category) {
        const fallback = categories.items[0];
        if (!fallback) throw new Error("Kategori tidak ditemukan");
        category = fallback;
      }

      // Tanggal lokal (bukan UTC): toISOString() bisa mundur sehari untuk WIB
      const today = todayLocalISO();
      const promise = createTransaction({
        type: parsed.type,
        amount: String(parsed.amount),
        category_id: category.id,
        transaction_date: today,
        description: parsed.description,
      });

      // Optimistik: halaman lain refetch; gagal → catch + refetch mengembalikan.
      window.dispatchEvent(new CustomEvent("uangku:tx-changed"));
      haptic.success();

      await promise;

      setSavedTx({
        amount: parsed.amount,
        type: parsed.type,
        categoryName: category.name,
        description: parsed.description ?? "Transaksi",
      });
      setInput("");
      setShowSuccess(true);
      onSave();
    } catch (err) {
      haptic.error();
      // P1-16: pesan offline vs server dibedakan.
      setError(
        err instanceof ApiResponseError && err.status === 0
          ? "Tidak ada koneksi. Periksa jaringan lalu coba lagi."
          : "Gagal menyimpan. Coba lagi."
      );
    } finally {
      setIsLoading(false);
    }
  }, [input, onSave]);

  const handleRecordAgain = useCallback(() => {
    haptic.tap();
    setShowSuccess(false);
    setSavedTx(null);
  }, []);

  const handleFinish = useCallback(() => {
    haptic.tap();
    if (onClose) {
      onClose();
    } else {
      setShowSuccess(false);
      setSavedTx(null);
    }
  }, [onClose]);

  if (showSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        className="w-full flex flex-col items-center gap-4 py-2 text-center"
      >
        <Mascot size={80} mood="celebrating" variant="sparkle" label="Mochi merayakan catatan tersimpan" />

        <div className="flex flex-col items-center gap-1">
          <h3 className="text-xl font-bold text-text">Tersimpan!</h3>
        </div>

        {savedTx && (
          <div className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 flex flex-col items-center gap-1.5 shadow-xs">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
              {savedTx.type === "income" ? "Pemasukan" : "Pengeluaran"}
            </span>
            <span
              className={`text-2xl font-bold num ${
                savedTx.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-text"
              }`}
            >
              {savedTx.type === "income" ? "+ " : "- "}
              {formatRupiah(savedTx.amount)}
            </span>
            <div className="flex items-center gap-2 text-xs text-muted mt-0.5">
              <span className="font-semibold text-text">{savedTx.description}</span>
              <span>·</span>
              <span className="px-2.5 py-0.5 rounded-md bg-surface border border-border font-medium text-text">
                {savedTx.categoryName}
              </span>
            </div>
          </div>
        )}

        <div className="w-full flex flex-col sm:flex-row items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleRecordAgain}
            className="w-full sm:flex-1 h-11 rounded-2xl bg-surface-muted hover:bg-slate-200/80 dark:hover:bg-slate-800 text-text font-semibold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 border border-border min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            Catat Lagi
          </button>
          <button
            type="button"
            onClick={handleFinish}
            className="w-full sm:flex-1 h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-sm min-h-[44px]"
          >
            <Check className="w-4 h-4" />
            Selesai
          </button>
        </div>

        <Link
          href="/riwayat"
          onClick={handleFinish}
          className="text-xs text-muted hover:text-text underline transition-colors pb-1 pt-1"
        >
          Lihat di riwayat transaksi →
        </Link>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-3">
      <label htmlFor="quick-add" className="sr-only">
        Catat transaksi cepat
      </label>

      {/* Input Utama */}
      <div className="relative w-full">
        <input
          id="quick-add"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='Ketik disini... misal: "Kopi 25k"'
          className="w-full h-12 pl-4 pr-10 rounded-2xl bg-surface border border-border text-base text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-xs"
          disabled={isLoading}
        />
        {input && (
          <button
            type="button"
            onClick={() => setInput("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text p-1 rounded-full hover:bg-surface-muted"
            aria-label="Hapus teks"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Suggestion Chips */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 w-full">
        {QUICK_SUGGESTIONS.map((chip) => (
          <button
            key={chip.val}
            type="button"
            onClick={() => setInput(chip.val)}
            className="text-xs px-2.5 py-1 rounded-full bg-surface-muted/80 text-muted hover:text-text hover:bg-slate-200/80 dark:hover:bg-slate-800 transition-colors active:scale-95 font-medium"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger text-center">
          {error}
        </p>
      )}

      {/* Tombol Simpan */}
      <button
        type="submit"
        disabled={isLoading || !input.trim()}
        className="w-full h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-base active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-2 mt-1 min-h-[44px]"
      >
        {isLoading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Menyimpan...</span>
          </>
        ) : (
          <>
            <span>Simpan Transaksi</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      <QuickAddGuide />
    </form>
  );
}
