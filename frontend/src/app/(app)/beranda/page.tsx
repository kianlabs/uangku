"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getDashboardSummary } from "@/lib/dashboard";
import type { DashboardSummary, RecentTransactionItem } from "@/lib/types";

export default function BerandaPage() {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [data, setData] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState(currentMonth);

  const load = useCallback(async (m: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getDashboardSummary(m);
      setData(res);
    } catch {
      setError("Gagal memuat data. Coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load(month);
  }, [month, load]);

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

  return (
    <div className="flex flex-col gap-6">
      {/* Month navigator */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          aria-label="Bulan sebelumnya"
          className="flex items-center justify-center w-9 h-9 rounded-lg text-muted hover:text-text hover:bg-surface-muted transition-colors"
        >
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span className="text-sm font-medium text-text">
          {new Date(month + "-01").toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
        </span>
        <button
          onClick={nextMonth}
          disabled={isCurrentMonth}
          aria-label="Bulan berikutnya"
          className="flex items-center justify-center w-9 h-9 rounded-lg text-muted hover:text-text hover:bg-surface-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12" aria-label="Memuat…">
          <svg aria-hidden="true" className="animate-spin h-6 w-6 text-accent" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        </div>
      )}

      {error && !isLoading && (
        <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {data && !isLoading && (
        <>
          {/* Balance card */}
          <div className="rounded-2xl bg-accent text-accent-ink px-5 py-5 flex flex-col gap-1">
            <span className="text-xs font-medium opacity-70">Saldo saat ini</span>
            <span className="text-3xl font-semibold tabular-nums">
              {formatRupiah(data.balance)}
            </span>
          </div>

          {/* Monthly summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-surface border border-border px-4 py-3 flex flex-col gap-1">
              <span className="text-xs text-muted">Pemasukan</span>
              <span className="text-base font-semibold tabular-nums text-income">
                {formatRupiah(data.monthly_income)}
              </span>
            </div>
            <div className="rounded-xl bg-surface border border-border px-4 py-3 flex flex-col gap-1">
              <span className="text-xs text-muted">Pengeluaran</span>
              <span className="text-base font-semibold tabular-nums text-expense">
                {formatRupiah(data.monthly_expense)}
              </span>
            </div>
          </div>

          {/* Expense by category */}
          {data.expense_by_category.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-text mb-3">Pengeluaran per Kategori</h2>
              <div className="flex flex-col gap-2">
                {data.expense_by_category.map((item) => (
                  <div key={item.category_id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-text truncate">{item.category_name}</span>
                        <span className="tabular-nums text-muted ml-2 shrink-0">{formatRupiah(item.amount)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-accent transition-all"
                          style={{ width: `${Math.min(item.percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-muted tabular-nums w-10 text-right shrink-0">
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Recent transactions */}
          {data.recent_transactions.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-text mb-3">Transaksi Terbaru</h2>
              <div className="flex flex-col gap-0 rounded-xl border border-border overflow-hidden">
                {data.recent_transactions.map((tx, i) => (
                  <RecentTxRow
                    key={tx.id}
                    tx={tx}
                    isLast={i === data.recent_transactions.length - 1}
                  />
                ))}
              </div>
            </section>
          )}

          {data.transaction_count === 0 && (
            <div className="flex flex-col items-center gap-3 py-8">
              <p className="text-sm text-muted text-center">
                Belum ada transaksi bulan ini.
              </p>
              <Link
                href="/transaksi/tambah"
                className="inline-flex items-center gap-2 px-4 h-10 rounded-[11px] border border-border bg-surface text-sm font-medium text-text hover:bg-surface-muted transition-colors"
              >
                <svg
                  aria-hidden="true"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Tambah Transaksi
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RecentTxRow({ tx, isLast }: { tx: RecentTransactionItem; isLast: boolean }) {
  return (
    <div className={`flex items-center gap-3 bg-surface px-4 py-3 ${!isLast ? "border-b border-border" : ""}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          tx.type === "income" ? "bg-[#DCFCE7]" : "bg-[#FEE2E2]"
        }`}
      >
        {tx.type === "income" ? (
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#14532D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        ) : (
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#991B1B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text truncate">{tx.description ?? tx.category_name}</p>
        <p className="text-xs text-muted">{tx.category_name}</p>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-sm font-medium tabular-nums ${tx.type === "income" ? "text-income" : "text-expense"}`}>
          {tx.type === "income" ? "+" : "-"}{formatRupiah(tx.amount)}
        </p>
        <p className="text-xs text-muted">{formatDate(tx.transaction_date)}</p>
      </div>
    </div>
  );
}

function formatRupiah(amount: string): string {
  const num = parseFloat(amount);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}
