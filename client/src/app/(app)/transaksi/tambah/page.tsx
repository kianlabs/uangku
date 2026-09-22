"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";
import { createTransaction } from "@/lib/transactions";
import { listCategories, createCategory } from "@/lib/categories";
import { ApiResponseError } from "@/lib/api";
import { parseQuickAdd } from "@/lib/quick-add-parser";
import { todayLocalISO, validateTransactionDate } from "@/lib/date";
import { groupThousands } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { showToast } from "@/lib/toast";
import { setTransactionSource, setDebtTag, getTemplates, setTemplates, type SubscriptionTemplate } from "@/lib/local-storage";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { Category, TransactionType } from "@/lib/types";

function normalizeCategoryName(value: string): string {
  return value.trim().toLowerCase();
}

export default function TambahTransaksiPage() {
  const router = useRouter();
  const [today] = useState(() => todayLocalISO());

  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [pendingCategoryName, setPendingCategoryName] = useState<string | null>(null);
  const [date, setDate] = useState(today);
  const [description, setDescription] = useState("");
  const [quickAdd, setQuickAdd] = useState("");
  const [source, setSource] = useState("");
  const [debtTag, setDebtTagState] = useState<"" | "utang" | "piutang">("");
  const [debtSettled, setDebtSettled] = useState(false);
  const [templates, setTemplatesState] = useState<SubscriptionTemplate[]>(getTemplates);
  const [newTemplate, setNewTemplate] = useState({ name: "", amount: "", category: "" });
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [isCatLoading, setIsCatLoading] = useState(true);
  const [catError, setCatError] = useState(false);
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [isCreatingCat, setIsCreatingCat] = useState(false);
  const [errors, setErrors] = useState<{
    amount?: string;
    categoryId?: string;
    date?: string;
  }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadCategories() {
      setIsCatLoading(true);
      setCatError(false);
      setShowNewCat(false);
      setNewCatName("");
      try {
        const res = await listCategories({ type });
        if (!cancelled) {
          setCategories(res.items);
          setCategoryId("");
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
    loadCategories();
    return () => {
      cancelled = true;
    };
  }, [type]);

  useEffect(() => {
    if (!pendingCategoryName || isCatLoading) return;
    const cat = categories.find(
      (c) => normalizeCategoryName(c.name) === normalizeCategoryName(pendingCategoryName)
    );
    queueMicrotask(() => {
      if (cat) setCategoryId(cat.id);
      setPendingCategoryName(null);
    });
  }, [categories, isCatLoading, pendingCategoryName]);

  function handleTypeChange(t: TransactionType) {
    if (t !== type) {
      setIsCatLoading(true);
      setType(t);
      setCategoryId("");
      setPendingCategoryName(null);
    }
  }

  function handleQuickAdd(value: string) {
    setQuickAdd(value);
    const parsed = parseQuickAdd(value);
    if (!parsed) return;

    setAmount(parsed.amount.toString());
    if (parsed.description) setDescription(parsed.description);

    setPendingCategoryName(parsed.category ?? null);
    if (parsed.type !== type) {
      setIsCatLoading(true);
      setType(parsed.type);
      setCategoryId("");
      return;
    }

    if (parsed.category) {
      const cat = categories.find(
        (c) => normalizeCategoryName(c.name) === normalizeCategoryName(parsed.category!)
      );
      if (cat) {
        setCategoryId(cat.id);
        setPendingCategoryName(null);
      }
    }
  }

  function validate() {
    const e: typeof errors = {};
    const num = parseFloat(amount.replace(/\D/g, ""));
    if (!amount || isNaN(num) || num <= 0) e.amount = "Nominal harus lebih dari 0.";
    if (!categoryId) e.categoryId = "Pilih kategori.";
    const dateError = validateTransactionDate(date);
    if (dateError) e.date = dateError;
    return e;
  }

  async function handleTemplateClick(template: SubscriptionTemplate) {
    setServerError(null);
    const templateCategory = template.category.trim();
    const category =
      categories.find((c) => c.id === templateCategory) ??
      categories.find((c) => normalizeCategoryName(c.name) === normalizeCategoryName(templateCategory));

    if (!category) {
      setServerError("Kategori template tidak ditemukan. Perbarui template atau pilih kategori yang tersedia.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createTransaction({
        type: "expense",
        amount: template.amount.toFixed(2),
        category_id: category.id,
        transaction_date: today,
        description: template.name,
      });
      showToast("Transaksi tersimpan.", "success");
      haptic.success();
      router.push("/beranda");
    } catch {
      haptic.error();
      setServerError("Gagal membuat dari template. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleAddTemplate() {
    if (!newTemplate.name || !newTemplate.amount || !newTemplate.category) return;
    const id = Date.now().toString();
    const updated = [...templates, {
      id,
      name: newTemplate.name,
      amount: parseFloat(newTemplate.amount.replace(/\D/g, "")),
      category: newTemplate.category,
    }];
    setTemplates(updated);
    setTemplatesState(updated);
    setNewTemplate({ name: "", amount: "", category: "" });
    setShowTemplateForm(false);
  }

  function handleDeleteTemplate(id: string) {
    const updated = templates.filter((t) => t.id !== id);
    setTemplates(updated);
    setTemplatesState(updated);
  }

  async function handleCreateCategoryInline() {
    const name = newCatName.trim();
    if (!name || isCreatingCat) return;
    setIsCreatingCat(true);
    try {
      const cat = await createCategory({ name, type });
      setCategories([cat]);
      setCategoryId(cat.id);
      setNewCatName("");
      setShowNewCat(false);
      haptic.success();
    } catch {
      haptic.error();
      setServerError("Gagal membuat kategori. Coba lagi.");
    } finally {
      setIsCreatingCat(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      haptic.warning();
      return;
    }
    setErrors({});
    setIsSubmitting(true);
    try {
      const num = parseFloat(amount.replace(/\D/g, ""));
      const txData = await createTransaction({
        type,
        amount: num.toFixed(2),
        category_id: categoryId,
        transaction_date: date,
        description: description.trim() || undefined,
      }) as { id?: string };
      if (source && txData?.id) setTransactionSource(txData.id, source);
      if (debtTag && txData?.id) {
        setDebtTag(txData.id, { tag: debtTag, settled: debtSettled });
      }
      showToast("Transaksi tersimpan.", "success");
      haptic.success();
      router.push("/beranda");
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
          setServerError("Transaksi gagal disimpan. Coba lagi.");
        }
      } else {
        setServerError("Transaksi gagal disimpan. Coba lagi.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      {/* Header */}
      <header className="w-full max-w-lg mx-auto px-4 py-4 flex items-center justify-between border-b border-border">
        <h1 className="text-xl font-bold text-text">Tambah Transaksi</h1>
        <Link
          href="/beranda"
          className="flex items-center justify-center w-11 h-11 rounded-lg text-text hover:bg-surface-muted transition-colors"
          aria-label="Tutup"
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
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </Link>
      </header>

      {/* Form */}
      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
          {/* Quick Add — input utama, mengisi form otomatis */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="quickAdd" className="text-sm font-medium text-text">
              Input Cepat
            </label>
            <input
              id="quickAdd"
              type="text"
              value={quickAdd}
              onChange={(e) => handleQuickAdd(e.target.value)}
              placeholder="kopi 20rb"
              className="h-12 rounded-xl border border-border bg-surface px-4 text-base text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
            />
            <span className="text-xs text-muted">cth: kopi 20rb → pengeluaran · gaji 5jt → pemasukan (<span className="font-mono text-text">rb/k/ribu</span> = ribuan, <span className="font-mono text-text">jt/juta</span> = jutaan)</span>
          </div>

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

          {/* Amount - focal point */}
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
            {!isCatLoading && !catError && categories.length === 0 && (
              <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border p-3">
                <p className="text-sm text-muted">
                  Belum ada kategori {type === "expense" ? "pengeluaran" : "pemasukan"}. Buat dulu biar bisa simpan.
                </p>
                {showNewCat ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      placeholder="Nama kategori"
                      aria-label="Nama kategori baru"
                      maxLength={100}
                      className="flex-1 h-11 px-4 rounded-xl bg-surface border border-border text-base text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={handleCreateCategoryInline}
                      disabled={isCreatingCat || !newCatName.trim()}
                      className="h-11 px-4 rounded-xl bg-accent text-accent-ink text-sm font-semibold hover:bg-accent/90 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {isCreatingCat ? "Membuat…" : "Buat"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowNewCat(true)}
                    className="self-start min-h-[44px] px-4 text-sm font-semibold text-accent hover:underline rounded"
                  >
                    + Buat kategori
                  </button>
                )}
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

          {/* Advanced options - collapsible */}
          <div className="flex flex-col gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              aria-expanded={showAdvanced}
              className="flex items-center justify-between p-2 -mx-2 text-sm font-medium text-text hover:bg-surface-muted rounded-lg transition-colors"
            >
              <span>Opsi Lanjutan (Template, Sumber, Kasbon)</span>
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
                className={`transition-transform ${showAdvanced ? "rotate-180" : ""}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {showAdvanced && (
              <div className="flex flex-col gap-4 pt-2">
                {/* Template one-tap */}
                <div className="flex flex-col gap-3">
                  <span className="text-sm font-medium text-text">Template Cepat</span>
                  <div className="flex flex-wrap gap-2">
                    {templates.map((t) => (
                      <div key={t.id} className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleTemplateClick(t)}
                          disabled={isSubmitting}
                          className="px-4 h-11 rounded-full bg-surface-muted text-text text-sm font-medium hover:bg-surface-muted/80 active:scale-95 transition-all disabled:opacity-40"
                        >
                          {t.name}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(t.id)}
                          className="w-11 h-11 rounded-full flex items-center justify-center text-muted hover:bg-surface-muted hover:text-text transition-colors"
                          aria-label={`Hapus ${t.name}`}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    {!showTemplateForm && (
                      <button
                        type="button"
                        onClick={() => setShowTemplateForm(true)}
                        className="px-4 h-11 rounded-full border border-dashed border-border text-muted text-sm font-medium hover:border-text hover:text-text transition-colors"
                      >
                        + Tambah
                      </button>
                    )}
                  </div>
                  {showTemplateForm && (
                    <div className="flex flex-col gap-2 p-3 rounded-xl bg-surface-muted border border-border">
                      <input
                        type="text"
                        placeholder="Nama template"
                        aria-label="Nama template"
                        value={newTemplate.name}
                        onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                        className="h-11 rounded-lg border border-border bg-surface px-3 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="Nominal"
                        aria-label="Nominal template"
                        value={groupThousands(newTemplate.amount)}
                        onChange={(e) => setNewTemplate({ ...newTemplate, amount: e.target.value.replace(/\D/g, "") })}
                        className="h-11 rounded-lg border border-border bg-surface px-3 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                      <select
                        value={newTemplate.category}
                        onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                        aria-label="Kategori template"
                        className="h-11 rounded-lg border border-border bg-surface px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent"
                      >
                        <option value="">Pilih kategori</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleAddTemplate}
                          disabled={!newTemplate.name || !newTemplate.amount || !newTemplate.category}
                          className="flex-1 h-11 rounded-lg bg-accent text-accent-ink text-sm font-semibold hover:bg-accent/90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Simpan
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowTemplateForm(false);
                            setNewTemplate({ name: "", amount: "", category: "" });
                          }}
                          className="px-4 h-11 rounded-lg bg-surface border border-border text-sm font-semibold text-text hover:bg-surface-muted active:scale-95 transition-all"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Source */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="source" className="text-sm font-medium text-text">
                    Sumber
                    <span className="text-muted font-normal"> (opsional)</span>
                  </label>
                  <select
                    id="source"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="h-12 rounded-xl border border-border bg-surface px-4 text-base text-text focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
                  >
                    <option value="">Tidak ditentukan</option>
                    <option value="Tunai">Tunai</option>
                    <option value="Bank">Bank</option>
                    <option value="E-wallet">E-wallet</option>
                  </select>
                </div>

                {/* Debt Tag */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="debtTag" className="text-sm font-medium text-text">
                    Kasbon
                    <span className="text-muted font-normal"> (opsional)</span>
                  </label>
                  <select
                    id="debtTag"
                    value={debtTag}
                    onChange={(e) => {
                      const val = e.target.value as "" | "utang" | "piutang";
                      setDebtTagState(val);
                      if (!val) setDebtSettled(false);
                    }}
                    className="h-12 rounded-xl border border-border bg-surface px-4 text-base text-text focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
                  >
                    <option value="">Tidak ada</option>
                    <option value="utang">Utang</option>
                    <option value="piutang">Piutang</option>
                  </select>
                </div>

                {debtTag && (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={debtSettled}
                      onChange={(e) => setDebtSettled(e.target.checked)}
                      className="w-5 h-5 rounded border-2 border-border text-accent focus:ring-2 focus:ring-accent focus:ring-offset-2 transition-colors"
                    />
                    <span className="text-base text-text">Sudah lunas</span>
                  </label>
                )}
              </div>
            )}
          </div>

          {serverError && (
            <div
              role="alert"
              className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-danger"
            >
              {serverError}
            </div>
          )}

          {/* Submit */}
          <Button type="submit" className="w-full" disabled={isSubmitting || isCatLoading || (catError && categories.length === 0)}>
            {isSubmitting ? "Menyimpan…" : catError && categories.length === 0 ? "Pilih kategori terlebih dahulu" : "Simpan Transaksi"}
          </Button>
        </form>
      </main>
    </div>
  );
}
