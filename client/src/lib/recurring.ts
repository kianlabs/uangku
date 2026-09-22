import { apiFetch } from "./api";
import { listCategories } from "./categories";
import type { RecurringTemplate, TransactionType } from "./types";

export interface CreateRecurringParams {
  name: string;
  amount: string;
  type: TransactionType;
  category_id: string;
  day: number;
}

export interface UpdateRecurringParams {
  name?: string;
  amount?: string;
  type?: TransactionType;
  category_id?: string;
  day?: number;
  active?: boolean;
}

export async function listRecurring(): Promise<RecurringTemplate[]> {
  const res = await apiFetch<{ items: RecurringTemplate[] }>("/api/v1/recurring");
  return res.items;
}

export async function createRecurring(params: CreateRecurringParams): Promise<RecurringTemplate> {
  return apiFetch<RecurringTemplate>("/api/v1/recurring", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function updateRecurring(id: string, params: UpdateRecurringParams): Promise<RecurringTemplate> {
  return apiFetch<RecurringTemplate>(`/api/v1/recurring/${id}`, {
    method: "PATCH",
    body: JSON.stringify(params),
  });
}

export async function deleteRecurring(id: string): Promise<void> {
  return apiFetch<void>(`/api/v1/recurring/${id}`, { method: "DELETE" });
}

export async function confirmRecurring(id: string): Promise<{ id: string }> {
  return apiFetch<{ id: string }>(`/api/v1/recurring/${id}/confirm`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function isRecurringDue(
  item: { day: number; active: boolean; last_confirmed: string | null },
  today = new Date()
): boolean {
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  if (!item.active || today.getDate() < Math.min(item.day, lastDay)) return false;
  const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  return item.last_confirmed?.startsWith(month) !== true;
}

const LEGACY_KEY = "uangku_recurring_transactions";

/**
 * Migrasi sekali: pindahkan pengingat lokal lama (browser) ke server.
 * Kategori dicocokkan by nama (tipe expense, seperti perilaku lama);
 * yang gagal dilewat. Mengembalikan jumlah yang berhasil.
 */
export async function migrateLegacyRecurring(): Promise<number> {
  if (typeof window === "undefined") return 0;
  let legacy: { name: string; amount: number; category: string; day: number }[];
  try {
    const parsed = JSON.parse(localStorage.getItem(LEGACY_KEY) || "[]");
    if (!Array.isArray(parsed) || parsed.length === 0) return 0;
    legacy = parsed;
  } catch {
    localStorage.removeItem(LEGACY_KEY);
    return 0;
  }
  let categories;
  try {
    categories = (await listCategories({ type: "expense" })).items;
  } catch {
    return 0;
  }
  let moved = 0;
  for (const item of legacy) {
    const category =
      categories.find((c) => c.name.toLowerCase() === String(item.category ?? "").toLowerCase()) ??
      categories[0];
    if (!category || !item.name || !(item.amount > 0)) continue;
    try {
      await createRecurring({
        name: String(item.name),
        amount: String(item.amount),
        type: "expense",
        category_id: category.id,
        day: Math.min(31, Math.max(1, Number(item.day) || 1)),
      });
      moved += 1;
    } catch {
      // Satu gagal tidak menggagalkan sisanya.
    }
  }
  localStorage.removeItem(LEGACY_KEY);
  return moved;
}
