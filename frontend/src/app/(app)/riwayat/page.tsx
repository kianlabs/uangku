"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { listTransactions } from "@/lib/transactions";
import type { Transaction, TransactionType } from "@/lib/types";

const PAGE_SIZE = 20;

type FilterType = "all" | TransactionType;

export default function RiwayatPage() {
  const [items, setItems] = useState<Transaction[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [filter, setFilter] = useState<FilterType>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevFilter = useRef<FilterType>("all");

  const load = useCallback(async (p: number, f: FilterType) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listTransactions({
        page: p,
        page_size: PAGE_SIZE,
        type: f === "all" ? undefined : f,
      });
      setItems(res.items);
      setTotalPages(res.pagination.total_pages);
      setTotalItems(res.pagination.total_items);
    } catch {
      setError("Gagal memuat transaksi. Coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Reset to page 1 when filter changes
    if (filter !== prevFilter.current) {
      prevFilter.current = filter;
      setPage(1);
      load(1, filter);
    } else {
      load(page, filter);
    }
  }, [page, filter, load]);

  function handleFilterChange(f: FilterType) {
    setFilter(f);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text">Riwayat</h1>
        {!isLoading && totalItems > 0 && (
          <span className="text-xs text-muted">{totalItems} transaksi</span>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["all", "income", "expense"] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => handleFilterChange(f)}
            className={[
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              filter === f
                ? "bg-accent text-accent-ink"
                : "bg-surface-muted text-muted hover:text-text",
            ].join(" ")}
          >
            {f === "all" ? "Semua" : f === "income" ? "Pemasukan" : "Pengeluaran"}
          </button>
        ))}
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

      {!isLoading && !error && items.length === 0 && (
        <p className="text-sm text-muted text-center py-12">Belum ada transaksi.</p>
      )}

      {!isLoading && items.length > 0 && (
        <>
          <div className="flex flex-col divide-y divide-border border-t border-b border-border">
            {items.map((tx) => (
              <TxRow key={tx.id} tx={tx} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-muted hover:text-text hover:bg-surface-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                Sebelumnya
              </button>
              <span className="text-xs text-muted">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-muted hover:text-text hover:bg-surface-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Berikutnya
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TxRow({ tx }: { tx: Transaction }) {
  return (
    <div className="flex items-center gap-3.5 py-3.5">
      <div className="w-10 h-10 rounded-[11px] bg-surface-muted flex items-center justify-center shrink-0 text-muted">
        {tx.type === "income" ? (
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        ) : (
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text truncate">
          {tx.description || tx.category.name}
        </p>
        {tx.description && (
          <p className="text-xs text-muted truncate mt-0.5">{tx.category.name}</p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className={`text-sm font-bold tabular-nums ${tx.type === "income" ? "text-income" : "text-expense"}`}>
          {tx.type === "income" ? "+ " : "- "}{formatRupiah(tx.amount)}
        </p>
        <p className="text-[11px] text-muted mt-0.5">{formatDate(tx.transaction_date)}</p>
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
    year: "numeric",
  });
}
