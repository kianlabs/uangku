"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";
import { apiFetch, ApiResponseError } from "@/lib/api";
import { updateTransaction } from "@/lib/transactions";
import { listCategories } from "@/lib/categories";
import { todayLocalISO, validateTransactionDate } from "@/lib/date";
import { groupThousands } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { Category, TransactionDetail, TransactionType } from "@/lib/types";

function parseAmountInput(value: string): number {
  return value.includes(".") ? parseFloat(value) : parseFloat(value.replace(/\D/g, ""));
}

export default function EditTransaksiPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [today] = useState(() => todayLocalISO());

  const [original, setOriginal] = useState<TransactionDetail | null>(null);
  const [isLoadingTx, setIsLoadingTx] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(today);
  const [description, setDescription] = useState("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [isCatLoading, setIsCatLoading] = useState(true);
  const [catError, setCatError] = useState(false);
  const [errors, setErrors] = useState<{
    amount?: string;
    categoryId?: string;
    date?: string;
  }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await apiFetch<TransactionDetail>(`/api/v1/transactions/${id}`);
        if (!cancelled) {
          setOriginal(data);
          setType(data.type);
          setAmount(data.amount.endsWith(".00") ? data.amount.slice(0, -3) : data.amount);
          setCategoryId(data.category.id);
          setDate(data.transaction_date);
          setDescription(data.description || "");
          setIsLoadingTx(false);
        }
      } catch {
        if (!cancelled) {
          setLoadError("Gagal memuat transaksi.");
          setIsLoadingTx(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    async function loadCat() {
      setIsCatLoading(true);
      setCatError(false);
      try {
        const data = await listCategories({ type });
        if (!cancelled) {
          setCategories(data.items);
          setIsCatLoading(false);
        }
      } catch {
        if (!cancelled) {
          setCategories([]);
          setCatError(true);
          setIsCatLoading(false);
        }
      }
    }
    loadCat();
    return () => {
      cancelled = true;
    };
  }, [type]);

  function handleTypeChange(t: TransactionType) {
    setType(t);
    setCategoryId("");
    setErrors({});
    setServerError(null);
  }

  function validate() {
    const e: typeof errors = {};
    const num = parseAmountInput(amount);
    if (!amount || isNaN(num) || num <= 0) e.amount = "Nominal harus lebih dari 0.";
    if (!categoryId) e.categoryId = "Pilih kategori.";
    const dateError = validateTransactionDate(date);
    if (dateError) e.date = dateError;
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!original) return;

    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setServerError(null);
    setIsSubmitting(true);

    try {
      const num = parseAmountInput(amount);
      const patch: Record<string, unknown> = {};

      if (type !== original.type) patch.type = type;
      if (num.toFixed(2) !== parseFloat(original.amount).toFixed(2)) {
        patch.amount = num.toFixed(2);
      }
      if (categoryId !== original.category.id) patch.category_id = categoryId;
      if (date !== original.transaction_date) patch.transaction_date = date;
      const desc = description.trim() || null;
      if (desc !== original.description) patch.description = desc;

      if (Object.keys(patch).length === 0) {
        router.push(`/transaksi/${id}`);
        return;
      }

      await updateTransaction(id, patch);
      haptic.success();
      router.push(`/transaksi/${id}`);
    } catch (err) {
      haptic.error();
      if (err instanceof ApiResponseError) {
        if (err.status === 0) {
          setServerError(err.message);
        } else if (err.fields) {
          const fe: typeof errors = {};
          if (err.fields.amount) fe.amount = err.fields.amount;
          if (err.fields.category_id) fe.categoryId = err.fields.category_id;
          if (err.fields.transaction_date) fe.date = err.fields.transaction_date;
          setErrors(fe);
        } else {
          setServerError("Transaksi gagal diperbarui. Coba lagi.");
        }
      } else {
        setServerError("Transaksi gagal diperbarui. Coba lagi.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoadingTx) {
    return (
      <div className="min-h-screen flex flex-col bg-canvas">
        <header className="flex items-center gap-3 px-4 h-14 border-b border-border shrink-0">
          <Link
            href={`/transaksi/${id}`}
            aria-label="Kembali"
            className="flex items-center justify-center w-11 h-11 rounded-lg text-text hover:bg-surface-muted transition-colors"
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
          <h1 className="text-base font-semibold text-text">Edit Transaksi</h1>
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

  if (loadError || !original) {
    return (
      <div className="min-h-screen flex flex-col bg-canvas">
        <header className="flex items-center gap-3 px-4 h-14 border-b border-border shrink-0">
          <Link
            href="/riwayat"
            aria-label="Kembali"
            className="flex items-center justify-center w-11 h-11 rounded-lg text-text hover:bg-surface-muted transition-colors"
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
          <h1 className="text-base font-semibold text-text">Edit Transaksi</h1>
        </header>
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="flex flex-col items-center gap-4">
            <p className="text-base font-medium text-danger text-center">{loadError || "Transaksi tidak ditemukan."}</p>
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
          href={`/transaksi/${id}`}
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
        <h1 className="text-base font-semibold text-text">Edit Transaksi</h1>
      </header>

      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
          {/* Type toggle */}
          <div
            role="group"
            aria-labelledby="type-label"
            className="flex flex-col gap-1.5"
          >
            <span id="type-label" className="text-sm font-medium text-text">
              Jenis
            </span>
            <div className="flex rounded-[11px] border border-border overflow-hidden bg-surface-muted p-1 gap-1">
              <button
                type="button"
                onClick={() => handleTypeChange("expense")}
                className={[
                  "flex-1 h-11 rounded-lg text-sm font-medium transition-colors inline-flex items-center justify-center gap-1.5",
                  type === "expense"
                    ? "bg-surface text-text shadow-sm"
                    : "text-muted hover:text-text",
                ].join(" ")}
                aria-pressed={type === "expense"}
              >
                <ArrowDown className="w-4 h-4" aria-hidden="true" />
                Pengeluaran
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange("income")}
                className={[
                  "flex-1 h-11 rounded-lg text-sm font-medium transition-colors inline-flex items-center justify-center gap-1.5",
                  type === "income"
                    ? "bg-surface text-text shadow-sm"
                    : "text-muted hover:text-text",
                ].join(" ")}
                aria-pressed={type === "income"}
              >
                <ArrowUp className="w-4 h-4" aria-hidden="true" />
                Pemasukan
              </button>
            </div>
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-2">
            <label htmlFor="amount" className="text-xs font-semibold text-muted uppercase tracking-wide">
              Nominal
            </label>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-semibold text-muted">Rp</span>
              <input
                id="amount"
                type="text"
                inputMode="decimal"
                value={groupThousands(amount)}
                onChange={(e) => {
                  setAmount(e.target.value.replace(/\D/g, ""));
                }}
                placeholder="0"
                autoComplete="off"
                className="flex-1 min-w-0 text-4xl leading-tight font-bold text-text tabular-nums bg-transparent border-none p-0 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                aria-invalid={errors.amount ? "true" : undefined}
                aria-describedby={errors.amount ? "amount-error" : undefined}
              />
            </div>
            {errors.amount && (
              <p id="amount-error" role="alert" className="text-sm text-danger">
                {errors.amount}
              </p>
            )}
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <Select
              label="Kategori"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              error={errors.categoryId}
              disabled={isCatLoading || catError}
            >
              <option value="">
                {isCatLoading ? "Memuat…" : catError ? "Gagal memuat" : "Pilih kategori"}
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            {catError && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm text-danger">Gagal memuat kategori.</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsCatLoading(true);
                    setCatError(false);
                    listCategories({ type })
                      .then((res) => {
                        setCategories(res.items);
                        setCategoryId("");
                        setIsCatLoading(false);
                      })
                      .catch(() => {
                        setCategories([]);
                        setCatError(true);
                        setIsCatLoading(false);
                      });
                  }}
                  className="text-sm font-semibold text-accent hover:underline"
                >
                  Coba lagi
                </button>
              </div>
            )}
          </div>

          {/* Date */}
          <Input
            label="Tanggal"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            error={errors.date}
            max={today}
          />

          {/* Description */}
          <Input
            label="Catatan"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Catatan (opsional)"
            autoComplete="off"
          />

          {serverError && (
            <div
              role="alert"
              className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm font-medium text-danger"
            >
              {serverError}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            className="w-full"
          >
            Simpan
          </Button>
        </form>
      </main>
    </div>
  );
}
