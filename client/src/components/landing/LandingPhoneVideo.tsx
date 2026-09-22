"use client";

import { useSyncExternalStore } from "react";
import Image from "next/image";

function subscribe(callback: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getSnapshot() {
  if (typeof window.matchMedia !== "function") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getServerSnapshot() {
  return false;
}

/**
 * Video portrait di dalam bingkai HP. File MP4 belum tersedia sehingga
 * komponen menampilkan gambar statis TANPA request 404 (jangan render
 * <video> sampai file ada di public/videos/ + poster disiapkan).
 */
const VIDEO_SRC: string | null = null;

export function LandingPhoneVideo() {
  const reduced = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const showStatic = reduced || VIDEO_SRC === null;

  return (
    <div
      aria-hidden={reduced ? undefined : true}
      className="relative mx-auto w-full max-w-[280px] rounded-[2.5rem] border-[10px] border-slate-900 bg-slate-900 shadow-xl overflow-hidden"
    >
      <div className="rounded-[1.6rem] overflow-hidden bg-slate-950 aspect-[9/16]">
        {showStatic ? (
          <Image
            src="/images/logo-uangku-mark.webp"
            alt="Logo UangKu"
            width={410}
            height={321}
            priority
            className="h-full w-full object-contain p-10"
          />
        ) : (
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="none"
            poster="/images/logo-uangku-mark.webp"
            src={VIDEO_SRC}
            className="h-full w-full object-cover"
          />
        )}
      </div>
      {/* notch */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center pt-3">
        <span className="h-5 w-24 rounded-full bg-slate-900" />
      </div>
    </div>
  );
}
