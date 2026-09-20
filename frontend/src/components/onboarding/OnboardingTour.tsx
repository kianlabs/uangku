"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Mascot } from "@/components/brand/Mascot";
import { Button } from "@/components/ui/Button";
import { updatePreferences } from "@/lib/preferences";

interface Step {
  title: string;
  body: string;
  cta: string;
  /** Jika true, CTA mengarah ke tambah transaksi. */
  goToAdd?: boolean;
}

const STEPS: Step[] = [
  {
    title: "Halo! Aku Mochi!",
    body: "Aku akan menemanimu mencatat keuangan. Cuma butuh 3 langkah cepat untuk mulai.",
    cta: "Lanjut",
  },
  {
    title: "Langkah 1: Catat transaksi",
    body: "Setiap ada pemasukan atau pengeluaran, catat lewat tombol + atau halaman Tambah Transaksi. Cukup 10 detik.",
    cta: "Lanjut",
  },
  {
    title: "Langkah 2: Pantau batas aman",
    body: "Beranda menunjukkan rekomendasi aman belanja harian dan anggaran kategorimu. Yuk catat transaksi pertamamu!",
    cta: "Catat transaksi pertama",
    goToAdd: true,
  },
];

export function OnboardingTour({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  async function finish(goToAdd: boolean) {
    // Fire-and-forget: tur tidak boleh block navigasi.
    updatePreferences({ onboarding_done: true }).catch(() => {});
    onDone();
    if (goToAdd) router.push("/transaksi/tambah");
  }

  function skip() {
    updatePreferences({ onboarding_done: true }).catch(() => {});
    onDone();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Panduan ${step + 1} dari ${STEPS.length}: ${current.title}`}
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-4 sm:items-center"
    >
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-sm rounded-2xl bg-surface border border-border shadow-xl p-6 flex flex-col items-center gap-4"
      >
        <Mascot size={96} animated={false} />
        <div className="flex flex-col gap-1 text-center">
          <h2 className="text-lg font-bold text-text">{current.title}</h2>
          <p className="text-sm text-muted leading-relaxed">{current.body}</p>
        </div>
        <div className="flex gap-1.5" aria-hidden="true">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-6 bg-accent" : "w-1.5 bg-border"
              }`}
            />
          ))}
        </div>
        <div className="flex gap-2 w-full">
          {step > 0 && (
            <Button variant="ghost" onClick={() => setStep(step - 1)} className="flex-1">
              Kembali
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} className="flex-1">
              {current.cta}
            </Button>
          ) : (
            <Button onClick={() => finish(true)} className="flex-1">
              {current.cta}
            </Button>
          )}
        </div>
        <button
          onClick={skip}
          className="text-sm text-muted hover:text-text transition-colors min-h-[36px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent rounded px-2"
        >
          Lewati panduan
        </button>
      </motion.div>
    </div>
  );
}
