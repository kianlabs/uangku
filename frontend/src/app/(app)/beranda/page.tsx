"use client";

import { useEffect, useState, createElement } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiResponseError } from "@/lib/api";
import { getDashboardSummary } from "@/lib/dashboard";
import { calculateSafeToSpend } from "@/lib/safe-to-spend";
import { calculateStreak } from "@/lib/streak";
import { getCategoryIcon } from "@/lib/category-icons";
import { getWeekExpense, generateWeeklyReflection } from "@/lib/reflection";
import { listTransactions } from "@/lib/transactions";
import type { DashboardSummary, RecentTransactionItem, Transaction } from "@/lib/types";
import { formatRupiah, formatDate } from "@/lib/format";
import { SpendingDonut } from "@/components/dashboard/SpendingDonut";
import { BudgetWarning } from "@/components/dashboard/BudgetWarning";
import { getBudgetWarningData } from "@/lib/budget-helper";

export default function BerandaPage() {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = useState(currentMonth);
  const router = useRouter();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [transactionHistory, setTransactionHistory] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    Promise.all([getDashboardSummary(month, controller.signal), loadMetricTransactions()])
      .then(([summary, transactions]) => {
        if (!cancelled) {
          setData(summary);
          setTransactionHistory(transactions);
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
        <p className="text-base text-muted text-center">{error}</p>
        <button
          onClick={() => setFetchKey((k) => k + 1)}
          className="px-5 h-11 rounded-xl bg-surface border border-border text-base font-semibold text-text hover:bg-surface-muted active:scale-[0.98] transition-all"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  if (!data) return null;

  const hasTransactions = data.recent_transactions && data.recent_transactions.length > 0;
  const hasSpending = data.expense_by_category && data.expense_by_category.length > 0;
  const metricTransactions = transactionHistory.map((tx) => ({
    amount: tx.amount,
    transaction_date: tx.transaction_date,
    type: tx.type,
    category_name: tx.category.name,
  }));
  const streak = calculateStreak(transactionHistory.map((tx) => tx.transaction_date));
  const weeklyExpense = getWeekExpense(metricTransactions);
  const budgetWarning = getBudgetWarningData(data.expense_by_category);

  return (
    <div className="flex flex-col gap-6 pb-4">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          aria-label="Bulan sebelumnya"
          className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-surface-muted active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent"
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
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-text">
          {new Date(month + "-01").toLocaleDateString("id-ID", {
            month: "long",
            year: "numeric",
          })}
        </span>
        <button
          onClick={nextMonth}
          disabled={isCurrentMonth}
          aria-label="Bulan berikutnya"
          className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-surface-muted active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent"
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
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* Balance - focal point */}
      <div className="flex flex-col gap-3">
        <span className="text-xs font-semibold text-muted uppercase tracking-wide">Saldo keseluruhan</span>
        <span className="text-5xl leading-tight font-bold text-text tabular-nums">
          {formatRupiah(data.balance)}
        </span>
        <p className="text-xs text-muted leading-relaxed">Seluruh waktu hingga bulan ini.</p>
      </div>

      {/* Safe to Spend Today */}
      {isCurrentMonth && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-muted uppercase tracking-wide">Aman dipakai hari ini</span>
          <span className="text-3xl leading-tight font-bold text-text tabular-nums">
            {(() => {
              const now = new Date();
              const mandatory = data.expense_by_category.find((c) => c.category_name === "Tagihan")?.amount || "0";
              const { amount } = calculateSafeToSpend(
                data.monthly_income,
                data.monthly_expense,
                mandatory,
                now.getDate(),
                now.getMonth() + 1,
                now.getFullYear()
              );
              return amount > 0 ? formatRupiah(amount.toFixed(2)) : "Rp 0";
            })()}
          </span>
          <p className="text-xs text-muted leading-relaxed">
            (pemasukan − pengeluaran − tagihan) / sisa hari
          </p>
        </div>
      )}

      {/* Income/Expense summary */}
      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-income font-semibold text-sm">
            <svg
              aria-hidden="true"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
            <span>Pemasukan</span>
          </div>
          <span className="text-xl sm:text-2xl font-bold tabular-nums text-income whitespace-nowrap">
            + {formatRupiah(data.monthly_income)}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-expense font-semibold text-sm">
            <svg
              aria-hidden="true"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
            <span>Pengeluaran</span>
          </div>
          <span className="text-xl sm:text-2xl font-bold tabular-nums text-expense whitespace-nowrap">
            - {formatRupiah(data.monthly_expense)}
          </span>
        </div>
      </div>
      {/* Streak */}
      {streak > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted">Catat harian:</span>
          <span className="font-semibold text-text">{streak} hari berturut-turut</span>
        </div>
      )}

      {/* Weekly Reflection */}
      {weeklyExpense.total > 0 && (
        <div className="flex flex-col gap-2 p-4 rounded-xl border border-border bg-surface">
          <span className="text-xs font-medium text-muted uppercase tracking-wide">Refleksi Minggu Ini</span>
          <p className="text-sm text-text">
            {generateWeeklyReflection(weeklyExpense.total, weeklyExpense.topCategory)}
          </p>
        </div>
      )}

      {/* Budget Warning Card */}
      {budgetWarning && (
        <BudgetWarning
          categoryName={budgetWarning.categoryName}
          percent={budgetWarning.percent}
          remainingText={budgetWarning.remainingText}
        />
      )}

      {/* Spending Donut Chart */}
      {hasSpending && <SpendingDonut data={data.expense_by_category} monthlyExpense={data.monthly_expense} />}

      {/* Recent transactions */}
      {hasTransactions ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-text">Transaksi terbaru</h2>
            <Link href="/riwayat" className="text-sm font-medium text-accent hover:underline">
              Lihat semua
            </Link>
          </div>
          <div className="flex flex-col divide-y divide-border">
            {data.recent_transactions.slice(0, 5).map((tx) => (
              <RecentTxRow key={tx.id} tx={tx} />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-base text-muted text-center max-w-xs">
            Belum ada transaksi. Catat pengeluaran atau pemasukan pertamamu untuk mulai melihat
            kondisi keuangan.
          </p>
          <Link
            href="/transaksi/tambah"
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-accent text-accent-ink text-base font-semibold hover:bg-accent/90 active:scale-[0.98] transition-all"
          >
            Tambah transaksi
          </Link>
        </div>
      )}
    </div>
  );
}

async function loadMetricTransactions(): Promise<Transaction[]> {
  const pageSize = 100;
  const limit = 500;
  const now = new Date();
  const cutoff = localDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 60));
  const transactions: Transaction[] = [];

  for (let page = 1; transactions.length < limit; page++) {
    const response = await listTransactions({ page, page_size: pageSize });
    transactions.push(...response.items);

    const oldest = response.items.reduce<string | null>((min, tx) => {
      const date = tx.transaction_date.slice(0, 10);
      return min === null || date < min ? date : min;
    }, null);

    if (
      response.items.length === 0 ||
      page >= response.pagination.total_pages ||
      (oldest !== null && oldest <= cutoff)
    ) {
      break;
    }
  }

  return transactions.slice(0, limit);
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function RecentTxRow({ tx }: { tx: RecentTransactionItem }) {
  const isIncome = tx.type === "income";
  return (
    <Link
      href={`/transaksi/${tx.id}`}
      className="flex items-center gap-3 py-3 hover:bg-surface-muted active:bg-surface-muted transition-colors -mx-4 px-4"
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-surface-muted shrink-0">
        {createElement(getCategoryIcon(tx.category_name), { className: "w-5 h-5 text-text", "aria-hidden": true })}
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="text-base font-medium text-text truncate">{tx.category_name}</span>
        {tx.description && <span className="text-sm text-muted truncate">{tx.description}</span>}
        <span className="text-xs text-muted">{formatDate(tx.transaction_date)}</span>
      </div>
      <span
        className={`text-base font-bold tabular-nums shrink-0 ${
          isIncome ? "text-income" : "text-expense"
        }`}
      >
        {isIncome ? "+ " : "- "}
        {formatRupiah(tx.amount)}
      </span>
    </Link>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-8 pb-4">
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 bg-surface-muted rounded-lg animate-pulse" />
        <div className="w-32 h-6 bg-surface-muted rounded animate-pulse" />
        <div className="w-9 h-9 bg-surface-muted rounded-lg animate-pulse" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="w-16 h-5 bg-surface-muted rounded animate-pulse" />
        <div className="w-56 h-12 bg-surface-muted rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <div className="w-24 h-5 bg-surface-muted rounded animate-pulse" />
          <div className="w-32 h-7 bg-surface-muted rounded animate-pulse" />
        </div>
        <div className="flex flex-col gap-2">
          <div className="w-24 h-5 bg-surface-muted rounded animate-pulse" />
          <div className="w-32 h-7 bg-surface-muted rounded animate-pulse" />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <div className="w-10 h-10 bg-surface-muted rounded-xl animate-pulse" />
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="w-24 h-4 bg-surface-muted rounded animate-pulse" />
              <div className="w-32 h-3 bg-surface-muted rounded animate-pulse" />
            </div>
            <div className="w-20 h-5 bg-surface-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}


