"use client";

import { useEffect, useState, createElement } from "react";
import { CloudOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, MotionConfig } from "motion/react";
import { Minus, TrendingDown, TrendingUp, Flag, Award, ChevronRight } from "lucide-react";
import { ApiResponseError, apiFetch } from "@/lib/api";
import { getDashboardSummary, getDashboardMetrics } from "@/lib/dashboard";
import { listBudgets } from "@/lib/budgets";
import { getCategoryIcon } from "@/lib/category-icons";
import { calculateStreak } from "@/lib/streak";
import { getMe } from "@/lib/auth";
import { getPayday } from "@/lib/local-storage";
import { listTransactions } from "@/lib/transactions";
import type { Budget, DashboardMetrics, DashboardSummary, RecentTransactionItem, User } from "@/lib/types";
import { formatRupiah, formatDate } from "@/lib/format";
import { toMonthKey } from "@/lib/date";
import { Sparkline } from "@/components/dashboard/Sparkline";
import { SpendingDonut } from "@/components/dashboard/SpendingDonut";
import { BudgetWarning } from "@/components/dashboard/BudgetWarning";
import { MochiTip } from "@/components/brand/MochiTip";
import { MochiGuide } from "@/components/brand/MochiGuide";
import { Mascot } from "@/components/brand/Mascot";
import { Header } from "@/components/dashboard/Header";
import { BalanceCard } from "@/components/dashboard/BalanceCard";
import { SafeToSpendCard } from "@/components/dashboard/SafeToSpendCard";
import { QuickAddInline } from "@/components/dashboard/QuickAddInline";
import { QuickAddModal } from "@/components/dashboard/QuickAddModal";
import { IndicatorSpotlightTour } from "@/components/dashboard/IndicatorSpotlightTour";
import { MonthlyWrapupModal } from "@/components/dashboard/MonthlyWrapupModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { haptic } from "@/lib/haptics";

