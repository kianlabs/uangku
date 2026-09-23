"use client";

import Link from "next/link";
import { CircleHelp, Settings } from "lucide-react";
import { Mascot } from "@/components/brand/Mascot";
import { openIndicatorTour } from "@/components/dashboard/IndicatorSpotlightTour";

interface HeaderProps {
  userName: string;
  currentDate: Date;
  onOpenReport?: () => void;
}

export function Header({ userName, currentDate }: HeaderProps) {
  // P1-16: sapaan pakai nama profil; fallback "Teman" bila kosong.
  const displayName = userName.trim() || "Teman";
  const greeting = currentDate.getHours() < 12 ? "Pagi" : currentDate.getHours() < 17 ? "Siang" : "Malam";
  const dateStr = currentDate.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return (
    <header className="flex items-center justify-between gap-3 min-w-0">
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <h1
          className="text-base sm:text-lg font-bold text-slate-900 truncate"
          title={`${greeting}, ${displayName}`}
        >
          {greeting}, {displayName}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 truncate">{dateStr}</p>
      </div>
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <button
          type="button"
          onClick={() => openIndicatorTour()}
          aria-label="Panduan indikator"
          title="Panduan indikator"
          className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600 shrink-0"
        >
          <CircleHelp className="w-4.5 h-4.5 sm:w-5 sm:h-5" aria-hidden="true" />
        </button>
        <Mascot size={32} mood="happy" variant="glasses" label="Mochi menyapamu" className="shrink-0" />
        <Link
          href="/pengaturan"
          aria-label="Pengaturan"
          className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600 shrink-0"
        >
          <Settings className="w-4.5 h-4.5 sm:w-5 sm:h-5" aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}
