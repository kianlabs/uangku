"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { haptic } from "@/lib/haptics";

// Modal FAB jarang dibuka — muat malas agar tak ikut bundle awal.
const QuickAddModal = dynamic(
  () => import("@/components/dashboard/QuickAddModal").then((m) => m.QuickAddModal),
  { ssr: false }
);

const navItems = [
  {
    href: "/beranda",
    label: "Beranda",
    icon: (
      <svg
        aria-hidden="true"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
        <path d="M9 21V12h6v9" />
      </svg>
    ),
  },
  {
    href: "/riwayat",
    label: "Riwayat",
    icon: (
      <svg
        aria-hidden="true"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="M9 12h6M9 16h4" />
      </svg>
    ),
  },
  {
    href: "/anggaran",
    label: "Anggaran",
    icon: (
      <svg
        aria-hidden="true"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 12V7H5a2 2 0 010-4h14v4" />
        <path d="M3 5v14a2 2 0 002 2h16v-5" />
        <path d="M18 12a2 2 0 000 4h4v-4h-4z" />
      </svg>
    ),
  },
  {
    href: "/pengaturan",
    label: "Pengaturan",
    icon: (
      <svg
        aria-hidden="true"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const [modalOpen, setModalOpen] = useState(false);
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

  // Sembunyikan tombol aksi di halaman form (sudah ada CTA sendiri),
  // dan seluruh bar saat panduan onboarding terbuka.
  const hideAction =
    pathname === "/transaksi/tambah" ||
    /^\/transaksi\/[^/]+(\/edit)?$/.test(pathname);

  if (guideOpen) return null;

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed bottom-0 inset-x-0 z-40 px-4"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
    >
      <div className="relative max-w-md mx-auto">
        {hideAction ? null : (
          <div className="absolute left-1/2 -translate-x-1/2 -top-[60px] z-10">
            <button
              type="button"
              data-tour="nav-catat-cepat"
              onClick={() => {
                haptic.tap();
                setModalOpen(true);
              }}
              aria-label="Catat cepat"
              aria-haspopup="dialog"
              aria-expanded={modalOpen}
              className="flex items-center justify-center w-14 h-14 rounded-full bg-accent text-accent-ink shadow-lg hover:bg-accent/90 active:scale-95 transition-all select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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
                className={`transition-transform duration-200 ${modalOpen ? "rotate-45" : ""}`}
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
        )}
        <ul className="flex h-16 list-none m-0 p-1.5 rounded-[28px] border border-border bg-surface shadow-lg">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const tourKey = `nav-${item.href.replace("/", "")}`;
            return (
              <li key={item.href} className="flex-1 flex" data-tour={tourKey}>
                <Link
                  href={item.href}
                  onClick={() => {
                    haptic.tap();
                    setModalOpen(false);
                    if (typeof window !== "undefined") {
                      const isSamePage = pathname === item.href;
                      if (isSamePage) {
                        window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
                      } else {
                        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
                      }

                      if (item.href === "/beranda") {
                        window.dispatchEvent(new CustomEvent("uangku:go-home"));
                      } else if (item.href === "/riwayat") {
                        window.dispatchEvent(new CustomEvent("uangku:reset-riwayat"));
                      } else if (item.href === "/anggaran") {
                        window.dispatchEvent(new CustomEvent("uangku:reset-anggaran"));
                      } else if (item.href === "/pengaturan") {
                        window.dispatchEvent(new CustomEvent("uangku:reset-pengaturan"));
                      }
                    }
                  }}
                  aria-current={isActive ? "page" : undefined}
                  className={[
                    "relative flex flex-1 flex-col items-center justify-center gap-1 transition-transform select-none min-h-[44px] rounded-2xl active:scale-[0.93] duration-150",
                    isActive ? "text-accent font-semibold" : "text-muted hover:text-text font-medium",
                  ].join(" ")}
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-active-pill"
                      transition={{ type: "spring", stiffness: 500, damping: 40 }}
                      className="absolute inset-0 rounded-2xl bg-accent/15"
                      aria-hidden="true"
                    />
                  )}
                  <span className="relative">{item.icon}</span>
                  <span className="relative text-xs">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      {modalOpen && (
        <QuickAddModal
          key="open"
          open={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      )}
    </nav>
  );
}
