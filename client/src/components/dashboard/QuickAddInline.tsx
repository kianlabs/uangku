"use client";

import { useState, useCallback } from "react";
import { createTransaction } from "@/lib/transactions";
import { listCategories, createCategory } from "@/lib/categories";
import { parseQuickAdd } from "@/lib/quick-add-parser";
import { todayLocalISO } from "@/lib/date";

interface QuickAddInlineProps {
  onSave: () => void;
}

export function QuickAddInline({ onSave }: QuickAddInlineProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = parseQuickAdd(input);
    if (!parsed) {
      setError("Format: Makan siang 45k atau Gaji 5jt");
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
      await createTransaction({
        type: parsed.type,
        amount: String(parsed.amount),
        category_id: category.id,
        transaction_date: today,
        description: parsed.description,
      });

      setInput("");
      setShowSuccess(true);
      onSave();
    } catch {
      setError("Gagal menyimpan. Coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }, [input, onSave]);

  if (showSuccess) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm text-emerald-700 font-medium">Tersimpan!</p>
        <button
          onClick={() => setShowSuccess(false)}
          className="text-sm text-slate-500 hover:text-slate-700 underline"
        >
          Catat lagi
        </button>
      </div>
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
        className="w-full h-12 px-4 rounded-xl bg-white border border-slate-200 text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        disabled={isLoading}
        autoFocus
      />
      {error && <p className="text-sm text-rose-600 text-center">{error}</p>}
      <button
        type="submit"
        disabled={isLoading || !input.trim()}
        className="h-11 rounded-xl bg-emerald-600 text-white font-semibold text-base hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Menyimpan..." : "Simpan"}
      </button>
      <p className="text-xs text-slate-400 text-center">
        Format: <span className="font-mono text-slate-500">Nama nominal rb|ribu|k|jt|juta</span>
      </p>
    </form>
  );
}