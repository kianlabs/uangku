"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { Mascot, type MascotMood } from "@/components/brand/Mascot";

interface HeaderProps {
  userName: string;
  currentDate: Date;
  mochiMood?: MascotMood;
}

export function Header({ userName, currentDate, mochiMood = "happy" }: HeaderProps) {
  const greeting = currentDate.getHours() < 12 ? "Pagi" : currentDate.getHours() < 17 ? "Siang" : "Malam";
  const dateStr = currentDate.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Mascot size={44} mood={mochiMood} label="Mochi menyapamu" />
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-bold text-slate-900">
            {greeting}, {userName}
          </h1>
          <p className="text-sm text-slate-500">{dateStr}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="/akun"
          aria-label="Pengaturan"
          className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-slate-100 active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600"
        >
          <Settings className="w-5 h-5 text-slate-900" aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}
