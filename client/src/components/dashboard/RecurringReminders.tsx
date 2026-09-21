"use client";

import { useState } from "react";
import { Bell, Check, Plus, Trash2 } from "lucide-react";
import { createTransaction } from "@/lib/transactions";
import { listCategories } from "@/lib/categories";
import { todayLocalISO } from "@/lib/date";
import { getRecurringTransactions, isRecurringDue, saveRecurringTransactions, type RecurringTransaction } from "@/lib/local-storage";

export function RecurringReminders() {
  const [items, setItems] = useState<RecurringTransaction[]>(getRecurringTransactions);
  const [form, setForm] = useState({ name: "", amount: "", category: "Tagihan", day: "1" });
  const [message, setMessage] = useState<string | null>(null);

  function persist(next: RecurringTransaction[]) {
    setItems(next);
    saveRecurringTransactions(next);
  }

  function addReminder() {
    const amount = Number(form.amount.replace(/\D/g, ""));
    const day = Number(form.day);
    if (!form.name.trim() || amount <= 0 || day < 1 || day > 31) return;
    persist([...items, { id: crypto.randomUUID(), name: form.name.trim(), amount, category: form.category.trim() || "Tagihan", day, active: true }]);
    setForm({ name: "", amount: "", category: "Tagihan", day: "1" });
  }

  async function confirm(item: RecurringTransaction) {
    try {
      const categories = await listCategories({ type: "expense" });
      const category = categories.items.find((value) => value.name.toLowerCase() === item.category.toLowerCase()) ?? categories.items[0];
      if (!category) throw new Error("Kategori tidak tersedia");
      await createTransaction({ type: "expense", amount: item.amount.toFixed(2), category_id: category.id, transaction_date: todayLocalISO(), description: item.name });
      persist(items.map((value) => value.id === item.id ? { ...value, lastConfirmed: todayLocalISO() } : value));
      window.dispatchEvent(new CustomEvent("uangku:tx-changed"));
      setMessage(`${item.name} sudah dicatat.`);
    } catch { setMessage("Gagal mencatat. Coba lagi saat online."); }
  }

  const today = new Date();

  return (
    <section aria-label="Transaksi berulang" className="flex flex-col gap-4 p-5 rounded-2xl bg-surface border border-border shadow-sm">
      <div className="flex items-center gap-2"><Bell className="w-4 h-4 text-accent" aria-hidden="true" /><h2 className="text-xs font-semibold text-muted uppercase tracking-wide">Pengingat transaksi</h2></div>
      {items.map((item) => {
        const due = isRecurringDue(item, today);
        return (
        <div key={item.id} className="flex items-center gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
          <div className="min-w-0 flex-1"><p className="font-semibold text-text truncate">{item.name}</p><p className="text-xs text-muted">Rp {item.amount.toLocaleString("id-ID")} · tanggal {item.day}</p></div>
          <button type="button" onClick={() => void confirm(item)} disabled={!due} className="inline-flex items-center gap-1 h-9 px-3 rounded-lg bg-accent text-accent-ink text-xs font-semibold disabled:bg-surface-muted disabled:text-muted"><Check className="w-3.5 h-3.5" aria-hidden="true" />{due ? "Catat" : "Tersimpan"}</button>
          <button type="button" aria-label={`Hapus pengingat ${item.name}`} onClick={() => persist(items.filter((value) => value.id !== item.id))} className="p-2 text-muted hover:text-danger"><Trash2 className="w-4 h-4" aria-hidden="true" /></button>
        </div>
        );
      })}
      <div className="grid grid-cols-2 gap-2">
        <input aria-label="Nama pengingat" placeholder="Nama, mis. Internet" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="col-span-2 h-10 rounded-lg border border-border bg-surface px-3 text-sm" />
        <input aria-label="Nominal pengingat" inputMode="numeric" placeholder="Nominal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="h-10 rounded-lg border border-border bg-surface px-3 text-sm" />
        <input aria-label="Tanggal pengingat" type="number" min="1" max="31" placeholder="Tanggal" value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })} className="h-10 rounded-lg border border-border bg-surface px-3 text-sm" />
        <button type="button" onClick={addReminder} className="col-span-2 inline-flex items-center justify-center gap-2 h-10 rounded-lg border border-dashed border-border text-sm font-semibold text-accent"><Plus className="w-4 h-4" aria-hidden="true" />Tambah pengingat</button>
      </div>
      {message && <p role="status" className="text-xs text-muted">{message}</p>}
    </section>
  );
}