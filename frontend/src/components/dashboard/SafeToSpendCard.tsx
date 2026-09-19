"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { formatRupiah } from "@/lib/format";

interface SafeToSpendCardProps {
  safeToSpendAmount: number;
  daysLeft: number;
  remainingBalance: string;
}

const COUNT_UP_MS = 600;

// ponytail: rAF tween instead of a count-up lib — fine for one number,
// revisit only if more animated counters appear across the app.
export function SafeToSpendCard({ safeToSpendAmount, daysLeft, remainingBalance }: SafeToSpendCardProps) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    const reduceMotion =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const start = performance.now();
    const duration = reduceMotion ? 1 : COUNT_UP_MS;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setDisplayed(safeToSpendAmount * p);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [safeToSpendAmount]);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col gap-4 p-6 rounded-2xl bg-emerald-50/70 border border-emerald-100"
    >
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden="true">
          💡
        </span>
        <h2 className="text-sm font-semibold text-slate-900">Rekomendasi Aman Hari Ini</h2>
      </div>

      <span className="text-2xl leading-tight font-bold text-emerald-700 tabular-nums" aria-live="polite">
        {safeToSpendAmount > 0 ? formatRupiah(displayed.toFixed(2)) : "Rp 0"}
      </span>

      <div className="flex flex-col gap-2 pt-2 border-t border-emerald-100">
        <div className="flex items-center gap-2 text-sm text-slate-900">
          <span aria-hidden="true">📅</span>
          <span>
            Sisa <strong>{daysLeft}</strong> hari lagi
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-900">
          <span aria-hidden="true">💰</span>
          <span>
            Sisa Saldo: <strong>{formatRupiah(remainingBalance)}</strong>
          </span>
        </div>
      </div>
    </motion.div>
  );
}
