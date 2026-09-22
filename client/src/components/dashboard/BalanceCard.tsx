"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Eye, EyeOff } from "lucide-react";
import { formatRupiah } from "@/lib/format";
import { haptic } from "@/lib/haptics";

interface BalanceCardProps {
  balance: string;
  monthly_income: string;
  monthly_expense: string;
}

const COUNT_UP_MS = 500;
const MASK_KEY = "uangku_balance_masked";
const MASK_EVENT = "uangku:balance-mask";

function subscribeMasked(callback: () => void) {
  window.addEventListener(MASK_EVENT, callback);
  return () => window.removeEventListener(MASK_EVENT, callback);
}

function getMaskedSnapshot(): boolean {
  try {
    return sessionStorage.getItem(MASK_KEY) !== "0";
  } catch {
    return true;
  }
}

function getMaskedServerSnapshot(): boolean {
  return true;
}

/** Pilihan mask saldo persist per sesi tab via sessionStorage (SSR-safe). */
function useMasked(): [boolean, () => void] {
  const masked = useSyncExternalStore(
    subscribeMasked,
    getMaskedSnapshot,
    getMaskedServerSnapshot
  );
  const toggle = () => {
    const next = !getMaskedSnapshot();
    try {
      // Reader: masked = value !== "0" (null → masked). Maka unmask = "0".
      sessionStorage.setItem(MASK_KEY, next ? "1" : "0");
    } catch {
      // mode privat: pilihan tidak persist, state tetap berlaku sesi ini
    }
    window.dispatchEvent(new Event(MASK_EVENT));
  };
  return [masked, toggle];
}

/** Angka tampil dengan count-up singkat (hormati prefers-reduced-motion). */
function useCountUp(target: number): number {
  const [displayed, setDisplayed] = useState(0);
  const prev = useRef(0);

  useEffect(() => {
    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = prev.current;
    if (from === target) return;
    let raf = 0;
    const start = performance.now();
    // Reduced motion → durasi 1ms: satu tick async, tanpa setState sinkron.
    const duration = reduceMotion ? 1 : COUNT_UP_MS;
    // Elapsed via performance.now() — timestamp rAF bisa beda clock di jsdom.
    const tick = () => {
      const p = Math.min(1, (performance.now() - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setDisplayed(from + (target - from) * eased);
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        prev.current = target;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return displayed;
}

export function BalanceCard({ balance, monthly_income, monthly_expense }: BalanceCardProps) {
  const [masked, toggleMasked] = useMasked();

  const balanceNum = Number.parseFloat(balance);
  const animated = useCountUp(Number.isFinite(balanceNum) ? balanceNum : 0);

  return (
    <div className="flex flex-col gap-4 p-6 rounded-2xl bg-brand shadow-md">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold text-sky-200 uppercase tracking-wide pt-1">
          Saldo keseluruhan
        </span>
        <button
          type="button"
          onClick={() => {
            haptic.tap();
            toggleMasked();
          }}
          aria-label={masked ? "Tampilkan saldo" : "Sembunyikan saldo"}
          aria-pressed={!masked}
          className="flex items-center justify-center w-11 h-11 -m-1 rounded-lg text-sky-200/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {masked ? <Eye className="w-4.5 h-4.5" aria-hidden="true" /> : <EyeOff className="w-4.5 h-4.5" aria-hidden="true" />}
        </button>
      </div>
      {masked ? (
        <span
          data-testid="balance-value"
          className="num font-serif text-[1.9rem] leading-tight font-bold text-white select-none"
          aria-label="Saldo disembunyikan"
        >
          Rp ••••••
        </span>
      ) : (
        <span data-testid="balance-value" className="num font-serif text-[1.9rem] leading-tight font-bold text-white">
          {formatRupiah(Math.round(animated))}
        </span>
      )}
      <p className="text-xs text-sky-200/90 leading-relaxed">Seluruh waktu hingga bulan ini.</p>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/15">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wide">Pemasukan</span>
          <span className="num text-lg font-bold text-emerald-300">+{formatRupiah(monthly_income)}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-rose-300 uppercase tracking-wide">Pengeluaran</span>
          <span className="num text-lg font-bold text-rose-300">-{formatRupiah(monthly_expense)}</span>
        </div>
      </div>
    </div>
  );
}
