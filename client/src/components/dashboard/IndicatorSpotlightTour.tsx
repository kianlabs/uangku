"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Mascot, type MascotMood } from "@/components/brand/Mascot";
import { haptic } from "@/lib/haptics";
import { X, ChevronRight, ChevronLeft } from "lucide-react";

export interface TourStep {
  targetKey: string;
  badge: string;
  title: string;
  description: string;
  mood: MascotMood;
  variant?: "classic" | "glasses" | "peace" | "cap" | "bow" | "sparkle";
}

const TOUR_STEPS: TourStep[] = [
  {
    targetKey: "safe-to-spend",
    badge: "Beranda",
    title: "Batas Belanja Hari Ini (Safe to Spend)",
    description:
      "Fitur utama UangKu di Beranda! Ini pagu maksimal harian yang aman kamu belanjakan agar uangmu cukup sampai tanggal gajian berikutnya tanpa mengganggu tabungan.",
    mood: "excited",
    variant: "cap",
  },
  {
    targetKey: "nav-catat-cepat",
    badge: "Catat Cepat",
    title: "Tombol Catat Cepat (+)",
    description:
      "Catat transaksi kilat dalam hitungan detik! Cukup ketik santai seperti 'kopi 25k' atau 'gaji 5jt'. Mochi otomatis mengenali nominal dan kategorinya tanpa repot form panjang.",
    mood: "happy",
    variant: "bow",
  },
  {
    targetKey: "nav-riwayat",
    badge: "Riwayat",
    title: "Menu Riwayat Transaksi",
    description:
      "Daftar lengkap seluruh arus pemasukan dan pengeluaranmu. Dilengkapi filter tanggal, kategori, pencarian cepat, serta opsi geser untuk menghapus catatan.",
    mood: "thinking",
    variant: "glasses",
  },
  {
    targetKey: "nav-anggaran",
    badge: "Anggaran",
    title: "Menu Anggaran Bulanan",
    description:
      "Rencanakan dan kunci batas belanja per kategori (misal Makan, Belanja, atau Transportasi). Mochi akan memperingatkan jika kuota belanjamu sudah mendekati batas.",
    mood: "firm",
    variant: "classic",
  },
  {
    targetKey: "nav-pengaturan",
    badge: "Pengaturan",
    title: "Menu Pengaturan & Ekspor",
    description:
      "Sesuaikan tanggal gajian pribadimu, tambah atau kelola kategori kustom, aktifkan pengingat, dan unduh rekaman keuanganmu ke format CSV atau Excel.",
    mood: "celebrating",
    variant: "sparkle",
  },
];

