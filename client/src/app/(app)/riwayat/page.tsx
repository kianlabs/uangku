"use client";

import { useEffect, useRef, useState, useMemo, createElement } from "react";
import Link from "next/link";
import { deleteTransaction, listTransactions } from "@/lib/transactions";
import { listCategories } from "@/lib/categories";
import type { Category, Transaction, TransactionType } from "@/lib/types";
import { getTransactionSource, getDebtTag } from "@/lib/local-storage";
import { getCategoryColor, getCategoryIcon } from "@/lib/category-icons";
import { formatRupiah, formatDate } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { todayLocalISO } from "@/lib/date";
import { Mascot } from "@/components/brand/Mascot";

const PAGE_SIZE = 20;

type FilterType = "all" | TransactionType;

function toMonthStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthRange(month: string): { date_from: string; date_to: string } {
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const mm = String(m).padStart(2, "0");
  return {
    date_from: `${y}-${mm}-01`,
    date_to: `${y}-${mm}-${String(lastDay).padStart(2, "0")}`,
  };
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const names = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
  ];
  return `${names[m - 1]} ${y}`;
}

function dateLabel(iso: string): string {
  const today = todayLocalISO();
  const d = new Date(today + "T00:00:00");
  d.setDate(d.getDate() - 1);
  const yesterday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (iso === today) return "Hari ini";
  if (iso === yesterday) return "Kemarin";
  return formatDate(iso, { long: true });
}

