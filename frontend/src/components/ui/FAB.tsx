import Link from "next/link";

export function FAB() {
  return (
    <Link
      href="/transaksi/tambah"
      aria-label="Tambah transaksi"
      className={[
        "fixed right-4 z-50 flex items-center justify-center",
        "w-14 h-14 rounded-[18px] bg-accent text-accent-ink shadow-[0_8px_24px_rgba(0,0,0,0.12)]",
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
    </Link>
  );
}
