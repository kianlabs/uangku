/** Toast global: event-based agar bisa dipanggil dari mana saja. */

export type ToastKind = "success" | "error" | "info";

export interface ToastPayload {
  message: string;
  kind: ToastKind;
}

export function showToast(message: string, kind: ToastKind = "info"): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ToastPayload>("uangku:toast", { detail: { message, kind } }));
}
