/**
 * local-storage.ts — LocalStorage helpers dengan backend sync.
 *
 * LocalStorage adalah cache lokal (instant read/write untuk UX).
 * Backend adalah source of truth — setiap write di-sync via fire-and-forget PATCH.
 *
 * Hydration dari backend dilakukan di AuthContext setelah login/getMe
 * via seedLocalStorageFromPreferences().
 */

import type { UserPreferences } from "./types";

export interface TransactionSource {
  source: "Tunai" | "Bank" | "E-wallet";
}

export interface DebtTag {
  tag: "utang" | "piutang";
  settled: boolean;
}

export interface SubscriptionTemplate {
  id: string;
  name: string;
  amount: number;
  category: string;
}

const SOURCES_KEY = "uangku_tx_sources";
const DEBT_TAGS_KEY = "uangku_debt_tags";
const PAYDAY_KEY = "uangku_payday";
const TEMPLATES_KEY = "uangku_templates";

// ---------------------------------------------------------------------------
// Hydration — seed localStorage dari data backend (dipanggil di AuthContext)
// ---------------------------------------------------------------------------

export function seedLocalStorageFromPreferences(prefs: UserPreferences): void {
  if (typeof window === "undefined") return;

  if (prefs.payday != null) {
    localStorage.setItem(PAYDAY_KEY, String(prefs.payday));
  }
  // Merge, don't blind-overwrite: empty objects/arrays from backend
  // (new user) must not wipe local defaults (e.g. subscription templates).
  if (prefs.tx_sources != null && Object.keys(prefs.tx_sources).length > 0) {
    localStorage.setItem(SOURCES_KEY, JSON.stringify(prefs.tx_sources));
  }
  if (prefs.debt_tags != null && Object.keys(prefs.debt_tags).length > 0) {
    localStorage.setItem(DEBT_TAGS_KEY, JSON.stringify(prefs.debt_tags));
  }
  if (prefs.templates != null && prefs.templates.length > 0) {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(prefs.templates));
  }
}

// ---------------------------------------------------------------------------
// Internal: sync satu field ke backend (fire-and-forget)
// ---------------------------------------------------------------------------

function syncToBackend(partial: Partial<UserPreferences>): void {
  // Dinamically import untuk avoid circular dependency & SSR issues.
  // Fire-and-forget — error tidak perlu ditangani (localStorage tetap terupdate).
  import("./preferences")
    .then(({ updatePreferences }) => updatePreferences(partial))
    .catch(() => {
      // Intentional no-op: sync gagal tidak mengganggu UX
    });
}

// ---------------------------------------------------------------------------
// Transaction sources
// ---------------------------------------------------------------------------

export function getTransactionSource(txId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SOURCES_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data === "object" && data !== null && txId in data) {
      return data[txId] || null;
    }
    return null;
  } catch {
    return null;
  }
}

export function setTransactionSource(txId: string, source: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(SOURCES_KEY) || "{}";
    const data: Record<string, string> = JSON.parse(raw);
    data[txId] = source;
    localStorage.setItem(SOURCES_KEY, JSON.stringify(data));
    syncToBackend({ tx_sources: data });
  } catch {
    localStorage.setItem(SOURCES_KEY, JSON.stringify({ [txId]: source }));
    syncToBackend({ tx_sources: { [txId]: source } });
  }
}

// ---------------------------------------------------------------------------
// Debt tags
// ---------------------------------------------------------------------------

export function getDebtTag(txId: string): DebtTag | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DEBT_TAGS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data === "object" && data !== null && txId in data) {
      return data[txId] || null;
    }
    return null;
  } catch {
    return null;
  }
}

export function setDebtTag(txId: string, tag: DebtTag): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(DEBT_TAGS_KEY) || "{}";
    const data: Record<string, DebtTag> = JSON.parse(raw);
    data[txId] = tag;
    localStorage.setItem(DEBT_TAGS_KEY, JSON.stringify(data));
    syncToBackend({ debt_tags: data });
  } catch {
    localStorage.setItem(DEBT_TAGS_KEY, JSON.stringify({ [txId]: tag }));
    syncToBackend({ debt_tags: { [txId]: tag } });
  }
}

// ---------------------------------------------------------------------------
// Payday
// ---------------------------------------------------------------------------

export function getPayday(): number {
  if (typeof window === "undefined") return 1;
  try {
    const raw = localStorage.getItem(PAYDAY_KEY);
    return raw ? parseInt(raw, 10) : 1;
  } catch {
    return 1;
  }
}

export function setPayday(day: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PAYDAY_KEY, day.toString());
  syncToBackend({ payday: day });
}

// ---------------------------------------------------------------------------
// Subscription templates
// ---------------------------------------------------------------------------

export function getTemplates(): SubscriptionTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    if (!raw) {
      return [
        { id: "1", name: "Kos", amount: 1000000, category: "Tagihan" },
        { id: "2", name: "Parkir", amount: 50000, category: "Transportasi" },
        { id: "3", name: "Paket data", amount: 100000, category: "Tagihan" },
      ];
    }
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  } catch {
    return [];
  }
}

export function setTemplates(templates: SubscriptionTemplate[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  syncToBackend({ templates });
}
