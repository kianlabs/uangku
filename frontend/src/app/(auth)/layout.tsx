import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <header className="flex items-center px-4 h-14 border-b border-border">
        <Link
          href="/"
          aria-label="Kembali ke halaman utama"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-text transition-colors min-h-[44px]"
        >
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          UangKu
        </Link>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
