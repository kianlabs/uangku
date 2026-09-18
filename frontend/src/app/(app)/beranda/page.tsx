"use client";

import { useEffect, useState } from "react";
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
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    getDashboardSummary(month, controller.signal)
      .then(setData)
      .catch(() => {
        if (controller.signal.aborted) return;
        setError("Gagal memuat data. Coba lagi.");
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [month, fetchKey]);

  function prevMonth() {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    setIsLoading(true);
    setError(null);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  function nextMonth() {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m, 1);
    setIsLoading(true);
    setError(null);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const isCurrentMonth = month === currentMonth;

  return (
    <div className="flex flex-col gap-6">
      {/* Month selector */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          aria-label="Bulan sebelumnya"
          className="flex items-center justify-center w-9 h-9 rounded-lg text-muted hover:text-text hover:bg-surface-muted transition-colors"
        >
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span aria-live="polite" className="text-sm font-medium text-text">
          {new Date(month + "-01").toLocaleDateString("id-ID", {
            month: "long",
            year: "numeric",
          })}
        </span>
        <button
          onClick={nextMonth}
          disabled={isCurrentMonth}
          aria-label="Bulan berikutnya"
          className="flex items-center justify-center w-9 h-9 rounded-lg text-muted hover:text-text hover:bg-surface-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center py-12" aria-label="Memuat…">
          <svg
            aria-hidden="true"
            className="animate-spin h-6 w-6 text-accent"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-danger flex items-center justify-between gap-3">
          <span>{error}</span>
          <button
            onClick={() => { setIsLoading(true); setError(null); setFetchKey((k) => k + 1); }}
            className="shrink-0 font-medium text-danger underline underline-offset-2"
          >
            Coba lagi
          </button>
        </div>
      )}
      {/* Dashboard content */}
      {data && !isLoading && (
        <>
          {/* Balance Section */}
          <div className="flex flex-col gap-1 py-2">
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Saldo Saat Ini</span>
            <span className="text-4xl font-extrabold tracking-tight text-text tabular-nums">
              {formatRupiah(data.balance)}
            </span>
          </div>

          {/* Income/Expense summary */}
          <div className="grid grid-cols-2 gap-4 border-y border-border py-4">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider flex items-center gap-1">
                <svg
                  aria-hidden="true"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
                Pemasukan
              </span>
              <span className="text-lg font-bold tabular-nums text-income">
                + {formatRupiah(data.monthly_income)}
              </span>
            </div>
            <div className="flex flex-col gap-1 border-l border-border pl-4">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider flex items-center gap-1">
                <svg
                  aria-hidden="true"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14M19 12l-7 7-7-7" />
                </svg>
                Pengeluaran
              </span>
              <span className="text-lg font-bold tabular-nums text-expense">
                - {formatRupiah(data.monthly_expense)}
              </span>
            </div>
          </div>

          {/* Expense by category */}
          {data.expense_by_category.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-[11px] font-bold text-muted uppercase tracking-wider">
                Pengeluaran per Kategori
              </h2>
              <div className="flex flex-col gap-3">
                {data.expense_by_category.map((item) => (
                  <div key={item.category_id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-text font-medium truncate">
                          {item.category_name}
                        </span>
                        <span className="tabular-nums text-muted font-medium ml-2 shrink-0">
                          {formatRupiah(item.amount)}
                        </span>
                      </div>
                      <div className="h-1 rounded-[2px] bg-surface-muted overflow-hidden">
                        <div
                          className="h-full rounded-[2px] bg-accent transition-all"
                          style={{
                            width: `${Math.min(item.percentage, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-[11px] text-muted font-bold tabular-nums w-10 text-right shrink-0">
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Recent transactions */}
          {data.recent_transactions.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-[11px] font-bold text-muted uppercase tracking-wider">
                Transaksi Terbaru
              </h2>
              <div className="flex flex-col divide-y divide-border border-t border-b border-border">
                {data.recent_transactions.map((tx) => (
                  <RecentTxRow
                    key={tx.id}
                    tx={tx}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {data.transaction_count === 0 && (
            <div className="flex flex-col items-center gap-3 py-8">
              <p className="text-sm text-muted text-center">
                Belum ada transaksi di bulan ini.
              </p>
              <Link
                href="/transaksi/tambah"
                className="inline-flex items-center gap-2 px-4 h-10 border border-border rounded-lg bg-surface text-sm font-medium text-text hover:bg-surface-muted transition-colors"
              >
                <svg
                  aria-hidden="true"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                  stroke="currentColor"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Tambah transaksi
              </Link>
            </div>
          )}

          {/* View all transactions link */}
          {data.transaction_count > data.recent_transactions.length && (
            <Link
              href="/riwayat"
              className="text-sm font-medium text-accent hover:underline"
            >
              Lihat semua transaksi →
            </Link>
          )}
        </>
      )}
    </div>
  );
}

function RecentTxRow({ tx }: { tx: RecentTransactionItem }) {
  return (
    <div className="flex items-center gap-3.5 py-3.5">
      <div className="w-10 h-10 rounded-[11px] bg-surface-muted flex items-center justify-center shrink-0 text-muted">
        {tx.type === "income" ? (
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        ) : (
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text truncate">
          {tx.description || tx.category_name}
        </p>
        {tx.description && (
          <p className="text-xs text-muted truncate mt-0.5">{tx.category_name}</p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p
          className={`text-sm font-bold tabular-nums ${
            tx.type === "income" ? "text-income" : "text-expense"
          }`}
        >
          {tx.type === "income" ? "+ " : "- "}
          {formatRupiah(tx.amount)}
        </p>
        <p className="text-[11px] text-muted mt-0.5">
          {formatDate(tx.transaction_date)}
        </p>
      </div>
    </div>
  );
}

function formatRupiah(value: string): string {
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}
