"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { QuickAddModal } from "@/components/dashboard/QuickAddModal";

export function FAB() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    function handleGuide(e: Event) {
      setGuideOpen(
        (e as CustomEvent<{ open?: boolean }>).detail?.open === true
      );
    }
    window.addEventListener("uangku:guide-open", handleGuide);
    return () => {
      window.removeEventListener("uangku:guide-open", handleGuide);
    };
  }, []);

  // Hide FAB on /transaksi/tambah, /transaksi/[id], /transaksi/[id]/edit
  const isHidden =
    pathname === "/transaksi/tambah" ||
    /^\/transaksi\/[^/]+(\/edit)?$/.test(pathname);

  if (isHidden || guideOpen) {
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
          "fixed right-4 z-50 flex items-center justify-center gap-2",
          "h-14 px-5 rounded-2xl bg-accent text-accent-ink text-base font-semibold shadow-[0_8px_24px_rgba(0,0,0,0.12)]",
          "hover:bg-accent/90 active:scale-95 transition-all select-none",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        ].join(" ")}
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 5.5rem)" }}
      >
        <svg
          aria-hidden="true"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span>Catat</span>
      </button>
      <QuickAddModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
