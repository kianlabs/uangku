"use client";

import { formatRupiah } from "@/lib/format";

interface BudgetWarningProps {
  spent: string | number;
  limit: string | number;
  label?: string;
}

/** Progress bar anggaran sesuai DESIGN §3D: hijau <75%, amber 75-90%, merah >90%. */
export function BudgetWarning({ spent, limit, label = "Anggaran bulan ini" }: BudgetWarningProps) {
  const spentNum = typeof spent === "string" ? Number(spent) : spent;
  const limitNum = typeof limit === "string" ? Number(limit) : limit;
  if (!Number.isFinite(spentNum) || !Number.isFinite(limitNum) || limitNum <= 0) return null;

  const pct = Math.min(100, Math.max(0, (spentNum / limitNum) * 100));
  const bar = pct < 75 ? "bg-emerald-500" : pct <= 90 ? "bg-amber-500" : "bg-rose-500";
  const text = pct < 75 ? "text-emerald-700" : pct <= 90 ? "text-amber-700" : "text-rose-700";

  return (
    <section aria-label={label} className="flex flex-col gap-2 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
        <span className={`text-sm font-bold tabular-nums ${text}`}>{pct.toFixed(0)}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-label={`${label}: ${pct.toFixed(0)} persen terpakai`}
        className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
      >
        <div className={`h-full rounded-full transition-all ${bar}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-slate-500 tabular-nums">
        {formatRupiah(spentNum)} dari {formatRupiah(limitNum)}
      </p>
    </section>
  );
}
