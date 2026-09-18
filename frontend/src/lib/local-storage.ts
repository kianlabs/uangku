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

export function setTransactionSource(txId: string, source: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(SOURCES_KEY) || "{}";
    const data = JSON.parse(raw);
    if (typeof data !== "object" || data === null) {
      localStorage.setItem(SOURCES_KEY, JSON.stringify({ [txId]: source }));
      return;
    }
    data[txId] = source;
    localStorage.setItem(SOURCES_KEY, JSON.stringify(data));
  } catch {
    localStorage.setItem(SOURCES_KEY, JSON.stringify({ [txId]: source }));
  }
}

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

export function setDebtTag(txId: string, tag: DebtTag) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(DEBT_TAGS_KEY) || "{}";
    const data = JSON.parse(raw);
    if (typeof data !== "object" || data === null) {
      localStorage.setItem(DEBT_TAGS_KEY, JSON.stringify({ [txId]: tag }));
      return;
    }
    data[txId] = tag;
    localStorage.setItem(DEBT_TAGS_KEY, JSON.stringify(data));
  } catch {
    localStorage.setItem(DEBT_TAGS_KEY, JSON.stringify({ [txId]: tag }));
  }
}

export function getPayday(): number {
  if (typeof window === "undefined") return 1;
  try {
    const raw = localStorage.getItem(PAYDAY_KEY);
    return raw ? parseInt(raw, 10) : 1;
  } catch {
    return 1;
  }
}

export function setPayday(day: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PAYDAY_KEY, day.toString());
}

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

export function setTemplates(templates: SubscriptionTemplate[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
}
