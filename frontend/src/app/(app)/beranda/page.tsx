"use client";

import { useEffect, useState, createElement } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, MotionConfig } from "motion/react";
import { ApiResponseError } from "@/lib/api";
import { getDashboardSummary, getDashboardMetrics } from "@/lib/dashboard";
import { getCategoryIcon } from "@/lib/category-icons";
import { generateWeeklyReflection } from "@/lib/reflection";
import { calculateStreak } from "@/lib/streak";
import { getMe } from "@/lib/auth";
import { getPayday } from "@/lib/local-storage";
import type { DashboardMetrics, DashboardSummary, RecentTransactionItem, User } from "@/lib/types";
import { formatRupiah, formatDate } from "@/lib/format";
import { SpendingDonut } from "@/components/dashboard/SpendingDonut";
import { BudgetWarning } from "@/components/dashboard/BudgetWarning";
import { Header } from "@/components/dashboard/Header";
import { BalanceCard } from "@/components/dashboard/BalanceCard";
import { SafeToSpendCard } from "@/components/dashboard/SafeToSpendCard";
import { MonthNavigator } from "@/components/dashboard/MonthNavigator";

export default function BerandaPage() {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = useState(currentMonth);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
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
    ])
      .then(([currentUser, summary, metricsData]) => {
        if (!cancelled) {
          setUser(currentUser);
          setData(summary);
          setMetrics(metricsData);
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

  function prevMonth() {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  function nextMonth() {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const isCurrentMonth = month === currentMonth;

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

  const hasTransactions = data.recent_transactions && data.recent_transactions.length > 0;
  const hasSpending = data.expense_by_category && data.expense_by_category.length > 0;

  // Derived values — semua dari backend, tidak ada kalkulasi keuangan di frontend
  const streak = calculateStreak(metrics.transaction_dates);
  const weeklyReflection =
    metrics.week_expense_total !== "0.00"
      ? generateWeeklyReflection(
          parseFloat(metrics.week_expense_total),
          metrics.week_top_category ? { name: metrics.week_top_category } : null
        )
      : null;

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col gap-6 pb-4"
      >
        <Header userName={user.email.split("@")[0] || user.email} currentDate={now} />

        <MonthNavigator
          month={month}
          isCurrentMonth={isCurrentMonth}
          onPrevMonth={prevMonth}
          onNextMonth={nextMonth}
        />

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
          />
        )}

        {isCurrentMonth && parseFloat(data.monthly_income) > 0 && (
          <BudgetWarning
            spent={data.monthly_expense}
            limit={data.monthly_income}
            label="Pengeluaran vs pemasukan"
          />
        )}

        {/* Analisis: breakdown kategori (chart) + ringkasan (refleksi, streak) */}
        <section aria-label="Analisis pengeluaran" className="flex flex-col gap-6">
          {hasSpending && (
            <SpendingDonut data={data.expense_by_category} monthlyExpense={data.monthly_expense} />
          )}

          {weeklyReflection && (
            <div className="flex flex-col gap-2 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Refleksi Minggu Ini</span>
              <p className="text-sm leading-relaxed text-slate-900">{weeklyReflection}</p>
            </div>
          )}

          {streak > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">Catat harian:</span>
              <span className="font-semibold text-slate-900">{streak} hari berturut-turut</span>
            </div>
          )}
        </section>

        {/* Activity: Recent Transactions */}
        {hasTransactions ? (
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
          <section className="flex flex-col items-center gap-4 py-12">
            <p className="text-base text-slate-500 text-center max-w-xs">
              Belum ada transaksi. Catat pengeluaran atau pemasukan pertamamu untuk mulai melihat
              kondisi keuangan.
            </p>
            <Link
              href="/transaksi/tambah"
              className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-emerald-600 text-white text-base font-semibold hover:bg-emerald-700 transition-all"
            >
              Tambah transaksi
            </Link>
          </section>
        )}
      </motion.div>
    </MotionConfig>
  );
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
      <div className="flex items-center justify-between">
        <ShimmerBlock className="w-10 h-10 rounded-lg" />
        <ShimmerBlock className="w-32 h-6" />
        <ShimmerBlock className="w-10 h-10 rounded-lg" />
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
