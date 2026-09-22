"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { listCategories } from "@/lib/categories";
import { listBudgets, upsertBudget, deleteBudget } from "@/lib/budgets";
import { formatRupiah, groupThousands } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { EmptyState } from "@/components/ui/EmptyState";
import { Mascot } from "@/components/brand/Mascot";
import type { Budget, Category } from "@/lib/types";

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonthKey(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}

export default function AnggaranPage() {
  const [monthKey, setMonthKey] = useState(() => currentMonthKey());

  const [cats, setCats] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Record<string, Budget>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string | null>>({});
  const [savedFlash, setSavedFlash] = useState<string | null>(null);

  const expenseCats = useMemo(() => cats.filter((c) => c.type === "expense"), [cats]);

  const load = useCallback(async () => {
    try {
      const [catRes, budRes] = await Promise.all([listCategories(), listBudgets(monthKey)]);
      setCats(catRes.items);
      const map: Record<string, Budget> = {};
      for (const b of budRes.items) map[b.category_id] = b;
      setBudgets(map);
    } catch {
      setLoadError("Gagal memuat anggaran. Coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }, [monthKey]);

  async function handleRetry() {
    setIsLoading(true);
    setLoadError(null);
    await load();
  }

  useEffect(() => {
    // Deferred — hindari setState sinkron di jalur effect (cascading render).
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    // Progress basi setelah tambah/hapus transaksi — muat ulang.
    function onTxChanged() {
      load();
    }
    window.addEventListener("uangku:tx-changed", onTxChanged);
    return () => window.removeEventListener("uangku:tx-changed", onTxChanged);
  }, [load]);

  function setDraft(categoryId: string, value: string) {
    const digits = value.replace(/\D/g, "");
    setDrafts((prev) => ({ ...prev, [categoryId]: digits }));
  }

  async function handleSave(categoryId: string) {
    if (savingId) return; // sedang menyimpan baris lain — cegah double-PUT
    if (drafts[categoryId] === undefined) return; // belum diedit
    const digits = drafts[categoryId];
    const num = digits ? parseInt(digits, 10) : 0;
    if (num <= 0) {
      // Dikosongkan = batal edit (kembalikan tampilan), BUKAN hapus.
      // Hapus hanya lewat tombol Hapus eksplisit + konfirmasi.
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[categoryId];
        return next;
      });
      return;
    }
    setSavingId(categoryId);
    setRowErrors((prev) => ({ ...prev, [categoryId]: null }));
    try {
      const res = await upsertBudget(categoryId, String(num));
      haptic.success();
      setBudgets((prev) => ({ ...prev, [categoryId]: res }));
      setSavedFlash(categoryId);
      setTimeout(() => setSavedFlash((cur) => (cur === categoryId ? null : cur)), 2000);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[categoryId];
        return next;
      });
    } catch {
      haptic.error();
      setRowErrors((prev) => ({ ...prev, [categoryId]: "Gagal menyimpan. Coba lagi." }));
    } finally {
      setSavingId(null);
    }
  }

  async function handleDeleteBudget(categoryId: string) {
    if (deletingId) return;
    setDeletingId(categoryId);
    setRowErrors((prev) => ({ ...prev, [categoryId]: null }));
    try {
      await deleteBudget(categoryId);
      haptic.success();
      setBudgets((prev) => {
        const next = { ...prev };
        delete next[categoryId];
        return next;
      });
      setConfirmDeleteId(null);
    } catch {
      haptic.error();
      setRowErrors((prev) => ({ ...prev, [categoryId]: "Gagal menghapus. Coba lagi." }));
    } finally {
      setDeletingId(null);
    }
  }

  const rows = expenseCats.map((c) => {
    const b = budgets[c.id];
    const spent = b?.spent != null ? Number(b.spent) : null;
    const amount = b ? Number(b.amount) : 0;
    const pct =
      b?.percentage != null
        ? b.percentage
        : spent != null && amount > 0
          ? (spent / amount) * 100
          : null;
    return { cat: c, budget: b, spent, pct };
  });

  const withBudget = rows.filter((r) => r.budget);
  const totalBudget = withBudget.reduce((sum, r) => sum + Number(r.budget?.amount ?? 0), 0);
  const totalSpent = withBudget.reduce((sum, r) => (r.spent != null ? sum + r.spent : sum), 0);
  const totalPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const riskCount = rows.filter((r) => (r.pct ?? 0) >= 90).length;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold text-text">Anggaran</h1>

      <div
        className="flex items-center justify-between gap-2"
        role="group"
        aria-label="Pilih bulan anggaran"
      >
        <button
          type="button"
          onClick={() => setMonthKey((k) => shiftMonthKey(k, -1))}
          aria-label="Bulan sebelumnya"
          className="min-w-[44px] min-h-[44px] px-3 rounded-xl bg-surface border border-border text-base font-semibold text-text hover:bg-surface-muted active:scale-[0.98] transition-all"
        >
          ‹
        </button>
        <label className="flex items-center gap-2 text-sm font-semibold text-text">
          <span className="sr-only">Bulan</span>
          <input
            type="month"
            value={monthKey}
            max={currentMonthKey()}
            onChange={(e) => {
              if (e.target.value) setMonthKey(e.target.value);
            }}
            aria-label={`Bulan anggaran, saat ini ${monthLabel(monthKey)}`}
            className="h-11 rounded-xl bg-surface border border-border px-3 text-sm font-semibold text-text focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
        <button
          type="button"
          onClick={() => setMonthKey((k) => shiftMonthKey(k, 1))}
          disabled={monthKey >= currentMonthKey()}
          aria-label="Bulan berikutnya"
          className="min-w-[44px] min-h-[44px] px-3 rounded-xl bg-surface border border-border text-base font-semibold text-text hover:bg-surface-muted active:scale-[0.98] transition-all disabled:opacity-40"
        >
          ›
        </button>
      </div>

      <div className="flex flex-col items-center gap-1.5 text-center pt-1 pb-2">
        <Mascot
          size={88}
          mood="excited"
          variant="cap"
          animated
          label="Mochi menemanimu merencanakan anggaran"
        />
        <p className="text-base font-bold text-text">Rencanakan belanjamu</p>
        <p className="text-sm text-muted leading-relaxed max-w-xs">
          Tetapkan batas belanja per kategori untuk {monthLabel(monthKey)}. Kosong berarti tanpa batas — sisanya tetap dijaga lewat batas aman harian.
        </p>
      </div>

      <section
        aria-label="Ringkasan anggaran"
        className="flex flex-col gap-2 p-5 rounded-2xl bg-surface border border-border shadow-sm"
      >
        {totalBudget > 0 ? (
          <>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-semibold text-muted uppercase tracking-wide">
                Total dianggarkan
              </span>
              <span className="num text-lg font-bold text-text">{formatRupiah(totalBudget)}</span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-label="Total anggaran terpakai"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(totalPct)}
            >
              <div
                className={`h-full rounded-full transition-all ${
                  totalPct < 75 ? "bg-emerald-500" : totalPct <= 90 ? "bg-amber-500" : "bg-rose-500"
                }`}
                style={{ width: `${Math.min(100, totalPct)}%` }}
              />
            </div>
            <p className="text-xs text-muted">
              <span className="num">{formatRupiah(totalSpent)}</span> terpakai
              {riskCount > 0 && (
                <>
                  {" · "}
                  <span className="font-semibold text-rose-600">
                    <span className="num">{riskCount}</span> kategori ≥90%
                  </span>
                </>
              )}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted">
            Belum ada anggaran. Isi nominal di bawah — kategori kosong berarti tanpa batas.
          </p>
        )}
      </section>

      {isLoading ? (
        <div className="flex flex-col gap-3 py-4" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-surface-muted animate-pulse" />
          ))}
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-sm text-danger">{loadError}</p>
          <button
            onClick={handleRetry}
            className="h-11 px-5 rounded-xl bg-accent text-accent-ink text-base font-semibold hover:bg-accent/90 active:scale-[0.98] transition-all"
          >
            Coba lagi
          </button>
        </div>
      ) : expenseCats.length === 0 ? (
        <EmptyState
          mood="excited"
          title="Belum ada kategori pengeluaran"
          description="Bikin dulu di halaman kategori, lalu kembali ke sini."
          actions={
            <Link
              href="/pengaturan/kategori"
              className="h-11 px-5 inline-flex items-center rounded-xl bg-accent text-accent-ink text-base font-semibold hover:bg-accent/90 active:scale-[0.98] transition-all"
            >
              Ke kategori
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col rounded-2xl bg-surface border border-border shadow-sm px-5 divide-y divide-border">
          {rows.map(({ cat, budget, spent, pct }) => (
            <BudgetRow
              key={cat.id}
              category={cat}
              budget={budget}
              draft={drafts[cat.id]}
              spent={spent}
              pct={pct}
              saving={savingId === cat.id}
              deleting={deletingId === cat.id}
              confirmingDelete={confirmDeleteId === cat.id}
              error={rowErrors[cat.id] ?? null}
              flash={savedFlash === cat.id}
              onDraft={setDraft}
              onSave={handleSave}
              onDeleteRequest={setConfirmDeleteId}
              onDeleteCancel={() => setConfirmDeleteId(null)}
              onDeleteConfirm={handleDeleteBudget}
            />
          ))}
        </div>
      )}

      <Link
        href="/pengaturan/kategori"
        className="text-sm font-semibold text-accent hover:underline self-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent rounded"
      >
        Kelola kategori
      </Link>
    </div>
  );
}

