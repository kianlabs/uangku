"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "motion/react";
import { createTransaction } from "@/lib/transactions";
import { listCategories, createCategory } from "@/lib/categories";
import { parseQuickAdd } from "@/lib/quick-add-parser";
import { todayLocalISO } from "@/lib/date";
import { haptic } from "@/lib/haptics";
import { Mascot } from "@/components/brand/Mascot";
import { QuickAddGuide } from "@/components/dashboard/QuickAddGuide";

interface QuickAddInlineProps {
  onSave: () => void;
  onSuccessChange?: (showSuccess: boolean) => void;
}

export function QuickAddInline({ onSave, onSuccessChange }: QuickAddInlineProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    onSuccessChange?.(showSuccess);
  }, [showSuccess, onSuccessChange]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = parseQuickAdd(input);
    if (!parsed) {
      setError("Format: Makan siang 45k atau Gaji 5jt");
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

      setInput("");
      setShowSuccess(true);
      onSave();
    } catch {
      haptic.error();
      setError("Gagal menyimpan. Coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }, [input, onSave]);

  if (showSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col items-center gap-2 py-4 text-center"
      >
        <Mascot size={88} mood="celebrating" variant="sparkle" label="Mochi merayakan catatan tersimpan" />
        <p className="text-sm text-accent font-semibold">
          Tersimpan!
        </p>
        <button
          onClick={() => setShowSuccess(false)}
          className="text-sm text-muted hover:text-text underline min-h-[44px] px-4"
        >
          Catat lagi
        </button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-3">
      <label htmlFor="quick-add" className="sr-only">
        Catat transaksi cepat
      </label>
      <input
        id="quick-add"
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder='Contoh: "Makan siang 45k"'
        className="w-full h-12 px-4 rounded-xl bg-surface border border-border text-base text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
        disabled={isLoading}
        autoFocus
      />
      {error && <p className="text-sm text-danger text-center">{error}</p>}
      <button
        type="submit"
        disabled={isLoading || !input.trim()}
        className="h-11 rounded-xl bg-accent text-accent-ink font-semibold text-base hover:bg-accent/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Menyimpan..." : "Simpan"}
      </button>
      <QuickAddGuide />
    </form>
  );
}