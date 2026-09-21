"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { deleteTransaction } from "@/lib/transactions";
import { formatRupiah, formatDate } from "@/lib/format";
import type { TransactionDetail } from "@/lib/types";

export default function DetailTransaksiPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [tx, setTx] = useState<TransactionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await apiFetch<TransactionDetail>(`/api/v1/transactions/${id}`);
        if (!cancelled) {
          setTx(data);
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("Gagal memuat transaksi.");
          setIsLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleDelete() {
    if (!tx) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteTransaction(id);
      router.push("/riwayat");
    } catch {
      setDeleteError("Gagal menghapus transaksi. Coba lagi.");
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-canvas">
        <header className="flex items-center gap-3 px-4 h-14 border-b border-border shrink-0">
          <Link
            href="/riwayat"
            aria-label="Kembali"
            className="flex items-center justify-center w-9 h-9 rounded-lg text-text hover:bg-surface-muted transition-colors"
          >
            <svg
              aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-base font-semibold text-text">Detail Transaksi</h1>
        </header>
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-text font-medium">Memuat…</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !tx) {
    return (
      <div className="min-h-screen flex flex-col bg-canvas">
        <header className="flex items-center gap-3 px-4 h-14 border-b border-border shrink-0">
          <Link
            href="/riwayat"
            aria-label="Kembali"
            className="flex items-center justify-center w-9 h-9 rounded-lg text-text hover:bg-surface-muted transition-colors"
          >
            <svg
              aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-base font-semibold text-text">Detail Transaksi</h1>
        </header>
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="flex flex-col items-center gap-4">
            <p className="text-base font-medium text-danger text-center">{error || "Transaksi tidak ditemukan."}</p>
            <Link
              href="/riwayat"
              className="px-5 h-11 rounded-xl bg-surface border border-border text-base font-semibold text-text hover:bg-surface-muted active:scale-[0.98] transition-all inline-flex items-center justify-center"
            >
              Kembali ke Riwayat
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <header className="flex items-center gap-3 px-4 h-14 border-b border-border shrink-0">
        <Link
          href="/riwayat"
          aria-label="Kembali"
          className="flex items-center justify-center w-9 h-9 rounded-lg text-text hover:bg-surface-muted transition-colors"
        >
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-base font-semibold text-text">Detail Transaksi</h1>
      </header>

      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-6">
        <div className="flex flex-col gap-6">
          {/* Amount — focal point */}
          <div className="text-center py-4">
            <p className="text-xs font-semibold text-text uppercase tracking-wide mb-3">
              {tx.type === "income" ? "Pemasukan" : "Pengeluaran"}
            </p>
            <p
              className={`text-4xl sm:text-5xl font-bold tabular-nums leading-tight break-words ${
                tx.type === "income" ? "text-income" : "text-expense"
              }`}
            >
              {tx.type === "income" ? "+ " : "- "}
              {formatRupiah(tx.amount)}
            </p>
          </div>

          {/* Details */}
          <div className="flex flex-col divide-y divide-border border-y border-border">
            <div className="flex items-center justify-between gap-4 py-3.5">
              <span className="text-sm font-medium text-text shrink-0">Kategori</span>
              <span className="text-sm font-medium text-text text-right truncate min-w-0">{tx.category.name}</span>
            </div>
            <div className="flex items-center justify-between gap-4 py-3.5">
              <span className="text-sm font-medium text-text shrink-0">Tanggal</span>
              <span className="text-sm font-medium text-text tabular-nums">{formatDate(tx.transaction_date)}</span>
            </div>
            {tx.description && (
              <div className="flex flex-col gap-1.5 py-3.5">
                <span className="text-sm font-medium text-text">Catatan</span>
                <p className="text-sm text-text">{tx.description}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          {showDeleteConfirm ? (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3">
                <p className="text-sm font-medium text-danger">
                  Hapus {tx.type === "income" ? "pemasukan" : "pengeluaran"} {formatRupiah(tx.amount)}?
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 h-12 rounded-xl bg-danger text-base font-semibold text-white hover:bg-danger/90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isDeleting ? "Menghapus…" : "Hapus"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteError(null);
                  }}
                  disabled={isDeleting}
                  className="flex-1 h-12 rounded-xl bg-surface border border-border text-base font-semibold text-text hover:bg-surface-muted active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Batal
                </button>
              </div>
              {deleteError && (
                <p role="alert" className="text-sm font-medium text-danger text-center">{deleteError}</p>
              )}
            </div>
          ) : (
            <div className="flex gap-3">
              <Link
                href={`/transaksi/${id}/edit`}
                className="flex-1 h-12 rounded-xl bg-surface border border-border text-base font-semibold text-text hover:bg-surface-muted active:scale-[0.98] transition-all flex items-center justify-center"
              >
                Edit
              </Link>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex-1 h-12 rounded-xl bg-danger text-base font-semibold text-white hover:bg-danger/90 active:scale-[0.98] transition-all"
              >
                Hapus
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
