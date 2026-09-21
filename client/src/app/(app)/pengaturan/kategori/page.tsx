"use client";

import { createElement, useEffect, useState } from "react";
import { listCategories, createCategory, updateCategory, deleteCategory } from "@/lib/categories";
import { deleteBudget, listBudgets, upsertBudget } from "@/lib/budgets";
import { formatRupiah } from "@/lib/format";
import type { Budget, Category, TransactionType } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { getCategoryColor, getCategoryIcon } from "@/lib/category-icons";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ApiResponseError } from "@/lib/api";

export default function KategoriPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Record<string, Budget>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<TransactionType>("expense");
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const [cats, budgetRes] = await Promise.all([listCategories(), listBudgets()]);
      setItems(cats.items);
      const map: Record<string, Budget> = {};
      for (const b of budgetRes.items) map[b.category_id] = b;
      setBudgets(map);
    } catch (err) {
      if (err instanceof ApiResponseError) {
        setError(err.message);
      } else {
        setError("Gagal memuat kategori.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAdd() {
    if (!newName.trim()) {
      setAddError("Nama kategori wajib diisi.");
      return;
    }

    setIsAdding(true);
    setAddError(null);
    try {
      await createCategory({ name: newName.trim(), type: newType });
      await load();
      setNewName("");
      setNewType("expense");
      setShowAddForm(false);
    } catch (err) {
      if (err instanceof ApiResponseError) {
        setAddError(err.message);
      } else {
        setAddError("Gagal menambah kategori. Coba lagi.");
      }
    } finally {
      setIsAdding(false);
    }
  }

  const expenseItems = items.filter((c) => c.type === "expense");
  const incomeItems = items.filter((c) => c.type === "income");

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6" role="status" aria-label="Memuat kategori">
        <h1 className="text-xl font-bold text-text">Kategori</h1>
        <div className="flex flex-col gap-3 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-surface-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-bold text-text">Kategori</h1>
        <p role="alert" className="text-sm text-danger">{error}</p>
        <Button variant="secondary" onClick={load}>
          Coba lagi
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">Kategori</h1>
        {!showAddForm && (
          <Button size="sm" onClick={() => setShowAddForm(true)}>
            Tambah
          </Button>
        )}
      </div>

      {showAddForm && (
        <div className="flex flex-col gap-4 p-4 rounded-xl bg-surface border border-border">
          <Input
            label="Nama Kategori"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            error={addError || undefined}
            placeholder="Contoh: Makanan, Transportasi"
          />
          <Select
            label="Tipe"
            value={newType}
            onChange={(e) => setNewType(e.target.value as TransactionType)}
          >
            <option value="expense">Pengeluaran</option>
            <option value="income">Pemasukan</option>
          </Select>
          <div className="flex gap-2">
            <Button onClick={handleAdd} loading={isAdding} className="flex-1">
              Simpan
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setShowAddForm(false);
                setNewName("");
                setNewType("expense");
                setAddError(null);
              }}
              disabled={isAdding}
              className="flex-1"
            >
              Batal
            </Button>
          </div>
        </div>
      )}

      {expenseItems.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-text">Pengeluaran</h2>
          <div className="divide-y divide-border rounded-xl border border-border bg-surface overflow-hidden">
            {expenseItems.map((cat) => (
              <CategoryRow key={cat.id} category={cat} budget={budgets[cat.id]} onUpdate={load} />
            ))}
          </div>
        </div>
      )}

      {incomeItems.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-text">Pemasukan</h2>
          <div className="divide-y divide-border rounded-xl border border-border bg-surface overflow-hidden">
            {incomeItems.map((cat) => (
              <CategoryRow key={cat.id} category={cat} budget={budgets[cat.id]} onUpdate={load} />
            ))}
          </div>
        </div>
      )}

      {items.length === 0 && (
        <EmptyState
          mood="excited"
          title="Belum ada kategori"
          description="Bikin kategori sesuai gaya hidupmu, misalnya Jajan atau Profilaksi."
          actions={
            <Button size="sm" onClick={() => setShowAddForm(true)}>
              Tambah kategori
            </Button>
          }
        />
      )}
    </div>
  );
}