interface BudgetRowProps {
  category: Category;
  budget?: Budget;
  draft: string | undefined;
  spent: number | null;
  pct: number | null;
  saving: boolean;
  deleting: boolean;
  confirmingDelete: boolean;
  error: string | null;
  flash: boolean;
  onDraft: (categoryId: string, value: string) => void;
  onSave: (categoryId: string) => void;
  onDeleteRequest: (categoryId: string) => void;
  onDeleteCancel: () => void;
  onDeleteConfirm: (categoryId: string) => void;
}

function BudgetRow({
  category,
  budget,
  draft,
  spent,
  pct,
  saving,
  deleting,
  confirmingDelete,
  error,
  flash,
  onDraft,
  onSave,
  onDeleteRequest,
  onDeleteCancel,
  onDeleteConfirm,
}: BudgetRowProps) {
  const dirty = draft !== undefined;
  const display = dirty
    ? draft
      ? groupThousands(draft)
      : ""
    : budget
      ? groupThousands(String(Math.round(Number(budget.amount))))
      : "";
  const barColor =
    pct == null ? "" : pct < 75 ? "bg-emerald-500" : pct <= 90 ? "bg-amber-500" : "bg-rose-500";
  const pctColor =
    pct == null ? "text-muted" : pct < 75 ? "text-emerald-600" : pct <= 90 ? "text-amber-600" : "text-rose-600";

  return (
    <div className="flex flex-col gap-2 py-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-base font-medium text-text min-w-0 truncate">{category.name}</span>
        <span className="relative shrink-0">
          <span
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted"
          >
            Rp
          </span>
          <input
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            value={display}
            disabled={saving}
            onChange={(e) => onDraft(category.id, e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSave(category.id);
              }
            }}
            onBlur={() => onSave(category.id)}
            aria-label={`Anggaran bulanan ${category.name}`}
            className="w-32 h-10 pl-8 pr-3 text-right rounded-lg border border-border bg-surface text-text text-sm font-semibold num focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors disabled:opacity-60"
          />
        </span>
      </div>
      {budget && (
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${Math.min(100, pct ?? 0)}%` }}
            />
          </div>
          <span className={`num text-xs font-semibold ${pctColor}`}>{Math.round(pct ?? 0)}%</span>
          {spent != null && (
            <span className="num text-xs text-muted whitespace-nowrap">{formatRupiah(spent)}</span>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
      {flash && !error && <p className="text-xs text-accent">Tersimpan</p>}
      {budget && !confirmingDelete && (
        <button
          type="button"
          onClick={() => onDeleteRequest(category.id)}
          disabled={saving || deleting}
          className="self-start min-h-[44px] px-2 -ml-2 text-xs font-semibold text-danger hover:underline disabled:opacity-50 rounded"
        >
          Hapus anggaran
        </button>
      )}
      {budget && confirmingDelete && (
        <div className="flex items-center gap-2" role="group" aria-label={`Konfirmasi hapus anggaran ${category.name}`}>
          <span className="text-xs text-text">Hapus anggaran {category.name}?</span>
          <button
            type="button"
            onClick={() => onDeleteConfirm(category.id)}
            disabled={deleting}
            className="min-h-[44px] px-3 text-xs font-semibold text-danger hover:underline disabled:opacity-50 rounded"
          >
            {deleting ? "Menghapus…" : "Ya, hapus"}
          </button>
          <button
            type="button"
            onClick={onDeleteCancel}
            disabled={deleting}
            className="min-h-[44px] px-3 text-xs font-semibold text-muted hover:text-text disabled:opacity-50 rounded"
          >
            Batal
          </button>
        </div>
      )}
    </div>
  );
}