interface RectPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function IndicatorSpotlightTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<RectPosition | null>(null);
  const primaryButtonRef = useRef<HTMLButtonElement | null>(null);

  const updateTargetRect = useCallback((index: number) => {
    const step = TOUR_STEPS[index];
    if (!step) return;

    const el = document.querySelector(`[data-tour="${step.targetKey}"]`);
    if (el) {
      const isFixed =
        typeof window !== "undefined" &&
        (window.getComputedStyle(el).position === "fixed" || Boolean(el.closest("nav")));
      if (!isFixed && typeof el.scrollIntoView === "function") {
        // Gulir target ke tengah layar agar berada tepat di bawah kartu instruksi atas,
        // persis sesuai susunan layout panduan yang diharapkan.
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      const pad = 6;
      const syncRect = () => {
        const r = el.getBoundingClientRect();
        setTargetRect({
          top: Math.max(pad, r.top - pad),
          left: Math.max(pad, r.left - pad),
          width: r.width + pad * 2,
          height: r.height + pad * 2,
        });
      };
      syncRect();
      setTimeout(syncRect, 100);
      setTimeout(syncRect, 250);
      setTimeout(syncRect, 450);
    } else {
      setTargetRect(null);
    }
  }, []);

  // Buka tur saat event dipicu atau cek status onboarding
  useEffect(() => {
    function handleOpen() {
      setCurrentIndex(0);
      setIsOpen(true);
      haptic.tap();
    }

    window.addEventListener("uangku:open-indicator-tour", handleOpen);
    return () => window.removeEventListener("uangku:open-indicator-tour", handleOpen);
  }, []);

  // Update posisi saat index berubah atau layar resize / scroll
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      updateTargetRect(currentIndex);
    }, 120);

    function onReposition() {
      const step = TOUR_STEPS[currentIndex];
      if (!step) return;
      const el = document.querySelector(`[data-tour="${step.targetKey}"]`);
      if (el) {
        const pad = 6;
        const r = el.getBoundingClientRect();
        setTargetRect({
          top: Math.max(pad, r.top - pad),
          left: Math.max(pad, r.left - pad),
          width: r.width + pad * 2,
          height: r.height + pad * 2,
        });
      }
    }

    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition);
    };
  }, [isOpen, currentIndex, updateTargetRect]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    localStorage.setItem("uangku:indicator_tour_done", "true");
    haptic.tap();
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex < TOUR_STEPS.length - 1) {
      haptic.tap();
      setCurrentIndex((prev) => prev + 1);
    } else {
      handleClose();
      haptic.success();
    }
  }, [currentIndex, handleClose]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      haptic.tap();
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  // Keyboard navigation & Focus management
  useEffect(() => {
    if (!isOpen) return;

    primaryButtonRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, handleClose, handleNext, handlePrev]);

  if (!isOpen) return null;

  const currentStep = TOUR_STEPS[currentIndex];
  const isLast = currentIndex === TOUR_STEPS.length - 1;

  // Seluruh instruksi tur (Safe-to-Spend di tengah dan menu BottomNav di dasar)
  // diletakkan di ATAS SENDIRI (top-0) persis seperti screenshot acuan panduan,
  // sehingga sorotan target di bawahnya terlihat 100% utuh tanpa tertutup kartu.
  const placeCardAtTop = true;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Panduan indikator UangKu"
      >
        {/* Area klik luar backdrop untuk menutup panduan */}
        <div
          className="fixed inset-0 z-[48] cursor-pointer"
          onClick={handleClose}
          aria-hidden="true"
        />

        {/* Backdrop Gelap Bersih TANPA BLUR: Menyorot target dengan lubang transparan jernih */}
        {targetRect ? (
          <svg
            className="fixed inset-0 w-full h-full pointer-events-none z-[49] transition-opacity duration-200"
            aria-hidden="true"
          >
            <defs>
              <mask id="indicator-tour-mask">
                {/* Area luar putih = ditutup gelap transparan */}
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                {/* Cutout hitam = kartu target transparan 100%, tajam, jernih & bebas blur */}
                <rect
                  x={targetRect.left}
                  y={targetRect.top}
                  width={targetRect.width}
                  height={targetRect.height}
                  rx="16"
                  ry="16"
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="rgba(15, 23, 42, 0.72)"
              mask="url(#indicator-tour-mask)"
            />
          </svg>
        ) : (
          <div className="fixed inset-0 bg-slate-950/70 transition-opacity duration-200 z-[49] pointer-events-none" />
        )}

        {/* Ring fokus bersih mengelilingi elemen target (tanpa efek hologram neon) */}
        {targetRect && (
          <motion.div
            initial={false}
            animate={{
              top: targetRect.top,
              left: targetRect.left,
              width: targetRect.width,
              height: targetRect.height,
            }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="fixed pointer-events-none z-[55] rounded-2xl ring-2 ring-emerald-600"
          />
        )}

        {/* Modal / Card Penjelasan: Ditaruh di ATAS SENDIRI agar highlight target tidak tertutup */}
        <div
          className={`fixed inset-x-0 z-[60] p-3 sm:p-5 flex justify-center pointer-events-none transition-all duration-300 ${
            placeCardAtTop ? "top-0 items-start" : "bottom-0 items-end"
          }`}
          style={{
            paddingTop: placeCardAtTop ? "calc(env(safe-area-inset-top) + 0.5rem)" : undefined,
            paddingBottom: !placeCardAtTop ? "calc(env(safe-area-inset-bottom) + 0.5rem)" : undefined,
          }}
        >
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: placeCardAtTop ? -16 : 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: placeCardAtTop ? -16 : 16 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-xl p-4 sm:p-5 flex flex-col gap-3 sm:gap-4 pointer-events-auto"
          >
            {/* Header Card: Badge, Step Counter, Close */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {currentStep.badge}
                </span>
                <span className="text-xs font-medium text-muted">
                  {currentIndex + 1} dari {TOUR_STEPS.length}
                </span>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Tutup panduan"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-text hover:bg-surface-muted transition-colors active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Isi Panduan: Maskot & Penjelasan */}
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="shrink-0 pt-0.5">
                <Mascot
                  size={46}
                  mood={currentStep.mood}
                  variant={currentStep.variant ?? "classic"}
                  animated
                  label="Mochi menjelaskan indikator"
                />
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-0.5 sm:gap-1">
                <h3 className="text-sm sm:text-base font-bold text-text leading-snug">
                  {currentStep.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted leading-relaxed">
                  {currentStep.description}
                </p>
              </div>
            </div>

            {/* Step Indicators Dots & Tombol Aksi */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              {/* Dots */}
              <div className="flex items-center gap-1.5">
                {TOUR_STEPS.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      haptic.tap();
                      setCurrentIndex(i);
                    }}
                    aria-label={`Lompat ke langkah ${i + 1}`}
                    className={`h-2 rounded-full transition-all ${
                      i === currentIndex ? "w-6 bg-accent" : "w-2 bg-slate-200 hover:bg-slate-300"
                    }`}
                  />
                ))}
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center gap-2">
                {currentIndex > 0 && (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="h-9 sm:h-10 px-3 rounded-xl border border-border text-xs sm:text-sm font-semibold text-text hover:bg-surface-muted active:scale-[0.98] transition-all flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Sebelumnya
                  </button>
                )}
                <button
                  ref={primaryButtonRef}
                  type="button"
                  onClick={handleNext}
                  className="h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl bg-accent text-accent-ink text-xs sm:text-sm font-semibold hover:bg-accent/90 active:scale-[0.98] transition-all flex items-center gap-1"
                >
                  {isLast ? "Mengerti!" : "Lanjut"}
                  {!isLast && <ChevronRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}

export function openIndicatorTour() {
  window.dispatchEvent(new CustomEvent("uangku:open-indicator-tour"));
}