function CategoryRow({
  category,
  budget,
  onUpdate,
}: {
  category: Category;
  budget?: Budget;
  onUpdate: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(category.name);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [budgetInput, setBudgetInput] = useState(budget?.amount ?? "");
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const [budgetError, setBudgetError] = useState<string | null>(null);

  async function handleRename() {
    if (!editName.trim()) {
      setEditError("Nama kategori wajib diisi.");
      return;
    }

    if (editName.trim() === category.name) {
      setIsEditing(false);
      setEditError(null);
      return;
    }

    setIsUpdating(true);
    setEditError(null);
    try {
      await updateCategory(category.id, { name: editName.trim() });
      setIsEditing(false);
      onUpdate();
    } catch (err) {
      if (err instanceof ApiResponseError) {
        setEditError(err.message);
      } else {
        setEditError("Gagal mengubah nama kategori. Coba lagi.");
      }
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteCategory(category.id);
      onUpdate();
    } catch (err) {
      if (err instanceof ApiResponseError) {
        if (err.status === 409 && err.code === "CATEGORY_IN_USE") {
          setDeleteError("Kategori sedang digunakan transaksi.");
        } else {
          setDeleteError(err.message);
        }
      } else {
        setDeleteError("Gagal menghapus kategori. Coba lagi.");
      }
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSaveBudget() {
    const digits = budgetInput.replace(/\D/g, "");
    const num = digits ? parseFloat(digits) : NaN;
    if (!Number.isFinite(num) || num <= 0) {
      setBudgetError("Nominal anggaran harus lebih dari 0.");
      return;
    }
    setIsSavingBudget(true);
    setBudgetError(null);
    try {
      await upsertBudget(category.id, String(num));
      setShowBudgetForm(false);
      onUpdate();
    } catch (err) {
      setBudgetError(
        err instanceof ApiResponseError && err.message
          ? err.message
          : "Gagal menyimpan anggaran. Coba lagi."
      );
    } finally {
      setIsSavingBudget(false);
    }
  }

  async function handleDeleteBudget() {
    setIsSavingBudget(true);
    setBudgetError(null);
    try {
      await deleteBudget(category.id);
      setBudgetInput("");
      setShowBudgetForm(false);
      onUpdate();
    } catch {
      setBudgetError("Gagal menghapus anggaran. Coba lagi.");
    } finally {
      setIsSavingBudget(false);
    }
  }

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2 p-4">
        <Input
          label="Nama Kategori"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          error={editError || undefined}
          autoFocus
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={handleRename} loading={isUpdating} className="flex-1">
            Simpan
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setIsEditing(false);
              setEditName(category.name);
              setEditError(null);
            }}
            disabled={isUpdating}
            className="flex-1"
          >
            Batal
          </Button>
        </div>
      </div>
    );
  }

  if (showDeleteConfirm) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <p className="text-sm text-text">
          Hapus kategori <strong>{category.name}</strong>?
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="danger"
            onClick={handleDelete}
            loading={isDeleting}
            className="flex-1"
          >
            Hapus
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowDeleteConfirm(false)}
            disabled={isDeleting}
            className="flex-1"
          >
            Batal
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {(() => {
            const color = getCategoryColor(category.name);
            return <span className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${color.background}`}>{createElement(getCategoryIcon(category.name), { className: `w-4 h-4 ${color.foreground}`, "aria-hidden": true })}</span>;
          })()}
          <div className="flex flex-col min-w-0">
          <span className="text-base text-text">{category.name}</span>
          {budget?.amount && (
            <span className="text-xs text-muted">
              Anggaran <span className="num">{formatRupiah(budget.amount)}</span>/bln
            </span>
          )}
          </div>
        </div>
        <div className="flex gap-2">
            <button
              onClick={() => {
                setBudgetInput(budget?.amount ?? "");
                setBudgetError(null);
                setShowBudgetForm((v) => !v);
              }}
              className="text-sm text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent rounded px-2 py-1 min-h-[36px] flex items-center"
            >
              Anggaran
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="text-sm text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent rounded px-2 py-1 min-h-[36px] flex items-center"
            >
              Ubah
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-sm text-danger hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger rounded px-2 py-1 min-h-[36px] flex items-center"
            >
              Hapus
            </button>
        </div>
      </div>
      {showBudgetForm && (
        <div className="flex flex-col gap-2 pt-1">
          <Input
            label="Anggaran per bulan (Rp)"
            value={budgetInput}
            onChange={(e) => setBudgetInput(e.target.value)}
            error={budgetError || undefined}
            hint="Berlaku tiap bulan"
            inputMode="numeric"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveBudget} loading={isSavingBudget} className="flex-1">
              Simpan
            </Button>
            {budget?.amount && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDeleteBudget}
                disabled={isSavingBudget}
                className="flex-1 text-danger"
              >
                Hapus
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowBudgetForm(false);
                setBudgetInput(budget?.amount ?? "");
                setBudgetError(null);
              }}
              disabled={isSavingBudget}
              className="flex-1"
            >
              Batal
            </Button>
          </div>
        </div>
      )}
        {deleteError && (
          <p role="alert" className="text-sm text-danger">
            {deleteError}
          </p>
        )}
    </div>
  );
}