export default function BerandaPage() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    function update() {
      setIsOffline(!navigator.onLine);
    }
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const now = new Date();
  const currentMonth = toMonthKey(now);
  const prevMonth = toMonthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [prevData, setPrevData] = useState<DashboardSummary | null>(null);
  const [hasAnyTransaction, setHasAnyTransaction] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const [isSeedingDemo, setIsSeedingDemo] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [wrapupOpen, setWrapupOpen] = useState(false);

  useEffect(() => {
    function handleOpenWrapup() {
      setWrapupOpen(true);
    }
    function handleGoHome() {
      setWrapupOpen(false);
      setQuickAddOpen(false);
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    }
    window.addEventListener("uangku:open-monthly-wrapup", handleOpenWrapup);
    window.addEventListener("uangku:go-home", handleGoHome);
    return () => {
      window.removeEventListener("uangku:open-monthly-wrapup", handleOpenWrapup);
      window.removeEventListener("uangku:go-home", handleGoHome);
    };
  }, []);

  useEffect(() => {
    if (hasAnyTransaction && !isLoading) {
      if (typeof window !== "undefined" && !localStorage.getItem("uangku:indicator_tour_done")) {
        const timer = setTimeout(() => {
          window.dispatchEvent(new CustomEvent("uangku:open-indicator-tour"));
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [hasAnyTransaction, isLoading]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const payday = getPayday();

    // Kritis dulu (cek 1 baris ikut agar empty-state tak kedip).
    Promise.all([
      getMe(),
      getDashboardSummary(currentMonth, controller.signal),
      getDashboardMetrics(payday, controller.signal),
      listTransactions({ page: 1, page_size: 1, signal: controller.signal })
        .then((res) => res.pagination.total_items > 0)
        .catch(() => false),
    ])
      .then(([currentUser, summary, metricsData, anyTx]) => {
        if (cancelled) return;
        setUser(currentUser);
        setData(summary);
        setMetrics(metricsData);
        setHasAnyTransaction(anyTx);
        setLoadedAt(new Date());
        setIsLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted || cancelled) return;
        if (err instanceof ApiResponseError && err.status === 401) {
          router.push("/masuk");
          return;
        }
        setError("Gagal memuat data.");
        setIsLoading(false);
      });

    // Susulan setelah paint: delta MoM + budget.
    void Promise.all([
      listBudgets(currentMonth).catch(() => ({ items: [], month: null })),
      getDashboardSummary(prevMonth, controller.signal).catch(() => null),
    ]).then(([budgetData, prevSummary]) => {
      if (cancelled) return;
      setBudgets(budgetData.items);
      setPrevData(prevSummary);
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [currentMonth, fetchKey, prevMonth, router]);

  useEffect(() => {
    function handleTxChanged() {
      setFetchKey((k) => k + 1);
    }
    window.addEventListener("uangku:tx-changed", handleTxChanged);
    return () => {
      window.removeEventListener("uangku:tx-changed", handleTxChanged);
    };
  }, []);

  // P1-16: isi contoh data langsung dari empty-state beranda (server 409
  // bila sudah ada transaksi — hanya ditawarkan saat benar-benar kosong).
  async function handleSeedDemo() {
    setIsSeedingDemo(true);
    setDemoError(null);
    try {
      await apiFetch("/api/v1/dashboard/demo-data", { method: "POST" });
      setFetchKey((k) => k + 1);
    } catch {
      setDemoError("Gagal menyiapkan contoh data. Coba lagi.");
    } finally {
      setIsSeedingDemo(false);
    }
  }

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const offlineBanner = isOffline ? (
    <div
      role="status"
      className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-sm font-medium text-amber-800"
    >
      <CloudOff className="w-4 h-4 shrink-0" aria-hidden="true" />
      Offline — data mungkin tidak terbaru.
    </div>
  ) : null;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <p className="text-base text-slate-500 text-center">{error}</p>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => setFetchKey((k) => k + 1)}
          className="px-5 h-11 rounded-xl bg-white border border-slate-200 text-base font-semibold text-slate-900 hover:bg-slate-50 transition-all"
        >
          Coba lagi
        </motion.button>
      </div>
    );
  }

  if (!data || !user || !metrics) return null;

  const updatedLabel = loadedAt
    ? loadedAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    : null;

  const blownBudget = budgets.find((b) => (b.percentage ?? 0) >= 90);
  const hasMonthTransactions = data.recent_transactions && data.recent_transactions.length > 0;
  const streak = calculateStreak(metrics.transaction_dates);
  const showStreakMilestone = streak > 0 && (streak === 7 || streak === 30 || streak % 30 === 0);
  const monthlyExpenseNum = parseFloat(data.monthly_expense) || 0;

  const weekTotal = parseFloat(metrics.week_expense_total) || 0;
  const hasExpense = data.expense_by_category.length > 0 && parseFloat(data.monthly_expense) > 0;

  const prevExpense = prevData ? parseFloat(prevData.monthly_expense) || 0 : 0;
  const momDelta =
    prevExpense > 0 ? ((monthlyExpenseNum - prevExpense) / prevExpense) * 100 : null;

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col gap-4 pb-4 lg:grid lg:grid-cols-6 lg:gap-5 lg:items-start"
      >
        <div className="lg:col-span-6 sticky top-0 z-30 -mx-4 lg:-mx-6 px-4 lg:px-6 py-3 bg-surface/70 backdrop-blur-xl backdrop-saturate-150 border-b border-slate-900/5">
          <Header userName={user.email.split("@")[0] || user.email} currentDate={now} />
        </div>
        {offlineBanner && <div className="lg:col-span-6">{offlineBanner}</div>}

        {hasAnyTransaction ? (
          <>
            <div className="lg:col-span-3">
              <BalanceCard
                balance={data.balance}
                monthly_income={data.monthly_income}
                monthly_expense={data.monthly_expense}
              />
            </div>

            <div className="lg:col-span-3">
              <SafeToSpendCard
                safeToSpendAmount={parseFloat(metrics.safe_to_spend)}
                daysLeft={metrics.days_left}
                remainingBalance={metrics.remaining_balance}
                todayExpense={parseFloat(metrics.today_expense ?? "0") || 0}
              />
            </div>

            <div className="lg:col-span-3">
              <MochiTip
                mood="firm"
                title="Refleksi minggu ini"
                mascotAnimated
                message={
                  weekTotal > 0
                    ? `Habis ${formatRupiah(weekTotal)}${metrics.week_top_category ? `, terbanyak di ${metrics.week_top_category}.` : "."}`
                    : "Belum ada pengeluaran minggu ini. Tenang, catat saja begitu jajan."
                }
              />
            </div>

            <div
              data-tour="streak-card"
              className="flex items-center gap-3 p-4 rounded-xl bg-white border border-slate-100 lg:col-span-3"
            >
              <Mascot size={48} mood={streak > 0 ? "celebrating" : "happy"} variant="bow" />
              <Flag className="w-5 h-5 text-accent shrink-0" aria-hidden="true" />
              <div className="flex flex-col min-w-0">
                <p className="num text-base font-bold text-slate-900">
                  {streak > 0 ? `${streak} hari beruntun` : "Belum ada rentetan"}
                </p>
                <p className="text-xs text-slate-500 truncate">Catat tiap hari biar makin panjang.</p>
              </div>
            </div>

            {metrics.daily_expense_7d && metrics.daily_expense_7d.length === 7 && (
              <div className="p-4 rounded-xl bg-white border border-slate-100 lg:col-span-3">
                <Sparkline data={metrics.daily_expense_7d} label="Pengeluaran 7 hari" />
                <p className="text-xs text-slate-500 mt-2">
                  Total minggu ini{" "}
                  <span className="num font-semibold text-slate-700">{formatRupiah(weekTotal)}</span>
                </p>
              </div>
            )}

            {blownBudget && (
              <div className="lg:col-span-6">
                <MochiTip
                  mood="worried"
                  title="Ups, hampir jebol!"
                  mascotAnimated
                  message={`Kategori ${blownBudget.category_name} sudah ${Math.round(blownBudget.percentage ?? 0)}% dari anggaran. Rem dikit ya?`}
                  action={{ label: "Lihat riwayat", href: "/riwayat" }}
                />
              </div>
            )}

            {showStreakMilestone && (
              <div className="lg:col-span-6">
                <MochiTip
                  mood="celebrating"
                  title={`🔥 ${streak} hari catat!`}
                  message="Keren banget konsistennya. Lanjutkan ya!"
                />
              </div>
            )}

            {momDelta !== null && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-white border border-slate-100 lg:col-span-6">
                {momDelta < 0 ? (
                  <TrendingDown className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden="true" />
                ) : momDelta > 0 ? (
                  <TrendingUp className="w-5 h-5 text-rose-600 shrink-0" aria-hidden="true" />
                ) : (
                  <Minus className="w-5 h-5 text-slate-500 shrink-0" aria-hidden="true" />
                )}
                <div className="flex flex-col min-w-0">
                  <p
                    className={`num text-base font-bold ${
                      momDelta < 0 ? "text-emerald-600" : momDelta > 0 ? "text-rose-600" : "text-slate-900"
                    }`}
                  >
                    {momDelta < 0
                      ? `Turun ${Math.round(Math.abs(momDelta))}%`
                      : momDelta > 0
                        ? `Naik ${Math.round(momDelta)}%`
                        : "Sama seperti bulan lalu"}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    <span className="num">{formatRupiah(monthlyExpenseNum)}</span> bulan ini · <span className="num">{formatRupiah(prevExpense)}</span> bulan lalu
                  </p>
                </div>
              </div>
            )}

            {/* Banner Akses Laporan & Evaluasi Bulanan */}
            <button
              type="button"
              onClick={() => {
                haptic.tap();
                setWrapupOpen(true);
              }}
              className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/50 border border-emerald-100 shadow-sm hover:border-emerald-200 active:scale-[0.99] transition-all text-left lg:col-span-6 cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Award className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                      Evaluasi Keuangan
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-800">
                      Insight
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 truncate">
                    Buka Laporan & Evaluasi Bulan Ini
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden="true" />
            </button>

            {hasExpense && (
              <div
                data-tour={budgets.length === 0 ? "budget-section" : undefined}
                className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 lg:col-span-3"
              >
                <SpendingDonut data={data.expense_by_category} monthlyExpense={data.monthly_expense} />
              </div>
            )}

            {budgets.length > 0 && (
              <section
                data-tour="budget-section"
                className={`flex flex-col gap-3 ${hasExpense ? "lg:col-span-3" : "lg:col-span-6"}`}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-slate-900">Anggaran</h2>
                  <Link href="/pengaturan/kategori" className="text-sm font-medium text-emerald-600 hover:underline">
                    Kelola
                  </Link>
                </div>
                {budgets
                  .filter((b) => b.spent !== null)
                  .map((b) => (
                    <BudgetWarning
                      key={b.category_id}
                      spent={b.spent}
                      limit={b.amount}
                      label={b.category_name}
                    />
                  ))}
              </section>
            )}

            <div className="flex flex-col gap-6 lg:col-span-6">
              {hasMonthTransactions ? (
                <section className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-slate-900">Transaksi terbaru</h2>
                    <Link href="/riwayat" className="text-sm font-medium text-emerald-600 hover:underline">
                      Lihat semua
                    </Link>
                  </div>
                  <div className="flex flex-col divide-y divide-slate-100">
                    {data.recent_transactions.slice(0, 5).map((tx, idx) => (
                      <RecentTxRow key={tx.id} tx={tx} index={idx} />
                    ))}
                  </div>
                </section>
              ) : (
                <EmptyState
                  mood="thinking"
                  mascotSize={88}
                  title="Belum ada catatan bulan ini"
                  description="Mulai dari satu catatan kecil hari ini."
                  actions={
                    <button
                      type="button"
                      onClick={() => {
                        haptic.tap();
                        setQuickAddOpen(true);
                      }}
                      className="inline-flex items-center justify-center h-11 px-5 rounded-xl bg-accent text-accent-ink text-base font-semibold hover:bg-accent/90 active:scale-[0.98] transition-all cursor-pointer"
                    >
                      Catat transaksi
                    </button>
                  }
                />
              )}
            </div>
          </>
        ) : (
          <div className="lg:col-span-6 flex flex-col items-center gap-4 py-12">
            <Mascot size={128} mood="excited" variant="peace" delay={-2.2} />
            <div className="flex flex-col items-center gap-1 text-center">
              <h2 className="text-xl font-bold text-slate-900">Mulai catat keuanganmu</h2>
              <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
                Catat transaksi pertamamu — ringkasan saldo dan batas aman harian akan muncul di sini.
              </p>
            </div>
            <QuickAddInline onSave={() => setFetchKey((k) => k + 1)} />
            <div className="flex items-center gap-4">
              <Link
                href="/transaksi/tambah"
                className="text-sm font-medium text-emerald-600 hover:underline"
              >
                atau isi form lengkap
              </Link>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <button
                type="button"
                onClick={() => void handleSeedDemo()}
                disabled={isSeedingDemo}
                className="text-sm font-medium text-emerald-600 hover:underline disabled:opacity-60 disabled:hover:no-underline"
              >
                {isSeedingDemo ? "Menyiapkan contoh…" : "coba dengan contoh data"}
              </button>
            </div>
            {demoError && (
              <p role="alert" className="text-sm text-danger">
                {demoError}
              </p>
            )}
          </div>
        )}
      </motion.div>
      <p className="text-center text-xs text-slate-500 lg:col-span-6">
        {updatedLabel ? `Diperbarui ${updatedLabel}` : ""}
      </p>
      <QuickAddModal open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
      <MonthlyWrapupModal
        open={wrapupOpen}
        onClose={() => setWrapupOpen(false)}
        earliestMonth={data?.earliest_transaction_date ? data.earliest_transaction_date.slice(0, 7) : null}
      />
      <IndicatorSpotlightTour />
      <MochiGuide />
    </MotionConfig>
  );
}

