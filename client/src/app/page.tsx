import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Clock3, PiggyBank, Sparkles } from "lucide-react";
import { UangkuLogo } from "@/components/brand/UangkuLogo";
import { Mascot } from "@/components/brand/Mascot";
import { LandingPhoneVideo } from "@/components/landing/LandingPhoneVideo";

// Verified dari server/app/main.py: session_cookie="session"
const SESSION_COOKIE = "session";

const FEATURES = [
  {
    icon: Clock3,
    title: "Catat dalam 10 detik",
    body: "Pemasukan atau pengeluaran tercatat sebelum kamu lupa.",
  },
  {
    icon: PiggyBank,
    title: "Anggaran per kategori",
    body: "Batas belanja tiap kategori dengan peringatan 75% dan 90%.",
  },
  {
    icon: Sparkles,
    title: "Dipandu Mochi",
    body: "Maskot agen keuanganmu: menyapa, mengingatkan, merayakan.",
  },
];

export default async function LandingPage() {
  const cookieStore = await cookies();
  if (cookieStore.has(SESSION_COOKIE)) {
    redirect("/beranda");
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <header className="flex items-center justify-between px-4 h-16 max-w-5xl w-full mx-auto">
        <UangkuLogo compact markWidth={32} animated={false} />
        <Link
          href="/masuk"
          className="inline-flex items-center justify-center h-10 px-5 rounded-xl text-sm font-semibold text-text hover:bg-surface-muted active:scale-[0.98] transition-all min-h-[44px]"
        >
          Masuk
        </Link>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 pb-16 flex flex-col gap-14">
        {/* Hero */}
        <section className="grid gap-10 pt-8 md:grid-cols-2 md:items-center md:pt-14">
          <div className="flex flex-col items-start gap-5">
            <span className="inline-flex items-center gap-2 rounded-full bg-surface border border-border pl-1.5 pr-4 py-1.5 text-xs font-medium text-muted">
              <Mascot size={28} animated={false} />
              Ditemani Mochi, agen keuanganmu
            </span>
            <h1 className="text-4xl md:text-5xl font-bold leading-[1.1] tracking-tight text-text">
              Catat keuangan harianmu dengan tenang.
            </h1>
            <p className="text-base text-muted leading-relaxed max-w-md">
              UangKu expense tracker sederhana: catat pemasukan dan
              pengeluaran dalam hitungan detik, pantau anggaran, dan tahu
              batas aman belanjamu setiap hari.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Link
                href="/daftar"
                className="inline-flex items-center justify-center h-12 px-7 rounded-xl bg-accent text-accent-ink text-base font-semibold hover:bg-accent/90 active:scale-[0.98] transition-all"
              >
                Mulai gratis
              </Link>
              <Link
                href="/masuk"
                className="inline-flex items-center justify-center h-12 px-7 rounded-xl bg-surface border border-border text-base font-semibold text-text hover:bg-surface-muted active:scale-[0.98] transition-all"
              >
                Masuk
              </Link>
            </div>
          </div>
          <LandingPhoneVideo />
        </section>

        {/* Fitur */}
        <section aria-label="Fitur utama" className="flex flex-col gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex gap-4 p-5 rounded-2xl bg-surface border border-border shadow-sm"
            >
              <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-accent/10 shrink-0">
                <f.icon className="w-5 h-5 text-accent" aria-hidden="true" />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-base font-bold text-text">{f.title}</span>
                <span className="text-sm text-muted leading-relaxed">{f.body}</span>
              </span>
            </div>
          ))}
        </section>

        {/* CTA bawah */}
        <section className="flex flex-col items-center gap-4 py-6 text-center">
          <Mascot size={88} mood="excited" />
          <p className="text-lg font-bold text-text max-w-xs">
            Siap tahu ke mana perginya uangmu?
          </p>
          <Link
            href="/daftar"
            className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-accent text-accent-ink text-base font-semibold hover:bg-accent/90 active:scale-[0.98] transition-all"
          >
            Buat akun gratis
          </Link>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center">
        <p className="text-xs text-muted">UangKu — Expense Tracker</p>
      </footer>
    </div>
  );
}
