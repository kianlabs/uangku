"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { listTransactions } from "@/lib/transactions";
import type { Transaction, TransactionType } from "@/lib/types";
import { getTransactionSource, getDebtTag } from "@/lib/local-storage";
import { formatRupiah, formatDate } from "@/lib/format";

const PAGE_SIZE = 20;

type FilterType = "all" | TransactionType;

export default function RiwayatPage() {
  const [items, setItems] = useState<Transaction[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<FilterType>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [debtFilter, setDebtFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveClientFilter = sourceFilter !== "all" || debtFilter !== "all";

  const filteredItems = useMemo(() => {
    let result = items;
    if (sourceFilter !== "all") {
      result = result.filter((tx) => getTransactionSource(tx.id) === sourceFilter);
    }
    if (debtFilter === "utang" || debtFilter === "piutang") {
      result = result.filter((tx) => {
        const debt = getDebtTag(tx.id);
        return debt?.tag === debtFilter;
      });
    } else if (debtFilter === "belum-lunas") {
      result = result.filter((tx) => {
        const debt = getDebtTag(tx.id);
        return debt && !debt.settled;
      });
    }
    return result;
  }, [items, sourceFilter, debtFilter]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    async function fetchPage() {
      setError(null);
      try {
        if (sourceFilter !== "all" || debtFilter !== "all") {
          const allItems: Transaction[] = [];
          const MAX_PAGES = 10;
          for (let i = 1; i <= MAX_PAGES; i++) {
            if (cancelled || controller.signal.aborted) break;
            const res = await listTransactions({
              page: i,
              page_size: PAGE_SIZE,
              type: filter === "all" ? undefined : filter,
              signal: controller.signal,
            });
            allItems.push(...res.items);
            if (i >= res.pagination.total_pages) break;
          }
          if (!cancelled && !controller.signal.aborted) {
            setItems(allItems);
            setTotalPages(1);
          }
        } else {
          const res = await listTransactions({
            page,
            page_size: PAGE_SIZE,
            type: filter === "all" ? undefined : filter,
            signal: controller.signal,
          });
          if (!cancelled && !controller.signal.aborted) {
            setItems(res.items);
            setTotalPages(res.pagination.total_pages);
          }
        }
      } catch {
        if (!cancelled && !controller.signal.aborted) setError("Gagal memuat transaksi.");
      } finally {
        if (!cancelled && !controller.signal.aborted) setIsLoading(false);
      }
    }
    fetchPage();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [page, filter, sourceFilter, debtFilter, reloadKey]);

  function handleFilterChange(f: FilterType) {
    setIsLoading(true);
    setFilter(f);
    setPage(1);
  }

  function handleSourceFilter(s: string) {
    setIsLoading(true);
    setPage(1);
    setSourceFilter(s);
  }

  function handleDebtFilter(d: string) {
    setIsLoading(true);
    setPage(1);
    setDebtFilter(d);
  }

  function handleResetFilter() {
    setSourceFilter("all");
    setDebtFilter("all");
  }

  function handleRetry() {
    setIsLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  }

  function handlePrevPage() {
    setIsLoading(true);
    setError(null);
    setPage((p) => Math.max(1, p - 1));
  }

  function handleNextPage() {
    setIsLoading(true);
    setError(null);
    setPage((p) => Math.min(totalPages, p + 1));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">Riwayat</h1>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          aria-expanded={showFilters}
          className="inline-flex items-center gap-1.5 px-3 h-9 rounded-xl border border-border bg-surface text-sm font-medium text-text hover:bg-surface-muted transition-colors md:hidden"
        >
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          Filter {hasActiveClientFilter || filter !== "all" ? "•" : ""}
        </button>
      </div>

      {/* Filter chips - collapsible on mobile */}
      <div className={`flex flex-col gap-3 ${showFilters ? "flex" : "hidden md:flex"}`}>
        <div className="flex flex-wrap gap-2">
          {(["all", "income", "expense"] as const).map((f) => (
            <button
              key={f}
              onClick={() => handleFilterChange(f)}
              className={`px-4 h-9 rounded-full text-sm font-medium transition-all ${
                filter === f
                  ? "bg-accent text-accent-ink"
                  : "bg-surface-muted text-text hover:bg-surface-muted/80 active:scale-95"
              }`}
            >
              {f === "all" ? "Semua" : f === "income" ? "Pemasukan" : "Pengeluaran"}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {(["all", "Tunai", "Bank", "E-wallet"] as const).map((s) => (
            <button
              key={s}
              onClick={() => handleSourceFilter(s === "all" ? "all" : s)}
              className={`px-4 h-9 rounded-full text-sm font-medium transition-all ${
                sourceFilter === (s === "all" ? "all" : s)
                  ? "bg-accent text-accent-ink"
                  : "bg-surface-muted text-text hover:bg-surface-muted/80 active:scale-95"
              }`}
            >
              {s === "all" ? "Semua Sumber" : s}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {(["all", "utang", "piutang", "belum-lunas"] as const).map((d) => (
            <button
              key={d}
              onClick={() => handleDebtFilter(d)}
              className={`px-4 h-9 rounded-full text-sm font-medium transition-all ${
                debtFilter === d
                  ? "bg-accent text-accent-ink"
                  : "bg-surface-muted text-text hover:bg-surface-muted/80 active:scale-95"
              }`}
            >
              {d === "all" ? "Semua Kasbon" : d === "utang" ? "Utang" : d === "piutang" ? "Piutang" : "Belum lunas"}
            </button>
          ))}
        </div>

        {hasActiveClientFilter && (
          <button
            onClick={handleResetFilter}
            className="self-start px-4 h-9 rounded-full text-sm font-medium border border-border text-text hover:bg-surface-muted transition-colors"
          >
            Reset filter
          </button>
        )}
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center gap-4 py-16">
          <p className="text-base text-text text-center">{error}</p>
          <button
            onClick={handleRetry}
            className="px-5 h-11 rounded-xl bg-surface border border-border text-base font-semibold text-text hover:bg-surface-muted active:scale-[0.98] transition-all"
          >
            Coba lagi
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16">
          <p className="text-base text-text text-center max-w-xs">
            {hasActiveClientFilter
              ? "Tidak ada transaksi yang cocok dengan filter ini."
              : filter === "all"
                ? "Belum ada transaksi."
                : `Tidak ada transaksi ${filter === "income" ? "pemasukan" : "pengeluaran"}.`}
          </p>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {hasActiveClientFilter && (
              <button
                onClick={handleResetFilter}
                className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl border border-border text-base font-semibold text-text hover:bg-surface-muted active:scale-[0.98] transition-all"
              >
                Reset filter
              </button>
            )}
            <Link
              href="/transaksi/tambah"
              className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-accent text-accent-ink text-base font-semibold hover:bg-accent/90 active:scale-[0.98] transition-all"
            >
              Tambah transaksi
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col divide-y divide-border">
            {filteredItems.map((tx) => (
              <TxRow key={tx.id} tx={tx} />
            ))}
          </div>

          {totalPages > 1 && !hasActiveClientFilter && (
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handlePrevPage}
                disabled={page === 1}
                className="px-4 h-10 rounded-xl bg-surface border border-border text-sm font-semibold text-text hover:bg-surface-muted active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Sebelumnya
              </button>
              <span className="text-sm text-text font-medium tabular-nums">
                {page} / {totalPages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={page === totalPages}
                className="px-4 h-10 rounded-xl bg-surface border border-border text-sm font-semibold text-text hover:bg-surface-muted active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Berikutnya
              </button>
            </div>
          )}

          {hasActiveClientFilter && (
            <p className="text-xs text-text font-medium text-center">
              {filteredItems.length} transaksi ditampilkan
            </p>
          )}
        </>
      )}
    </div>
  );
}

function TxRow({ tx }: { tx: Transaction }) {
  const isIncome = tx.type === "income";
  const source = getTransactionSource(tx.id);
  const debt = getDebtTag(tx.id);

  return (
    <Link
      href={`/transaksi/${tx.id}`}
      className="group flex items-center gap-3 py-4 px-1 hover:bg-surface-muted/50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent rounded-lg"
    >
      <div className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center shrink-0 text-text transition-colors">
        {isIncome ? (
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
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <p className="text-sm font-semibold text-text truncate">
          {tx.description || tx.category.name}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-text">{tx.category.name}</span>
          {source && (
            <span className="text-[11px] font-medium text-text bg-surface-muted px-2 py-0.5 rounded shrink-0">
              {source}
            </span>
          )}
          {debt && (
            <span className="text-[11px] font-medium text-text bg-surface-muted px-2 py-0.5 rounded shrink-0">
              {debt.tag === "utang" ? "Utang" : "Piutang"}
              {debt.settled && " (lunas)"}
            </span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0 flex flex-col gap-0.5 items-end">
        <p
          className={`text-sm font-bold tabular-nums ${
            isIncome ? "text-income" : "text-expense"
          }`}
        >
          {isIncome ? "+" : "-"} {formatRupiah(tx.amount)}
        </p>
        <p className="text-[11px] font-medium text-text">{formatDate(tx.transaction_date)}</p>
      </div>
    </Link>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3 animate-pulse">
          <div className="w-10 h-10 rounded-lg bg-surface-muted shrink-0" />
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="h-4 bg-surface-muted rounded w-3/4" />
            <div className="h-3 bg-surface-muted rounded w-1/2" />
          </div>
          <div className="text-right space-y-1.5">
            <div className="h-4 bg-surface-muted rounded w-24" />
            <div className="h-3 bg-surface-muted rounded w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}