export default function RiwayatPage() {
  const [items, setItems] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [debtFilter, setDebtFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [showMore, setShowMore] = useState(false);
  const [compact, setCompact] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ tx: Transaction; index: number } | null>(null);
  const pendingRef = useRef<{ tx: Transaction; index: number } | null>(null);
  const undoTimer = useRef<number | null>(null);

  /** Hapus optimistik: baris hilang seketika, commit ke server setelah jendela undo. */
  function beginDelete(tx: Transaction) {
    const index = items.findIndex((i) => i.id === tx.id);
    if (index < 0) return;
    setItems((prev) => prev.filter((i) => i.id !== tx.id));
    const pd = { tx, index };
    pendingRef.current = pd;
    setPendingDelete(pd);
    if (undoTimer.current !== null) clearTimeout(undoTimer.current);
    undoTimer.current = window.setTimeout(() => void commitDelete(), 6000);
  }

  function reinsert(pd: { tx: Transaction; index: number }) {
    setItems((prev) => {
      const next = [...prev];
      next.splice(Math.min(pd.index, prev.length), 0, pd.tx);
      return next;
    });
  }

  function undoDelete() {
    if (undoTimer.current !== null) {
      clearTimeout(undoTimer.current);
      undoTimer.current = null;
    }
    const pd = pendingRef.current;
    pendingRef.current = null;
    setPendingDelete(null);
    if (pd) reinsert(pd);
  }

  async function commitDelete() {
    const pd = pendingRef.current;
    if (!pd) return;
    pendingRef.current = null;
    setPendingDelete(null);
    try {
      await deleteTransaction(pd.tx.id);
      window.dispatchEvent(new CustomEvent("uangku:tx-changed"));
      haptic.success();
    } catch {
      // Rollback: kembalikan baris & tampilkan error.
      reinsert(pd);
      haptic.error();
      setError("Gagal menghapus transaksi. Coba lagi.");
    }
  }

  useEffect(() => {
    return () => {
      if (undoTimer.current !== null) clearTimeout(undoTimer.current);
    };
  }, []);

  const hasClientFilter = sourceFilter !== "all" || debtFilter !== "all";
  const hasAnyFilter =
    hasClientFilter || monthFilter !== "all" || filter !== "all" || categoryFilter !== "all";

  const thisMonth = toMonthStr(new Date());
  const lastMonth = toMonthStr(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1));

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

  const groups = useMemo(() => {
    const out: { date: string; label: string; items: Transaction[] }[] = [];
    for (const tx of filteredItems) {
      const last = out[out.length - 1];
      if (last && last.date === tx.transaction_date) {
        last.items.push(tx);
      } else {
        out.push({ date: tx.transaction_date, label: dateLabel(tx.transaction_date), items: [tx] });
      }
    }
    return out;
  }, [filteredItems]);

  useEffect(() => {
    let cancelled = false;
    listCategories()
      .then((res) => {
        if (!cancelled) setCategories(res.items);
      })
      .catch(() => {
        // Kategori opsional untuk filter — gagal muat tidak block daftar
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    async function fetchPage() {
      setError(null);
      try {
        const range = monthFilter === "all" ? null : monthRange(monthFilter);
        const category_id = categoryFilter === "all" ? undefined : categoryFilter;
        if (hasClientFilter) {
          const allItems: Transaction[] = [];
          const MAX_PAGES = 10;
          for (let i = 1; i <= MAX_PAGES; i++) {
            if (cancelled || controller.signal.aborted) break;
            const res = await listTransactions({
              page: i,
              page_size: PAGE_SIZE,
              type: filter === "all" ? undefined : filter,
              category_id,
              date_from: range?.date_from,
              date_to: range?.date_to,
              signal: controller.signal,
            });
            allItems.push(...res.items);
            if (i >= res.pagination.total_pages) break;
          }
          if (!cancelled && !controller.signal.aborted) {
            setItems(allItems);
            setHasMore(false);
          }
        } else {
          const res = await listTransactions({
            page,
            page_size: PAGE_SIZE,
            type: filter === "all" ? undefined : filter,
            category_id,
            date_from: range?.date_from,
            date_to: range?.date_to,
            signal: controller.signal,
          });
          if (!cancelled && !controller.signal.aborted) {
            setItems((prev) => (page === 1 ? res.items : [...prev, ...res.items]));
            setHasMore(page < res.pagination.total_pages);
          }
        }
      } catch {
        if (!cancelled && !controller.signal.aborted) setError("Gagal memuat transaksi.");
      } finally {
        if (!cancelled && !controller.signal.aborted) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    }
    fetchPage();
    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filter, categoryFilter, sourceFilter, debtFilter, monthFilter, reloadKey]);

  useEffect(() => {
    let raf = 0;
    function onScroll() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setCompact(window.scrollY > 140));
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    function handleTxChanged() {
      setPage(1);
      setReloadKey((k) => k + 1);
    }
    window.addEventListener("uangku:tx-changed", handleTxChanged);
    return () => {
      window.removeEventListener("uangku:tx-changed", handleTxChanged);
    };
  }, []);

  function resetPage() {
    setPage(1);
  }

  function handleFilterChange(f: FilterType) {
    setIsLoading(true);
    setFilter(f);
    resetPage();
  }

  function handleSourceFilter(s: string) {
    setIsLoading(true);
    resetPage();
    setSourceFilter(s);
  }

  function handleDebtFilter(d: string) {
    setIsLoading(true);
    resetPage();
    setDebtFilter(d);
  }

  function handleMonthFilter(m: string) {
    setIsLoading(true);
    resetPage();
    setMonthFilter(m);
  }

  function handleCategoryFilter(c: string) {
    setIsLoading(true);
    resetPage();
    setCategoryFilter(c);
  }

  function handleResetFilter() {
    setIsLoading(true);
    setSourceFilter("all");
    setDebtFilter("all");
    setMonthFilter("all");
    setFilter("all");
    setCategoryFilter("all");
    resetPage();
  }

  function handleRetry() {
    setIsLoading(true);
    setError(null);
    resetPage();
    setReloadKey((k) => k + 1);
  }

  function handleLoadMore() {
    setIsLoadingMore(true);
    setError(null);
    setPage((p) => p + 1);
  }

  return (
    <div className="flex flex-col gap-5">
      <div
        aria-hidden="true"
        className={`fixed top-0 inset-x-0 z-30 transition-transform duration-200 ${
          compact ? "translate-y-0" : "-translate-y-full pointer-events-none"
        }`}
      >
        <div className="max-w-lg mx-auto px-4 py-3 bg-surface/70 backdrop-blur-xl backdrop-saturate-150 border-b border-slate-900/5 flex items-baseline justify-between">
          <p className="text-base font-bold text-text">Riwayat</p>
          {!isLoading && (
            <p className="text-xs text-muted"><span className="num">{filteredItems.length}</span> transaksi</p>
          )}
        </div>
      </div>
      <h1 className="text-[32px] leading-[1.15] font-bold tracking-tight text-text">Riwayat</h1>

      {/* Sembunyikan saat daftar kosong — Mochi empty-state yang tampil agar tetap satu maskot per layar (§5) */}
      {!isLoading && filteredItems.length === 0 ? null : (
        <div className="flex flex-col items-center gap-1.5 text-center pt-1 pb-2">
          <Mascot
            size={88}
            mood="happy"
            variant="glasses"
            animated
            label="Mochi menemanimu melihat riwayat"
          />
          <p className="text-base font-bold text-text">Perjalanan uangmu</p>
          <p className="text-sm text-muted leading-relaxed max-w-xs">
            Semua catatan masuk dan keluar — geser baris ke kiri untuk menghapus.
          </p>
        </div>
      )}

      {/* Bulan */}
      <div className="flex flex-wrap gap-2 items-center">
        {(
          [
            { value: "all", label: "Semua waktu" },
            { value: thisMonth, label: "Bulan ini" },
            { value: lastMonth, label: "Bulan lalu" },
          ] as const
        ).map((m) => (
          <button
            key={m.value}
            onClick={() => handleMonthFilter(m.value)}
            aria-pressed={monthFilter === m.value}
            className={`px-4 h-11 rounded-full text-sm font-medium transition-all ${
              monthFilter === m.value
                ? "bg-accent text-accent-ink"
                : "bg-surface-muted text-text hover:bg-surface-muted/80 active:scale-95"
            }`}
          >
            {m.label}
          </button>
        ))}
        <input
          type="month"
          aria-label="Pilih bulan"
          value={monthFilter === "all" || monthFilter === thisMonth || monthFilter === lastMonth ? "" : monthFilter}
          max={thisMonth}
          onChange={(e) => e.target.value && handleMonthFilter(e.target.value)}
          className="px-3 h-11 rounded-full text-sm font-medium border border-border bg-surface text-text"
        />
      </div>

      {/* Jenis */}
      <div className="flex flex-wrap gap-2 items-center">
        {(["all", "income", "expense"] as const).map((f) => (
          <button
            key={f}
            onClick={() => handleFilterChange(f)}
            aria-pressed={filter === f}
            className={`px-4 h-11 rounded-full text-sm font-medium transition-all ${
              filter === f
                ? "bg-accent text-accent-ink"
                : "bg-surface-muted text-text hover:bg-surface-muted/80 active:scale-95"
            }`}
          >
            {f === "all" ? "Semua" : f === "income" ? "Pemasukan" : "Pengeluaran"}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          aria-expanded={showMore}
          className={`px-4 h-11 rounded-full text-sm font-medium transition-all ${
            hasClientFilter
              ? "bg-accent text-accent-ink"
              : "border border-border text-text hover:bg-surface-muted"
          }`}
        >
          Lainnya{hasClientFilter ? " •" : ""}
        </button>
        {hasAnyFilter && (
          <button
            onClick={handleResetFilter}
            className="px-4 h-11 rounded-full text-sm font-medium text-muted hover:text-text transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {/* Kategori */}
      <div className="flex items-center gap-2">
        <label htmlFor="filter-category" className="sr-only">
          Filter kategori
        </label>
        <div className="relative max-w-full">
          <select
            id="filter-category"
            value={categoryFilter}
            onChange={(e) => handleCategoryFilter(e.target.value)}
            className={`h-11 max-w-full rounded-full pl-4 pr-9 text-sm font-medium appearance-none border transition-all focus:outline-none focus:ring-2 focus:ring-accent truncate ${
              categoryFilter !== "all"
                ? "bg-accent text-accent-ink border-transparent"
                : "bg-surface-muted text-text border-transparent hover:bg-surface-muted/80"
            }`}
          >
            <option value="all">Semua kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 ${
              categoryFilter !== "all" ? "text-accent-ink" : "text-muted"
            }`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>

      {/* Filter lanjutan: sumber & kasbon */}
      {showMore && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted uppercase tracking-wide">Sumber</span>
            <div className="flex flex-wrap gap-2">
              {(["all", "Tunai", "Bank", "E-wallet"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => handleSourceFilter(s === "all" ? "all" : s)}
                  aria-pressed={sourceFilter === (s === "all" ? "all" : s)}
                  className={`px-4 h-11 rounded-full text-sm font-medium transition-all ${
                    sourceFilter === (s === "all" ? "all" : s)
                      ? "bg-accent text-accent-ink"
                      : "bg-surface-muted text-text hover:bg-surface-muted/80 active:scale-95"
                  }`}
                >
                  {s === "all" ? "Semua" : s}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted uppercase tracking-wide">Kasbon</span>
            <div className="flex flex-wrap gap-2">
              {(["all", "utang", "piutang", "belum-lunas"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => handleDebtFilter(d)}
                  aria-pressed={debtFilter === d}
                  className={`px-4 h-11 rounded-full text-sm font-medium transition-all ${
                    debtFilter === d
                      ? "bg-accent text-accent-ink"
                      : "bg-surface-muted text-text hover:bg-surface-muted/80 active:scale-95"
                  }`}
                >
                  {d === "all" ? "Semua" : d === "utang" ? "Utang" : d === "piutang" ? "Piutang" : "Belum lunas"}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

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
          <Mascot
            size={110}
            mood={hasAnyFilter ? "thinking" : "happy"}
            variant="sparkle"
            label="Mochi memandumu di riwayat"
          />
          <div className="flex flex-col gap-1 items-center text-center max-w-xs">
            <p className="text-base font-semibold text-text">
              {monthFilter !== "all" && !hasClientFilter && filter === "all" && categoryFilter === "all"
                ? `Belum ada catatan pada ${monthLabel(monthFilter)}`
                : hasAnyFilter
                  ? "Hmm, tidak ada yang cocok"
                  : "Belum ada catatan di sini"}
            </p>
            <p className="text-sm text-muted">
              {hasAnyFilter
                ? "Coba ubah filternya ya?"
                : "Catat via tombol + , contoh: Makan siang 45k"}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {hasAnyFilter && (
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
          {pendingDelete && (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-surface border border-border shadow-sm"
            >
              <p className="text-sm text-text truncate">Transaksi dihapus.</p>
              <button
                type="button"
                onClick={undoDelete}
                className="shrink-0 text-sm font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent rounded"
              >
                Urungkan
              </button>
            </div>
          )}
          <div className="flex flex-col gap-5">
            {groups.map((g) => (
              <section key={g.date} className="flex flex-col">
                <h2 className="text-xs font-semibold text-muted uppercase tracking-wide pb-1">
                  {g.label}
                </h2>
                <div className="flex flex-col divide-y divide-border">
                  {g.items.map((tx) => (
                    <SwipeableTxRow key={tx.id} tx={tx} onDelete={beginDelete} />
                  ))}
                </div>
              </section>
            ))}
          </div>

          {hasMore && !hasClientFilter && (
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="self-center px-6 h-11 rounded-xl bg-surface border border-border text-sm font-semibold text-text hover:bg-surface-muted active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isLoadingMore ? "Memuat…" : "Tampilkan lebih banyak"}
            </button>
          )}

          {hasClientFilter && (
            <p className="text-xs text-muted font-medium text-center">
              {filteredItems.length} transaksi ditampilkan
            </p>
          )}
        </>
      )}
    </div>
  );
}

const SWIPE_OPEN_PX = -72;
const SWIPE_RANGE_PX = 96;

/**
 * Baris transaksi dengan swipe-kiri-untuk-hapus (mobile idiom).
 *
 - Pointer events + `touch-pan-y`: scroll vertikal tetap jalan, geser
   horizontal membuka tombol hapus di belakang baris.
 - Hapus bersifat optimistik via `onDelete` — parent menahan undo 6 detik.
 - Fallback a11y: keyboard/screen reader tetap punya jalur hapus via
   halaman detail (/transaksi/[id]), swipe hanya enhancement.
 */
function SwipeableTxRow({ tx, onDelete }: { tx: Transaction; onDelete: (tx: Transaction) => void }) {
  const isIncome = tx.type === "income";
  const source = getTransactionSource(tx.id);
  const debt = getDebtTag(tx.id);

  const [dx, setDx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startPointer = useRef({ x: 0, y: 0 });
  const startDx = useRef(0);
  const dragging = useRef(false);
  const lockAxis = useRef<"x" | "y" | null>(null);
  const swiped = useRef(false);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    startPointer.current = { x: e.clientX, y: e.clientY };
    startDx.current = dx;
    dragging.current = true;
    setIsDragging(true);
    lockAxis.current = null;
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    const mx = e.clientX - startPointer.current.x;
    const my = e.clientY - startPointer.current.y;
    if (lockAxis.current === null) {
      if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
      lockAxis.current = Math.abs(mx) > Math.abs(my) ? "x" : "y";
      if (lockAxis.current === "x") {
        e.currentTarget.setPointerCapture(e.pointerId);
        swiped.current = true;
      }
    }
    if (lockAxis.current !== "x") return;
    setDx(Math.max(-SWIPE_RANGE_PX, Math.min(0, startDx.current + mx)));
  }

  function onPointerUp() {
    if (!dragging.current) return;
    dragging.current = false;
    setIsDragging(false);
    if (lockAxis.current === "x") {
      setDx((cur) => (cur < -48 ? SWIPE_OPEN_PX : 0));
    }
    lockAxis.current = null;
  }

  function handleDeleteClick() {
    setDx(0);
    onDelete(tx);
  }

  return (
    <div className="relative overflow-hidden rounded-lg touch-pan-y">
      {/* Tombol hapus di belakang baris — terungkap saat swipe */}
      {dx < 0 && (
        <button
          type="button"
          onClick={handleDeleteClick}
          aria-label={`Hapus transaksi ${tx.description || tx.category.name}`}
          className="absolute inset-y-0 right-0 w-20 flex flex-col items-center justify-center gap-0.5 bg-rose-500 text-white rounded-lg active:bg-rose-600 transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-rose-500"
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
            <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m2 0v14a2 2 0 01-2 2H8a2 2 0 01-2-2V6" />
          </svg>
          <span className="text-[11px] font-semibold">Hapus</span>
        </button>
      )}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        // Cegah native link-drag (mouse desktop): tanpa ini, drag di atas
        // <Link> memicu drag-and-drop HTML dan menekan pointermove —
        // swipe-to-delete mati total di browser desktop.
        onDragStart={(e) => e.preventDefault()}
        style={{
          transform: `translateX(${dx}px)`,
          // State (bukan ref) agar lint-safe: saat drag, tanpa transition;
          // saat lepas, baris menutup/membuka dengan animasi.
          transition: isDragging ? "none" : "transform 180ms ease",
        }}
      >
        <Link
          href={`/transaksi/${tx.id}`}
          draggable={false}
          onClick={(e) => {
            if (dx !== 0 || swiped.current) {
              // Swipe menyelesaikan gerakannya — jangan navigasi.
              e.preventDefault();
              swiped.current = false;
              setDx(0);
            }
          }}
          className="group flex items-center gap-3 py-3 px-1 bg-surface hover:bg-surface-muted/50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent rounded-lg"
        >
          <div className={`w-10 h-10 rounded-xl ${getCategoryColor(tx.category.name).background} flex items-center justify-center shrink-0 transition-colors`}>
            {createElement(getCategoryIcon(tx.category.name), { className: `w-5 h-5 ${getCategoryColor(tx.category.name).foreground}`, "aria-hidden": true })}
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
            <p className="text-base font-medium text-text truncate">
              {tx.description || tx.category.name}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-muted">{tx.category.name}</span>
              {source && (
                <span className="text-[11px] font-medium text-muted bg-surface-muted px-2 py-0.5 rounded shrink-0">
                  {source}
                </span>
              )}
              {debt && (
                <span className="text-[11px] font-medium text-muted bg-surface-muted px-2 py-0.5 rounded shrink-0">
                  {debt.tag === "utang" ? "Utang" : "Piutang"}
                  {debt.settled && " (lunas)"}
                </span>
              )}
            </div>
          </div>
          <p
            className={`num text-base font-bold shrink-0 ${
              isIncome ? "text-income" : "text-expense"
            }`}
          >
            {isIncome ? "+" : "-"} {formatRupiah(tx.amount)}
          </p>
        </Link>
      </div>
    </div>
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
