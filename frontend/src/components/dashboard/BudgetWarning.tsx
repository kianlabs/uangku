"use client";

import { AlertTriangle } from "lucide-react";

interface BudgetWarningProps {
  categoryName: string;
  percent: number;
  remainingText: string;
}

// Soft warning orange dipakai HANYA di kartu ini (bar + ikon), bukan warna brand.
// Brand utama tetap accent hijau hutan dari globals.css.
export function BudgetWarning({ categoryName, percent, remainingText }: BudgetWarningProps) {
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <section
      aria-label="Peringatan anggaran"
      className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-text">
          Budget {categoryName}: {clamped}% terpakai
        </h2>
      </div>
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Budget ${categoryName} ${clamped} persen terpakai`}
        className="h-2 w-full overflow-hidden rounded-full bg-surface-muted"
      >
        <div
          className="h-full rounded-full bg-amber-500 transition-all"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <p className="text-sm leading-relaxed text-muted">{remainingText}</p>
    </section>
  );
}
