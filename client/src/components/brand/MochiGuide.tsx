"use client";

import { useEffect, useState } from "react";
import { Mascot, type MascotMood } from "@/components/brand/Mascot";
import { getPreferences, updatePreferences } from "@/lib/preferences";
import { getPayday, setPayday } from "@/lib/local-storage";
import { createTransaction, listTransactions } from "@/lib/transactions";
import { listCategories } from "@/lib/categories";
import { todayLocalISO } from "@/lib/date";
import { groupThousands } from "@/lib/format";

interface GuideStep {
  mood: MascotMood;
  title: string;
  body: string;
  cta: string;
  kind?: "info" | "payday" | "balance";
}

const STEPS: GuideStep[] = [
  {
    mood: "excited",
    title: "Halo! Aku Mochi",
    body: "Aku agen keuangan pribadimu. Aku yang bakal jagain dompetmu tiap hari — mulai dari kenalan singkat ini.",
    cta: "Hai Mochi!",
    kind: "info",
  },
  {
    mood: "thinking",
    title: "Tanggal berapa gajian?",
    body: "Biar hitungan batas aman harianku ngikutin siklus gajimu, bukan asal akhir kalender.",
    cta: "Simpan & lanjut",
    kind: "payday",
  },
  {
    mood: "happy",
    title: "Pegang uang berapa sekarang?",
    body: "Catat saldomu saat ini sebagai titik awal. Nanti semua ringkasan dihitung dari sini.",
    cta: "Simpan & lanjut",
    kind: "balance",
  },
  {
    mood: "excited",
    title: "Catat semudah chat",
    body: "Pencet tombol + , ketik “Kopi 25k”, simpan. Beres dalam 3 detik.",
    cta: "Oke, gampang!",
    kind: "info",
  },
  {
    mood: "celebrating",
    title: "Aku jagain batas harianmu",
    body: "Tiap pagi aku hitung batas aman belanjamu di kartu hijau. Ikuti angkaku, akhir bulan aman.",
    cta: "Siap, mulai!",
    kind: "info",
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
  const [payday, setPaydayState] = useState(() => String(getPayday()));
  const [paydayError, setPaydayError] = useState<string | null>(null);
  const [balance, setBalanceState] = useState("");
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("uangku:guide-open", { detail: { open: visible } })
    );
  }, [visible]);

  function dismiss() {
    updatePreferences({ onboarding_done: true }).catch(() => {
      // Gagal persist — tutorial sudah selesai dari sisi user
    });
    setVisible(false);
  }

  async function handleNext() {
    const current = STEPS[step];
    if (current.kind === "payday") {
      const day = parseInt(payday, 10);
      if (!Number.isFinite(day) || day < 1 || day > 31) {
        setPaydayError("Isi tanggal 1–31 ya.");
        return;
      }
      setPaydayError(null);
      setPayday(day);
    }
    if (current.kind === "balance") {
      const digits = balance.replace(/\D/g, "");
      const num = digits ? parseFloat(digits) : 0;
      if (num > 0) {
        setIsSaving(true);
        setBalanceError(null);
        try {
          const existing = await listTransactions({ page: 1, page_size: 1 });
          if (existing.items.length === 0) {
            const cats = await listCategories({ type: "income" });
            const cat =
              cats.items.find((c) => c.name.toLowerCase() === "lainnya") ??
              cats.items[0];
            if (!cat) throw new Error("Kategori tidak tersedia");
            await createTransaction({
              type: "income",
              amount: num.toFixed(2),
              category_id: cat.id,
              transaction_date: todayLocalISO(),
              description: "Saldo awal",
              is_opening_balance: true,
            });
            window.dispatchEvent(new CustomEvent("uangku:tx-changed"));
          }
        } catch {
          setBalanceError("Gagal menyimpan saldo awal. Coba lagi.");
          setIsSaving(false);
          return;
        }
        setIsSaving(false);
      }
    }
    if (step === STEPS.length - 1) {
      dismiss();
    } else {
      setStep((s) => s + 1);
    }
  }

  if (!visible) return null;

  const current = STEPS[step];

  return (
    <div
      className="fixed inset-0 z-50 bg-canvas overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Panduan Mochi"
    >
      <div
        className="min-h-full w-full max-w-md mx-auto px-6 pt-12 flex flex-col"
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center">
          <Mascot size={128} mood={current.mood} label="Mochi memandumu" />
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
          <div className="flex flex-col items-center gap-2">
            <h2 className="text-2xl font-bold text-text">{current.title}</h2>
            <p className="text-base text-muted leading-relaxed">{current.body}</p>
          </div>
          {current.kind === "payday" && (
            <div className="flex flex-col items-center gap-1.5 w-full">
              <label htmlFor="mochi-payday" className="text-xs font-medium text-muted">
                Setiap tanggal
              </label>
              <input
                id="mochi-payday"
                type="number"
                inputMode="numeric"
                min={1}
                max={31}
                value={payday}
                onChange={(e) => {
                  setPaydayState(e.target.value);
                  if (paydayError) setPaydayError(null);
                }}
                aria-invalid={paydayError ? "true" : undefined}
                className="w-24 h-12 text-center text-lg font-bold rounded-xl border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
              />
              {paydayError && (
                <p role="alert" className="text-xs text-danger">
                  {paydayError}
                </p>
              )}
            </div>
          )}
          {current.kind === "balance" && (
            <div className="flex flex-col items-center gap-1.5 w-full">
              <label htmlFor="mochi-balance" className="text-xs font-medium text-muted">
                Saldo saat ini (Rp)
              </label>
              <input
                id="mochi-balance"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="0"
              value={groupThousands(balance)}
              onChange={(e) => {
                setBalanceState(e.target.value.replace(/\D/g, ""));
                if (balanceError) setBalanceError(null);
              }}
              aria-invalid={balanceError ? "true" : undefined}
              className="w-full h-12 text-center text-lg font-bold tabular-nums rounded-xl border border-border bg-surface text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
            />
            {balanceError && (
                <p role="alert" className="text-xs text-danger">
                  {balanceError}
                </p>
              )}
              <p className="text-[11px] text-muted">Kosongkan kalau belum mau isi.</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 pt-8">
          <button
            type="button"
            onClick={dismiss}
            disabled={isSaving}
            className="flex-1 h-12 rounded-xl text-sm font-semibold text-muted hover:text-text transition-colors disabled:opacity-50"
          >
            Lewati
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={isSaving}
            className="flex-[2] h-12 rounded-xl bg-accent text-accent-ink text-sm font-bold hover:bg-accent/90 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {isSaving ? "Menyimpan…" : current.cta}
          </button>
        </div>
      </div>
    </div>
  );
}