function RecentTxRow({ tx, index = 0 }: { tx: RecentTransactionItem; index?: number }) {
  const isIncome = tx.type === "income";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.04, 0.2), ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={`/transaksi/${tx.id}`}
        className="flex items-center gap-3 py-3 rounded-xl hover:bg-slate-50 active:bg-slate-100/70 active:scale-[0.985] transition-all duration-150 -mx-4 px-4"
      >
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 shrink-0">
          {createElement(getCategoryIcon(tx.category_name), { className: "w-5 h-5 text-slate-900", "aria-hidden": true })}
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <span className="text-base font-medium text-slate-900 truncate">{tx.category_name}</span>
          {tx.description && <span className="text-sm text-slate-500 truncate">{tx.description}</span>}
          <span className="text-xs text-slate-500">{formatDate(tx.transaction_date)}</span>
        </div>
        <span
          className={`num text-base font-bold shrink-0 ${
            isIncome ? "text-emerald-600" : "text-rose-600"
          }`}
        >
          {isIncome ? "+ " : "- "}
          {formatRupiah(tx.amount)}
        </span>
      </Link>
    </motion.div>
  );
}

function ShimmerBlock({ className }: { className: string }) {
  return (
    <div className={`relative overflow-hidden rounded bg-slate-100 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent" />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-8 pb-4" role="status" aria-label="Memuat data beranda">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <ShimmerBlock className="w-36 h-6" />
          <ShimmerBlock className="w-48 h-4" />
        </div>
        <div className="flex gap-3">
          <ShimmerBlock className="w-10 h-10 rounded-lg" />
          <ShimmerBlock className="w-10 h-10 rounded-lg" />
        </div>
      </div>
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6 flex flex-col gap-4">
        <ShimmerBlock className="w-24 h-4" />
        <ShimmerBlock className="w-56 h-9" />
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
          <ShimmerBlock className="w-28 h-7" />
          <ShimmerBlock className="w-28 h-7" />
        </div>
      </div>
      <div className="rounded-2xl bg-emerald-50/70 border border-emerald-100 p-6 flex flex-col gap-4">
        <ShimmerBlock className="w-44 h-5" />
        <ShimmerBlock className="w-48 h-8" />
        <ShimmerBlock className="w-32 h-5" />
      </div>
      <div className="flex flex-col gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <ShimmerBlock className="w-10 h-10 rounded-xl" />
            <div className="flex-1 flex flex-col gap-1.5">
              <ShimmerBlock className="w-24 h-4" />
              <ShimmerBlock className="w-32 h-3" />
            </div>
            <ShimmerBlock className="w-20 h-5" />
          </div>
        ))}
      </div>
    </div>
  );
}