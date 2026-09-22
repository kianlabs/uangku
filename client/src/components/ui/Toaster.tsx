"use client";

import { useEffect, useRef, useState } from "react";
import type { ToastKind, ToastPayload } from "@/lib/toast";

interface ToastItem extends ToastPayload {
  id: number;
}

const KIND_STYLE: Record<ToastKind, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  error: "border-[#FECACA] bg-[#FEF2F2] text-danger",
  info: "border-amber-200 bg-amber-50 text-amber-800",
};

const KIND_ROLE: Record<ToastKind, "status" | "alert"> = {
  success: "status",
  error: "alert",
  info: "status",
};

let nextId = 1;

/** Menampilkan toast 4 detik. */
export function Toaster() {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    function onToast(e: Event) {
      const detail = (e as CustomEvent<ToastPayload>).detail;
      if (!detail?.message) return;
      if (timer.current !== null) clearTimeout(timer.current);
      setToast({ id: nextId++, message: detail.message, kind: detail.kind });
      timer.current = window.setTimeout(() => {
        setToast(null);
        timer.current = null;
      }, 4000);
    }
    window.addEventListener("uangku:toast", onToast);
    return () => {
      window.removeEventListener("uangku:toast", onToast);
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, []);

  if (!toast) return null;

  return (
    <div
      role={KIND_ROLE[toast.kind]}
      className={`fixed bottom-36 inset-x-0 z-40 mx-auto w-fit max-w-[calc(100%-2rem)] flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium shadow-lg ${KIND_STYLE[toast.kind]}`}
    >
      <p className="min-w-0">{toast.message}</p>
      <button
        type="button"
        onClick={() => {
          if (timer.current !== null) clearTimeout(timer.current);
          setToast(null);
        }}
        aria-label="Tutup notifikasi"
        className="shrink-0 min-w-[44px] min-h-[44px] -m-2 p-2 font-bold opacity-70 hover:opacity-100 rounded"
      >
        ×
      </button>
    </div>
  );
}
