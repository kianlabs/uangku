"use client";

import { useEffect, useState, createElement } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, MotionConfig } from "motion/react";
import { ApiResponseError } from "@/lib/api";
import { getDashboardSummary, getDashboardMetrics } from "@/lib/dashboard";
import { listBudgets } from "@/lib/budgets";
import { getCategoryIcon } from "@/lib/category-icons";
import { calculateStreak } from "@/lib/streak";
import { getMe } from "@/lib/auth";
import { getPayday } from "@/lib/local-storage";
import { listTransactions } from "@/lib/transactions";
import type { Budget, DashboardMetrics, DashboardSummary, RecentTransactionItem, User } from "@/lib/types";
import { formatRupiah, formatDate } from "@/lib/format";
import { SpendingDonut } from "@/components/dashboard/SpendingDonut";
import { BudgetWarning } from "@/components/dashboard/BudgetWarning";
import { MochiTip } from "@/components/brand/MochiTip";
import { MochiGuide } from "@/components/brand/MochiGuide";
import { Mascot } from "@/components/brand/Mascot";
import { Header } from "@/components/dashboard/Header";
import { BalanceCard } from "@/components/dashboard/BalanceCard";
import { SafeToSpendCard } from "@/components/dashboard/SafeToSpendCard";
import { QuickAddInline } from "@/components/dashboard/QuickAddInline";

