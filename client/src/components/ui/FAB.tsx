"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { QuickAddModal } from "@/components/dashboard/QuickAddModal";

export function FAB() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Hide FAB on /transaksi/tambah, /transaksi/[id], /transaksi/[id]/edit
  const isHidden =
    pathname === "/transaksi/tambah" ||
    /^\/transaksi\/[^/]+(\/edit)?$/.test(pathname);

  if (isHidden) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Catat cepat"
        aria-haspopup="dialog"
        className={[
          "fixed right-4 z-50 flex items-center justify-center",
          "w-14 h-14 rounded-xl bg-accent text-accent-ink shadow-[0_8px_24px_rgba(0,0,0,0.12)]",
          "hover:bg-accent/90 active:scale-95 transition-all select-none",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        ].join(" ")}
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 5.5rem)" }}
      >
        <svg
          aria-hidden="true"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
      <QuickAddModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
