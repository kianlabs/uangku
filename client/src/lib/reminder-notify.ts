import { formatRupiah } from "./format";
import type { RecurringTransaction } from "./local-storage";

/**
 * Notifikasi lokal untuk pengingat transaksi.
 *
 * Prinsip UX:
 * - Izin TIDAK diminta saat app dibuka — hanya saat ada tagihan jatuh tempo
 *   (ditawarkan inline di kartu pengingat).
 * - Maksimal 1 notifikasi per hari (flag tanggal + daftar id).
 * - User bisa mematikan via Pengaturan tanpa mencabut izin browser.
 * - Kalau izin ditolak / browser tidak mendukung → diam, kartu tetap jalan.
 */

const PREF_KEY = "uangku_notify_reminders"; // "0" = mati, selain itu nyala
const NOTIFIED_KEY = "uangku_reminders_notified"; // "YYYY-MM-DD:id,id"

export type NotifyPermission = "granted" | "denied" | "default" | "unsupported";

export function getNotifyPermission(): NotifyPermission {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission as NotifyPermission;
}

/**
 * True bila API notifikasi hilang karena koneksi tidak aman (mis. dibuka
 * via http://IP lokal seperti Tailscale). Browser hanya mengizinkan
 * Notification + Service Worker di secure context (https:// atau localhost).
 */
export function isInsecureContext(): boolean {
  if (typeof window === "undefined") return false;
  if ("Notification" in window) return false;
  const win = window as Window & { isSecureContext?: boolean };
  return win.isSecureContext === false;
}

export async function requestNotifyPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }
  try {
    return (await Notification.requestPermission()) === "granted";
  } catch {
    return false;
  }
}

/** Preferensi user — default nyala, "0" berarti dimatikan di Pengaturan. */
export function isNotifyEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PREF_KEY) !== "0";
}

export function setNotifyEnabled(on: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREF_KEY, on ? "1" : "0");
}

function todayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function notifiedFlag(dueIds: string[], date = new Date()): string {
  return `${todayKey(date)}:${[...dueIds].sort().join(",")}`;
}

export function wasNotifiedToday(dueIds: string[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(NOTIFIED_KEY) === notifiedFlag(dueIds);
  } catch {
    return false;
  }
}

export function markNotifiedToday(dueIds: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(NOTIFIED_KEY, notifiedFlag(dueIds));
  } catch {
    // Gagal simpan flag — notifikasi mungkin dikirim ulang besok, tidak fatal
  }
}

export function buildReminderSummary(
  due: RecurringTransaction[]
): { title: string; body: string } {
  if (due.length === 1) {
    return {
      title: "Tagihan jatuh tempo",
      body: `${due[0].name} • ${formatRupiah(due[0].amount)}. Ketuk untuk mencatat.`,
    };
  }
  const total = due.reduce((sum, item) => sum + item.amount, 0);
  return {
    title: `${due.length} tagihan jatuh tempo`,
    body: `Total ${formatRupiah(total)} hari ini. Ketuk untuk melihat.`,
  };
}

/**
 * Tampilkan notifikasi sistem untuk pengingat yang jatuh tempo.
 * Return true hanya jika benar-benar tampil (sudah ditandai hari ini).
 */
export async function showReminderNotification(
  due: RecurringTransaction[]
): Promise<boolean> {
  if (due.length === 0 || !isNotifyEnabled()) return false;
  if (getNotifyPermission() !== "granted") return false;

  const { title, body } = buildReminderSummary(due);
  const options: NotificationOptions = {
    body,
    tag: `uangku-reminders-${todayKey()}`,
    data: { url: "/pengaturan" },
  };

  try {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, options);
    } else {
      new Notification(title, options);
    }
  } catch {
    return false;
  }

  markNotifiedToday(due.map((item) => item.id));
  return true;
}