export default function BerandaPage() {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = useState(currentMonth);
  const isCurrentMonth = month === currentMonth;
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [hasAnyTransaction, setHasAnyTransaction] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const payday = getPayday();

    Promise.all([
      getMe(),
      getDashboardSummary(month, controller.signal),
      getDashboardMetrics(payday, controller.signal),
      listBudgets(month).catch(() => ({ items: [], month: null })),
      listTransactions({ page: 1, page_size: 1, signal: controller.signal })
        .then((res) => res.pagination.total_items > 0)
        .catch(() => false),
    ])
      .then(([currentUser, summary, metricsData, budgetData, anyTx]) => {
        if (!cancelled) {
          setUser(currentUser);
          setData(summary);
          setMetrics(metricsData);
          setBudgets(budgetData.items);
          setHasAnyTransaction(anyTx);
          setIsLoading(false);
        }
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

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [month, fetchKey, router]);

  useEffect(() => {
    function handleTxChanged() {
      setFetchKey((k) => k + 1);
    }
    window.addEventListener("uangku:tx-changed", handleTxChanged);
    return () => {
      window.removeEventListener("uangku:tx-changed", handleTxChanged);
    };
  }, []);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

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

  const blownBudget = budgets.find((b) => (b.percentage ?? 0) >= 90);

  const hasMonthTransactions = data.recent_transactions && data.recent_transactions.length > 0;

  const streak = calculateStreak(metrics.transaction_dates);
  const showStreakMilestone = isCurrentMonth && streak > 0 && (streak === 7 || streak === 30 || streak % 30 === 0);

  const monthFull = monthFullLabel(month);

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col gap-6 pb-4 lg:grid lg:grid-cols-5 lg:gap-8 lg:items-start"
      >
        <div className="lg:col-span-5 sticky top-0 z-30 -mx-4 lg:-mx-6 px-4 lg:px-6 py-3 bg-surface/70 backdrop-blur-xl backdrop-saturate-150 border-b border-slate-900/5">
          <Header userName={user.email.split("@")[0] || user.email} currentDate={now} />
        </div>

        {hasAnyTransaction ? (
          <>
            <div className="flex flex-col gap-6 lg:col-span-3">
              <div className="flex items-center justify-between -mb-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsLoading(true);
                    setMonth((m) => shiftMonth(m, -1));
                  }}
                  aria-label="Bulan sebelumnya"
                  className="flex items-center justify-center w-11 h-11 rounded-xl text-slate-900 hover:bg-slate-100 active:scale-95 transition-all"
                >
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Ringkasan · {monthFull}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsLoading(true);
                    setMonth((m) => shiftMonth(m, 1));
                  }}
                  disabled={isCurrentMonth}
                  aria-label="Bulan berikutnya"
                  className="flex items-center justify-center w-11 h-11 rounded-xl text-slate-900 hover:bg-slate-100 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
                >
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>
              <BalanceCard
                balance={data.balance}
                monthly_income={data.monthly_income}
                monthly_expense={data.monthly_expense}
              />

              {isCurrentMonth && (
                <SafeToSpendCard
                  safeToSpendAmount={parseFloat(metrics.safe_to_spend)}
                  daysLeft={metrics.days_left}
                  remainingBalance={metrics.remaining_balance}
                  todayExpense={parseFloat(metrics.today_expense ?? "0") || 0}
                />
              )}

              {blownBudget && (
                <MochiTip
                  mood="worried"
                  title="Ups, hampir jebol!"
                  message={`Kategori ${blownBudget.category_name} sudah ${Math.round(blownBudget.percentage ?? 0)}% dari anggaran. Rem dikit ya?`}
                  action={{ label: "Lihat riwayat", href: "/riwayat" }}
                />
              )}

              {showStreakMilestone && (
                <MochiTip
                  mood="celebrating"
                  title={`🔥 ${streak} hari catat!`}
                  message="Keren banget konsistennya. Lanjutkan ya!"
                />
              )}

              <SpendingDonut data={data.expense_by_category} monthlyExpense={data.monthly_expense} />

              {budgets.length > 0 && (
                <section className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-slate-900">Anggaran</h2>
                    <Link href="/akun/kategori" className="text-sm font-medium text-emerald-600 hover:underline">
                      Kelola
                    </Link>
                  </div>
                  {budgets.map((b) => (
                    <BudgetWarning
                      key={b.category_id}
                      spent={b.spent ?? "0"}
                      limit={b.amount}
                      label={b.category_name}
                    />
                  ))}
                </section>
              )}
            </div>

            <div className="flex flex-col gap-6 lg:col-span-2 lg:sticky lg:top-24">
              {hasMonthTransactions ? (
                <section className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-slate-900">Transaksi terbaru</h2>
                    <Link href="/riwayat" className="text-sm font-medium text-emerald-600 hover:underline">
                      Lihat semua
                    </Link>
                  </div>
                  <div className="flex flex-col divide-y divide-slate-100">
                    {data.recent_transactions.slice(0, 5).map((tx) => (
                      <RecentTxRow key={tx.id} tx={tx} />
                    ))}
                  </div>
                </section>
              ) : (
                <p className="text-sm text-slate-500 text-center py-8">
                  Belum ada catatan pada {monthFull}.
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="lg:col-span-5 flex flex-col items-center gap-4 py-12">
            <Mascot size={128} mood="excited" delay={-2.2} />
            <div className="flex flex-col items-center gap-1 text-center">
              <h2 className="text-xl font-bold text-slate-900">Mulai catat keuanganmu</h2>
              <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
                Catat transaksi pertamamu — ringkasan saldo dan batas aman harian akan muncul di sini.
              </p>
            </div>
            <QuickAddInline onSave={() => setFetchKey((k) => k + 1)} />
            <Link
              href="/transaksi/tambah"
              className="text-sm font-medium text-emerald-600 hover:underline"
            >
              atau isi form lengkap
            </Link>
          </div>
        )}
      </motion.div>
      <MochiGuide />
    </MotionConfig>
  );
}

const MONTH_NAMES_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function monthFullLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return month;
  return `${MONTH_NAMES_ID[m - 1]} ${y}`;
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function RecentTxRow({ tx }: { tx: RecentTransactionItem }) {
  const isIncome = tx.type === "income";
  return (
    <Link
      href={`/transaksi/${tx.id}`}
      className="flex items-center gap-3 py-3 hover:bg-slate-50 active:bg-slate-50 transition-colors -mx-4 px-4"
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 shrink-0">
        {createElement(getCategoryIcon(tx.category_name), { className: "w-5 h-5 text-slate-900", "aria-hidden": true })}
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="text-base font-medium text-slate-900 truncate">{tx.category_name}</span>
        {tx.description && <span className="text-sm text-slate-500 truncate">{tx.description}</span>}
        <span className="text-xs text-slate-400">{formatDate(tx.transaction_date)}</span>
      </div>
      <span
        className={`text-base font-bold tabular-nums shrink-0 ${
          isIncome ? "text-emerald-600" : "text-rose-600"
        }`}
      >
        {isIncome ? "+ " : "- "}
        {formatRupiah(tx.amount)}
      </span>
    </Link>
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