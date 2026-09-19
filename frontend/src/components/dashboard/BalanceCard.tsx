"use client";

import { formatRupiah } from "@/lib/format";

interface BalanceCardProps {
  balance: string;
  monthly_income: string;
  monthly_expense: string;
}

export function BalanceCard({ balance, monthly_income, monthly_expense }: BalanceCardProps) {
  return (
    <div className="flex flex-col gap-4 p-6 rounded-2xl bg-white border border-slate-100 shadow-sm">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Saldo keseluruhan</span>
        <span className="text-3xl leading-tight font-bold text-slate-900 tabular-nums">
          {formatRupiah(balance)}
        </span>
        <p className="text-xs text-slate-400 leading-relaxed">Seluruh waktu hingga bulan ini.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Pemasukan</span>
          <span className="text-lg font-bold text-emerald-600 tabular-nums">+{formatRupiah(monthly_income)}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-rose-600 uppercase tracking-wide">Pengeluaran</span>
          <span className="text-lg font-bold text-rose-600 tabular-nums">-{formatRupiah(monthly_expense)}</span>
        </div>
      </div>
    </div>
  );
}
