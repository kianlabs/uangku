"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { formatRupiah } from "@/lib/format";
import { Mascot } from "@/components/brand/Mascot";

interface SafeToSpendCardProps {
  safeToSpendAmount: number;
  daysLeft: number;
  remainingBalance: string;
  /** Total pengeluaran hari ini (Rp) — untuk bar progres harian. */
  todayExpense?: number;
}

const COUNT_UP_MS = 600;

// ponytail: rAF tween instead of a count-up lib — fine for one number,
// revisit only if more animated counters appear across the app.
export function SafeToSpendCard({ safeToSpendAmount, daysLeft, remainingBalance, todayExpense = 0 }: SafeToSpendCardProps) {
  // Angka besar = SISA hari ini: batas harian dikurangi yang sudah dibelanjakan.
  const dailyLimit = safeToSpendAmount > 0 ? safeToSpendAmount : 0;
  const hero = Math.max(0, dailyLimit - todayExpense);
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    const reduceMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const start = performance.now();
    const duration = reduceMotion ? 1 : COUNT_UP_MS;
    // Elapsed dihitung via performance.now(), bukan timestamp rAF —
    // keduanya bisa beda clock (terbukti di jsdom), yang bikin tween macet.
    const tick = () => {
      const p = Math.min(1, Math.max(0, (performance.now() - start) / duration));
      setDisplayed(hero * p);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [hero]);

  const isTight = safeToSpendAmount <= 0;
  const isDailySpent = !isTight && hero <= 0;
  const isEndingSoon = !isTight && !isDailySpent && daysLeft <= 3;
  const opener = isTight
    ? "Ups, bulan ini sudah minus. Rem dulu ya?"
    : isDailySpent
      ? "Batas hari ini habis. Besok mulai lagi ya."
      : isEndingSoon
        ? `Tinggal ${daysLeft} hari! Ini hitunganku buat kamu:`
        : "Hai! Ini rekomendasi aman belanjamu hari ini:";

  // Progres harian: seberapa besar batas hari ini sudah terpakai.
  // Ring (bukan bar) — lebih ringkas; warna emerald → amber ≥75% → rose ≥90%.
  const usedPct = dailyLimit > 0 ? Math.min(100, (todayExpense / dailyLimit) * 100) : todayExpense > 0 ? 100 : 0;
  const isOverDaily = dailyLimit > 0 ? todayExpense > dailyLimit : todayExpense > 0;
  const ringColor =
    isOverDaily || usedPct >= 90 ? "#e11d48" : usedPct >= 75 ? "#d97706" : "#059669";
  const ringStroke = 2 * Math.PI * 18; // r=18

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col gap-4 p-6 rounded-2xl bg-emerald-50/70 border border-emerald-100"
    >
      <div className="flex items-start gap-3">
        <Mascot
          size={64}
          mood={isTight || isDailySpent ? "worried" : "ok"}
          label="Mochi mempresentasikan rekomendasi belanja"
          className="shrink-0"
          delay={-1.3}
        />
        <div className="flex flex-col gap-1 pt-1">
          <h2 className="text-sm font-semibold text-slate-900">Rekomendasi Aman Hari Ini</h2>
          <p className="text-sm text-slate-500 leading-relaxed">{opener}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="num font-serif text-[1.9rem] leading-tight font-bold text-emerald-700" aria-live="polite">
          {hero > 0 ? formatRupiah(Math.round(displayed)) : "Rp 0"}
        </span>
        <svg
          width="44"
          height="44"
          viewBox="0 0 44 44"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(usedPct)}
          aria-label={`Terpakai ${Math.round(usedPct)} persen dari batas harian`}
          className="shrink-0 -rotate-90"
        >
          <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(6,78,59,0.15)" strokeWidth="5" />
          {usedPct > 0 && (
            <circle
              cx="22"
              cy="22"
              r="18"
              fill="none"
              stroke={ringColor}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={ringStroke}
              strokeDashoffset={ringStroke * (1 - usedPct / 100)}
            />
          )}
        </svg>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-emerald-100">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-slate-500">Sisa hari</span>
          <span className="num text-sm font-bold text-slate-900">{daysLeft} hari</span>
        </div>
        <div className="flex flex-col gap-0.5 text-right">
          <span className="text-xs text-slate-500">Sisa saldo</span>
          <span className="num text-sm font-bold text-slate-900">{formatRupiah(remainingBalance)}</span>
        </div>
      </div>
    </motion.div>
  );
}
