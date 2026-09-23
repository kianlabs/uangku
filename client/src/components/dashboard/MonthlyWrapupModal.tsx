"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Mascot } from "@/components/brand/Mascot";
import { formatRupiah } from "@/lib/format";
import { monthLabelId, shiftMonthKey, toMonthKey } from "@/lib/date";
import { haptic } from "@/lib/haptics";
import {
  X,
  TrendingUp,
  TrendingDown,
  Award,
  Sparkles,
  Check,
  Copy,
  PieChart,
  Target,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getDashboardSummary } from "@/lib/dashboard";
import { listBudgets } from "@/lib/budgets";
import type { Budget, DashboardSummary } from "@/lib/types";

interface MonthlyWrapupModalProps {
  open: boolean;
  onClose: () => void;
  initialMonth?: string;
  earliestMonth?: string | null;
}

export function MonthlyWrapupModal({
  open,
  onClose,
  initialMonth,
  earliestMonth: initialEarliestMonth,
}: MonthlyWrapupModalProps) {
  const currentMonth = useMemo(() => toMonthKey(new Date()), []);
  const [selectedMonth, setSelectedMonth] = useState(() => initialMonth || currentMonth);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [earliestMonthState, setEarliestMonthState] = useState<string | null>(
    () => initialEarliestMonth ?? null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialEarliestMonth) {
      setEarliestMonthState(initialEarliestMonth);
    }
  }, [initialEarliestMonth]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const controller = new AbortController();

    Promise.all([
      getDashboardSummary(selectedMonth, controller.signal),
      listBudgets(selectedMonth, controller.signal),
    ])
      .then(([sumRes, budRes]) => {
        if (cancelled) return;
        setSummary(sumRes);
        setBudgets(budRes.items);
        if (sumRes.earliest_transaction_date) {
          setEarliestMonthState(sumRes.earliest_transaction_date.slice(0, 7));
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [open, selectedMonth]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        haptic.tap();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const income = parseFloat(summary?.monthly_income || "0") || 0;
  const expense = parseFloat(summary?.monthly_expense || "0") || 0;
  const netSavings = income - expense;
  const savingsRate = income > 0 ? Math.round((netSavings / income) * 100) : 0;

  // Kategori terbesar
  const topExpenseCategory = useMemo(() => {
    if (!summary?.expense_by_category || summary.expense_by_category.length === 0) {
      return null;
    }
    const sorted = [...summary.expense_by_category].sort(
      (a, b) => parseFloat(b.amount) - parseFloat(a.amount)
    );
    return sorted[0];
  }, [summary]);

  // Evaluasi anggaran
  const budgetStats = useMemo(() => {
    const withBudget = budgets.filter((b) => b.spent !== null && Number(b.amount) > 0);
    const safeCount = withBudget.filter((b) => (b.percentage ?? 0) < 90).length;
    const overCount = withBudget.filter((b) => (b.percentage ?? 0) >= 100).length;
    const warningCount = withBudget.filter(
      (b) => (b.percentage ?? 0) >= 90 && (b.percentage ?? 0) < 100
    ).length;
    return { total: withBudget.length, safeCount, overCount, warningCount };
  }, [budgets]);

  // Navigasi bulan: tombol < nonaktif jika di bulan sebelumnya belum ada transaksi.
  // Tombol > nonaktif jika sudah berada di bulan berjalan.
  const canGoPrev = Boolean(earliestMonthState && selectedMonth > earliestMonthState);
  const canGoNext = selectedMonth < currentMonth;

  // Evaluasi Mochi
  const evaluation = useMemo(() => {
    if (expense === 0 && income === 0) {
      return {
        mood: "thinking" as const,
        variant: "glasses" as const,
        title: "Belum Ada Catatan Bulan Ini",
        message: "Catat transaksi pemasukan dan pengeluaranmu agar Mochi bisa merangkum evaluasi lengkap.",
      };
    }
    if (income > 0 && savingsRate >= 25) {
      return {
        mood: "celebrating" as const,
        variant: "sparkle" as const,
        title: "Luar Biasa Hemat!",
        message: `Kamu berhasil menyisihkan ${savingsRate}% pemasukanmu bulan ini. Pertahankan disiplin keuangan ini ya!`,
      };
    }
    if (netSavings >= 0) {
      return {
        mood: "happy" as const,
        variant: "cap" as const,
        title: "Arus Kas Sehat",
        message: "Pengeluaranmu tetap di bawah pemasukan. Anggaranmu terkendali dengan baik bulan ini.",
      };
    }
    return {
      mood: "worried" as const,
      variant: "classic" as const,
      title: "Perlu Penyesuaian",
      message: "Pengeluaran melampaui pemasukan bulan ini. Yuk cek kategori terbesar dan pasang rem untuk bulan depan.",
    };
  }, [expense, income, netSavings, savingsRate]);

  // Salin ringkasan teks
  async function handleCopySummary() {
    const text = [
      `📊 Laporan Keuangan UangKu — ${monthLabelId(selectedMonth)}`,
      `💰 Pemasukan: ${formatRupiah(income)}`,
      `💸 Pengeluaran: ${formatRupiah(expense)}`,
      `📈 Sisa Bersih: ${formatRupiah(netSavings)} (${netSavings >= 0 ? `Hemat ${savingsRate}%` : "Defisit"})`,
      topExpenseCategory
        ? `🏆 Terbanyak: ${topExpenseCategory.category_name} (${formatRupiah(parseFloat(topExpenseCategory.amount))} · ${Math.round(topExpenseCategory.percentage)}%)`
        : "",
      budgetStats.total > 0
        ? `🎯 Anggaran: ${budgetStats.safeCount}/${budgetStats.total} kategori aman`
        : "",
      `🐾 Catatan Mochi: ${evaluation.message}`,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await navigator.clipboard.writeText(text);
      haptic.success();
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      haptic.error();
    }
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 overflow-y-auto flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-label={`Laporan Bulanan ${monthLabelId(selectedMonth)}`}
      >
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-lg max-h-[92vh] flex flex-col bg-surface border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header Sticky */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Award className="w-4 h-4" aria-hidden="true" />
              </div>
              <h2 className="text-base font-bold text-text">Laporan Keuangan</h2>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup laporan"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-text hover:bg-surface-muted transition-colors active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Month Selector Bar */}
          <div className="flex items-center justify-between px-5 py-3 bg-canvas border-b border-border text-sm">
            <button
              type="button"
              disabled={!canGoPrev || isLoading}
              onClick={() => {
                haptic.tap();
                setIsLoading(true);
                setSelectedMonth((k) => shiftMonthKey(k, -1));
              }}
              aria-label="Bulan sebelumnya"
              title={!canGoPrev ? "Belum ada transaksi di bulan sebelumnya" : "Bulan sebelumnya"}
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-border bg-surface text-text hover:bg-surface-muted active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-text">
              {monthLabelId(selectedMonth)}
            </span>
            <button
              type="button"
              disabled={!canGoNext || isLoading}
              onClick={() => {
                haptic.tap();
                setIsLoading(true);
                setSelectedMonth((k) => shiftMonthKey(k, 1));
              }}
              aria-label="Bulan berikutnya"
              title={!canGoNext ? "Sudah bulan terbaru" : "Bulan berikutnya"}
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-border bg-surface text-text hover:bg-surface-muted active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Body Scrollable */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
            {isLoading ? (
              <div className="flex flex-col gap-3 py-8 items-center" role="status">
                <div className="w-12 h-12 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                <p className="text-xs text-muted">Mochi sedang menghitung ringkasan...</p>
              </div>
            ) : (
              <>
                {/* Kartu Evaluasi Mochi */}
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-teal-50/50 border border-emerald-100 shadow-sm">
                  <div className="shrink-0 pt-0.5">
                    <Mascot
                      size={64}
                      mood={evaluation.mood}
                      variant={evaluation.variant}
                      animated
                      label="Mochi mengevaluasi keuangan bulanan"
                    />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                      <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                      Evaluasi Mochi
                    </div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {evaluation.title}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {evaluation.message}
                    </p>
                  </div>
                </div>

                {/* Grid Metrik Utama: Pemasukan, Pengeluaran, Tabungan */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1 p-3.5 rounded-2xl bg-surface border border-border shadow-sm">
                    <span className="text-xs font-semibold text-muted flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                      Pemasukan
                    </span>
                    <span className="num text-base font-bold text-text">
                      {formatRupiah(income)}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 p-3.5 rounded-2xl bg-surface border border-border shadow-sm">
                    <span className="text-xs font-semibold text-muted flex items-center gap-1">
                      <TrendingDown className="w-3.5 h-3.5 text-rose-600" aria-hidden="true" />
                      Pengeluaran
                    </span>
                    <span className="num text-base font-bold text-text">
                      {formatRupiah(expense)}
                    </span>
                  </div>

                  <div className="col-span-2 flex items-center justify-between p-4 rounded-2xl bg-brand text-white shadow-sm">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-medium text-sky-200 uppercase tracking-wide">
                        Sisa Bersih (Tabungan)
                      </span>
                      <span className="num text-xl font-bold">
                        {formatRupiah(netSavings)}
                      </span>
                    </div>
                    {income > 0 && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur">
                        {savingsRate >= 0 ? `+${savingsRate}%` : `${savingsRate}%`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Sorotan Kategori Terbesar */}
                {topExpenseCategory && parseFloat(topExpenseCategory.amount) > 0 && (
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-surface border border-border shadow-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                        <PieChart className="w-5 h-5 text-slate-700" aria-hidden="true" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs text-muted">Pengeluaran Terbesar</span>
                        <span className="text-sm font-bold text-text truncate">
                          {topExpenseCategory.category_name}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span className="num text-sm font-bold text-text">
                        {formatRupiah(parseFloat(topExpenseCategory.amount))}
                      </span>
                      <span className="num text-xs text-muted">
                        {Math.round(topExpenseCategory.percentage)}% dari belanja
                      </span>
                    </div>
                  </div>
                )}

                {/* Status Kepatuhan Anggaran */}
                {budgetStats.total > 0 && (
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-surface border border-border shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                        <Target className="w-5 h-5 text-slate-700" aria-hidden="true" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-muted">Kepatuhan Anggaran</span>
                        <span className="text-sm font-bold text-text">
                          {budgetStats.safeCount} dari {budgetStats.total} kategori aman
                        </span>
                      </div>
                    </div>
                    {budgetStats.overCount > 0 ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        {budgetStats.overCount} over-budget
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        100% terkendali
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer Aksi */}
          <div className="p-4 border-t border-border bg-surface shrink-0 flex items-center gap-3">
            <button
              type="button"
              onClick={handleCopySummary}
              disabled={isLoading}
              className="flex-1 h-12 rounded-xl border border-border bg-surface text-text text-sm font-semibold hover:bg-surface-muted active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Salin Ringkasan</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 rounded-xl bg-accent text-accent-ink text-sm font-bold hover:bg-accent/90 active:scale-[0.98] transition-all flex items-center justify-center"
            >
              Tutup
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export function openMonthlyWrapup() {
  window.dispatchEvent(new CustomEvent("uangku:open-monthly-wrapup"));
}
