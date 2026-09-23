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
    <header className="flex items-center justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-bold text-slate-900">{greeting}, {displayName}</h1>
        <p className="text-sm text-slate-500">{dateStr}</p>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={() => openIndicatorTour()}
          aria-label="Panduan indikator"
          title="Panduan indikator"
          className="flex items-center justify-center w-10 h-10 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600"
        >
          <CircleHelp className="w-5 h-5" aria-hidden="true" />
        </button>
        <Mascot size={36} mood="happy" variant="glasses" label="Mochi menyapamu" />
        <Link
          href="/pengaturan"
          aria-label="Pengaturan"
          className="flex items-center justify-center w-10 h-10 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600"
        >
          <Settings className="w-5 h-5" aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}
