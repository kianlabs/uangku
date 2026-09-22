"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellRing, Check, Pause, Play, Plus, Trash2 } from "lucide-react";
import { listCategories } from "@/lib/categories";
import { todayLocalISO } from "@/lib/date";
import { haptic } from "@/lib/haptics";
import { showToast } from "@/lib/toast";
import type { Category, RecurringTemplate, TransactionType } from "@/lib/types";
import {
  confirmRecurring,
  createRecurring,
  deleteRecurring,
  isRecurringDue,
  listRecurring,
  migrateLegacyRecurring,
  updateRecurring,
} from "@/lib/recurring";
import {
  getNotifyPermission,
  isNotifyEnabled,
  requestNotifyPermission,
  showReminderNotification,
  wasNotifiedToday,
  type NotifyPermission,
} from "@/lib/reminder-notify";
import { ApiResponseError } from "@/lib/api";

export function RecurringReminders() {
  const [items, setItems] = useState<RecurringTemplate[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", amount: "", day: "1", type: "expense" as TransactionType, categoryId: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [perm, setPerm] = useState<NotifyPermission>(() => getNotifyPermission());
  const [offerHidden, setOfferHidden] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      await migrateLegacyRecurring();
      const [recs, cats] = await Promise.all([listRecurring(), listCategories()]);
      setItems(recs);
      setCategories(cats.items);
    } catch (err) {
      setLoadError(err instanceof ApiResponseError ? err.message : "Gagal memuat pengingat.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const today = new Date();
  const dueItems = items.filter((item) => isRecurringDue(item, today));

  useEffect(() => {
    const now = new Date();
    const due = items.filter((item) => isRecurringDue(item, now));
    if (due.length === 0 || !isNotifyEnabled()) return;
    if (getNotifyPermission() !== "granted") return;
    const ids = due.map((item) => item.id);
    if (wasNotifiedToday(ids)) return;
    void showReminderNotification(due);
  }, [items]);

  async function enableNotifications() {
    const granted = await requestNotifyPermission();
    setPerm(getNotifyPermission());
    if (granted) {
      haptic.success();
      await showReminderNotification(
        items.filter((item) => isRecurringDue(item, new Date()))
      );
    } else {
      haptic.warning();
    }
  }

  function catsFor(type: TransactionType) {
    return categories.filter((c) => c.type === type);
  }

  async function addReminder() {
    const amount = Number(form.amount.replace(/\D/g, ""));
    const day = Number(form.day);
    if (!form.name.trim()) {
      setFormError("Isi nama pengingat.");
      return;
    }
    if (!(amount > 0)) {
      setFormError("Isi nominal lebih dari 0.");
      return;
    }
    if (!(day >= 1 && day <= 31)) {
      setFormError("Isi tanggal 1–31.");
      return;
    }
    const categoryId = form.categoryId || catsFor(form.type)[0]?.id;
    if (!categoryId) {
      setFormError("Buat kategori dulu di Pengaturan.");
      return;
    }
    setFormError(null);
    try {
      const rec = await createRecurring({
        name: form.name.trim(),
        amount: String(amount),
        type: form.type,
        category_id: categoryId,
        day,
      });
      setItems((prev) => [...prev, rec]);
      setForm({ name: "", amount: "", day: "1", type: "expense", categoryId: "" });
      haptic.success();
    } catch (err) {
      haptic.error();
      setFormError(err instanceof ApiResponseError ? err.message : "Gagal menambah pengingat.");
    }
  }

  async function confirm(item: RecurringTemplate) {
    try {
      await confirmRecurring(item.id);
      setItems((prev) =>
        prev.map((v) => (v.id === item.id ? { ...v, last_confirmed: todayLocalISO() } : v))
      );
      window.dispatchEvent(new CustomEvent("uangku:tx-changed"));
      showToast(`${item.name} sudah dicatat.`, "success");
      setMessage(`${item.name} sudah dicatat.`);
    } catch (err) {
      if (err instanceof ApiResponseError && err.code === "ALREADY_CONFIRMED") {
        setItems((prev) =>
          prev.map((v) => (v.id === item.id ? { ...v, last_confirmed: todayLocalISO() } : v))
        );
        setMessage(`${item.name} sudah dicatat bulan ini.`);
      } else {
        setMessage("Gagal mencatat. Coba lagi saat online.");
      }
    }
  }

  async function toggleActive(item: RecurringTemplate) {
    try {
      const rec = await updateRecurring(item.id, { active: !item.active });
      setItems((prev) => prev.map((v) => (v.id === item.id ? rec : v)));
    } catch {
      setMessage("Gagal mengubah status. Coba lagi.");
    }
  }

  async function remove(item: RecurringTemplate) {
    try {
      await deleteRecurring(item.id);
      setItems((prev) => prev.filter((v) => v.id !== item.id));
    } catch {
      setMessage("Gagal menghapus. Coba lagi.");
    }
  }

  async function saveEdit(item: RecurringTemplate, patch: { name: string; amount: string; day: string }) {
    const amount = Number(patch.amount.replace(/\D/g, ""));
    const day = Number(patch.day);
    if (!patch.name.trim() || !(amount > 0) || !(day >= 1 && day <= 31)) {
      setMessage("Nama, nominal (>0), dan tanggal (1–31) harus valid.");
      return;
    }
    try {
      const rec = await updateRecurring(item.id, {
        name: patch.name.trim(),
        amount: String(amount),
        day,
      });
      setItems((prev) => prev.map((v) => (v.id === item.id ? rec : v)));
      setEditingId(null);
      haptic.success();
    } catch (err) {
      haptic.error();
      setMessage(err instanceof ApiResponseError ? err.message : "Gagal menyimpan. Coba lagi.");
    }
  }

  if (isLoading) {
    return (
      <section aria-label="Transaksi berulang" className="flex flex-col gap-3 p-5 rounded-2xl bg-surface border border-border shadow-sm">
        <div className="h-5 w-40 rounded bg-surface-muted animate-pulse" />
        <div className="h-12 rounded-xl bg-surface-muted animate-pulse" />
      </section>
    );
  }

  if (loadError) {
    return (
      <section aria-label="Transaksi berulang" className="flex flex-col gap-3 p-5 rounded-2xl bg-surface border border-border shadow-sm">
        <p role="alert" className="text-sm text-danger">{loadError}</p>
        <button
          type="button"
          onClick={() => {
            setIsLoading(true);
            void load();
          }}
          className="self-start min-h-[44px] px-4 text-sm font-semibold text-accent hover:underline rounded"
        >
          Coba lagi
        </button>
      </section>
    );
  }

  return (
    <section aria-label="Transaksi berulang" className="flex flex-col gap-4 p-5 rounded-2xl bg-surface border border-border shadow-sm">
      <div className="flex items-center gap-2"><Bell className="w-4 h-4 text-accent" aria-hidden="true" /><h2 className="text-xs font-semibold text-muted uppercase tracking-wide">Pengingat transaksi</h2></div>
      {dueItems.length > 0 && isNotifyEnabled() && perm === "default" && !offerHidden && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-accent/10 border border-accent/30">
          <BellRing className="w-5 h-5 text-accent shrink-0" aria-hidden="true" />
          <p className="flex-1 text-xs text-text">Ada tagihan jatuh tempo. Mau diingatkan lewat notifikasi HP?</p>
          <button
            type="button"
            onClick={() => void enableNotifications()}
            className="min-h-[44px] px-3 rounded-lg bg-accent text-accent-ink text-xs font-bold shrink-0 hover:bg-accent/90 active:scale-95 transition-all"
          >
            Nyalakan
          </button>
          <button
            type="button"
            onClick={() => setOfferHidden(true)}
            className="min-h-[44px] px-2 text-xs font-medium text-muted hover:text-text shrink-0 rounded"
          >
            Nanti
          </button>
        </div>
      )}
      {items.map((item) => {
        const due = isRecurringDue(item, today);
        const editing = editingId === item.id;
        return (
          <div key={item.id} className="flex flex-col gap-2 border-b border-border pb-3 last:border-0 last:pb-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setEditingId(editing ? null : item.id)}
                title="Ubah"
                className="min-w-0 flex-1 text-left rounded"
              >
                <p className="font-semibold text-text truncate">{item.name}</p>
                <p className="text-xs text-muted">
                  Rp {Number(item.amount).toLocaleString("id-ID")} · tanggal {item.day} · {item.category_name}
                  {!item.active && " · nonaktif"}
                </p>
              </button>
              <button
                type="button"
                onClick={() => void confirm(item)}
                disabled={!due}
                className="inline-flex items-center gap-1 min-h-[44px] px-3 rounded-lg bg-accent text-accent-ink text-xs font-semibold disabled:bg-surface-muted disabled:text-muted"
              >
                <Check className="w-3.5 h-3.5" aria-hidden="true" />{due ? "Catat" : "Tersimpan"}
              </button>
              <button
                type="button"
                onClick={() => void toggleActive(item)}
                aria-label={item.active ? `Nonaktifkan ${item.name}` : `Aktifkan ${item.name}`}
                title={item.active ? "Nonaktifkan" : "Aktifkan"}
                className="min-w-[44px] min-h-[44px] p-2 text-muted hover:text-text rounded"
              >
                {item.active ? <Pause className="w-4 h-4" aria-hidden="true" /> : <Play className="w-4 h-4" aria-hidden="true" />}
              </button>
              <button
                type="button"
                aria-label={`Hapus pengingat ${item.name}`}
                onClick={() => void remove(item)}
                className="min-w-[44px] min-h-[44px] p-2 text-muted hover:text-danger rounded"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            {editing && (
              <EditForm
                key={item.id}
                initial={{ name: item.name, amount: String(Math.round(Number(item.amount))), day: String(item.day) }}
                onCancel={() => setEditingId(null)}
                onSave={(patch) => void saveEdit(item, patch)}
              />
            )}
          </div>
        );
      })}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2" role="group" aria-label="Jenis pengingat">
          {(["expense", "income"] as TransactionType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setForm((f) => ({ ...f, type: t, categoryId: "" }))}
              aria-pressed={form.type === t}
              className={`flex-1 h-11 rounded-lg text-sm font-semibold transition-colors ${
                form.type === t ? "bg-accent text-accent-ink" : "bg-surface-muted text-muted"
              }`}
            >
              {t === "expense" ? "Pengeluaran" : "Pemasukan"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input aria-label="Nama pengingat" placeholder="Nama, mis. Internet" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="col-span-2 h-11 rounded-lg border border-border bg-surface px-3 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent" />
          <input aria-label="Nominal pengingat" inputMode="numeric" placeholder="Nominal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="h-11 rounded-lg border border-border bg-surface px-3 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent" />
          <input aria-label="Tanggal pengingat" type="number" min={1} max={31} placeholder="Tanggal" value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })} className="h-11 rounded-lg border border-border bg-surface px-3 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent" />
          <label className="col-span-2 flex flex-col gap-1">
            <span className="text-xs font-medium text-muted">Kategori</span>
            <select
              aria-label="Kategori pengingat"
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              className="h-11 rounded-lg border border-border bg-surface px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">Otomatis ({catsFor(form.type)[0]?.name ?? "belum ada"})</option>
              {catsFor(form.type).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
        </div>
        {formError && <p role="alert" className="text-xs text-danger">{formError}</p>}
        <button type="button" onClick={() => void addReminder()} className="inline-flex items-center justify-center gap-2 min-h-[44px] rounded-lg border border-dashed border-border text-sm font-semibold text-accent"><Plus className="w-4 h-4" aria-hidden="true" />Tambah pengingat</button>
      </div>
      {message && <p role="status" className="text-xs text-muted">{message}</p>}
    </section>
  );
}

function EditForm({
  initial,
  onCancel,
  onSave,
}: {
  initial: { name: string; amount: string; day: string };
  onCancel: () => void;
  onSave: (patch: { name: string; amount: string; day: string }) => void;
}) {
  const [draft, setDraft] = useState(initial);
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-surface-muted p-3">
      <input aria-label="Ubah nama pengingat" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="h-11 rounded-lg border border-border bg-surface px-3 text-sm" />
      <div className="flex gap-2">
        <input aria-label="Ubah nominal pengingat" inputMode="numeric" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} className="flex-1 h-11 rounded-lg border border-border bg-surface px-3 text-sm" />
        <input aria-label="Ubah tanggal pengingat" type="number" min={1} max={31} value={draft.day} onChange={(e) => setDraft({ ...draft, day: e.target.value })} className="w-24 h-11 rounded-lg border border-border bg-surface px-3 text-sm" />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => onSave(draft)} className="flex-1 h-11 rounded-lg bg-accent text-accent-ink text-sm font-semibold">Simpan</button>
        <button type="button" onClick={onCancel} className="flex-1 h-11 rounded-lg bg-surface border border-border text-sm font-semibold">Batal</button>
      </div>
    </div>
  );
}
