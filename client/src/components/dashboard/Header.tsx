"use client";

import Link from "next/link";
import { CloudRain, CloudSun, Settings, Sun } from "lucide-react";
import { Mascot, type MascotMood } from "@/components/brand/Mascot";

export type FinanceWeather = "cerah" | "berawan" | "hujan";

const WEATHER_STYLE: Record<FinanceWeather, { label: string; className: string }> = {
  cerah: { label: "Cerah", className: "bg-emerald-100 text-emerald-700" },
  berawan: { label: "Berawan", className: "bg-amber-100 text-amber-700" },
  hujan: { label: "Hujan", className: "bg-sky-100 text-sky-700" },
};

interface HeaderProps {
  userName: string;
  currentDate: Date;
  mochiMood?: MascotMood;
  weather?: FinanceWeather;
}

export function Header({ userName, currentDate, mochiMood = "happy", weather = "cerah" }: HeaderProps) {
  const greeting = currentDate.getHours() < 12 ? "Pagi" : currentDate.getHours() < 17 ? "Siang" : "Malam";
  const dateStr = currentDate.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const WeatherIcon = weather === "hujan" ? CloudRain : weather === "berawan" ? CloudSun : Sun;
  const weatherStyle = WEATHER_STYLE[weather];

  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Mascot size={44} mood={mochiMood} label="Mochi menyapamu" />
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-bold text-slate-900">
            {greeting}, {userName}
          </h1>
          <p className="text-sm text-slate-500 flex items-center gap-2 flex-wrap">
            <span>{dateStr}</span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${weatherStyle.className}`}
            >
              <WeatherIcon className="w-3.5 h-3.5" aria-hidden="true" />
              {weatherStyle.label}
            </span>
          </p>
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
