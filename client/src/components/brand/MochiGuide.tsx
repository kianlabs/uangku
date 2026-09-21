"use client";

import { useEffect, useState } from "react";
import { Mascot, type MascotMood } from "@/components/brand/Mascot";
import { getPreferences, updatePreferences } from "@/lib/preferences";

interface GuideStep {
  mood: MascotMood;
  title: string;
  body: string;
  cta: string;
}

const STEPS: GuideStep[] = [
  {
    mood: "excited",
    title: "Halo! Aku Mochi",
    body: "Aku agen keuangan pribadimu. Aku yang bakal jagain dompetmu tiap hari — mulai dari kenalan singkat ini.",
    cta: "Hai Mochi!",
  },
  {
    mood: "happy",
    title: "Catat semudah chat",
    body: "Pencet tombol + , ketik “Kopi 25k”, simpan. Beres dalam 3 detik.",
    cta: "Oke, gampang!",
  },
  {
    mood: "celebrating",
    title: "Aku jagain batas harianmu",
    body: "Tiap pagi aku hitung batas aman belanjamu di kartu hijau. Ikuti angkaku, akhir bulan aman.",
    cta: "Siap, mulai!",
  },
];

/**
 * MochiGuide — tutorial singkat ala agen pribadi.
 *
 * Muncul sekali untuk user yang belum menyelesaikan onboarding
 * (preferences.onboarding_done). Selesai/dilewati → persist ke server.
 */
export function MochiGuide() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPreferences()
      .then((prefs) => {
        if (!cancelled && prefs?.onboarding_done !== true) {
          setVisible(true);
        }
      })
      .catch(() => {
        // Preferences gagal dibaca — jangan ganggu user dengan tutorial
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function dismiss() {
    updatePreferences({ onboarding_done: true }).catch(() => {
      // Gagal persist — tutorial sudah selesai dari sisi user
    });
    setVisible(false);
  }

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Panduan Mochi"
    >
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
      <div className="relative w-full max-w-lg mx-4 mb-24 sm:mb-0 rounded-2xl bg-surface border border-border shadow-xl p-6 flex flex-col items-center gap-4">
        <Mascot size={96} mood={current.mood} label="Mochi memandumu" />
        <div className="flex flex-col items-center gap-1 text-center">
          <h2 className="text-lg font-bold text-text">{current.title}</h2>
          <p className="text-sm text-muted leading-relaxed max-w-xs">{current.body}</p>
        </div>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {STEPS.map((s, i) => (
            <span
              key={s.title}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-6 bg-accent" : "w-1.5 bg-border"
              }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 w-full max-w-xs">
          <button
            type="button"
            onClick={dismiss}
            className="flex-1 h-11 rounded-xl text-sm font-semibold text-muted hover:text-text transition-colors"
          >
            Lewati
          </button>
          <button
            type="button"
            onClick={() => (isLast ? dismiss() : setStep((s) => s + 1))}
            className="flex-[2] h-11 rounded-xl bg-accent text-accent-ink text-sm font-bold hover:bg-accent/90 active:scale-[0.98] transition-all"
          >
            {current.cta}
          </button>
        </div>
      </div>
    </div>
  );
}
