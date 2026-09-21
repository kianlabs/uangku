"use client";

import { useState, useSyncExternalStore } from "react";
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
 * Video portrait di dalam bingkai HP. Jika reduced-motion: tampilkan
 * gambar mark statis sebagai gantinya. Jika file video belum ada (404):
 * jatuh kembali ke gambar statis agar hero tidak kosong.
 */
export function LandingPhoneVideo() {
  const reduced = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [videoMissing, setVideoMissing] = useState(false);
  const showStatic = reduced || videoMissing;

  return (
    <div
      aria-hidden={reduced ? undefined : true}
      className="relative mx-auto w-full max-w-[280px] rounded-[2.5rem] border-[10px] border-slate-900 bg-slate-900 shadow-xl overflow-hidden"
    >
      <div className="rounded-[1.6rem] overflow-hidden bg-slate-950 aspect-[9/16]">
        {showStatic ? (
          <Image
            src="/images/logo-uangku-mark.png"
            alt="Logo UangKu"
            width={410}
            height={321}
            className="h-full w-full object-contain p-10"
          />
        ) : (
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            src="/videos/UangKu_motiongraph.mp4"
            onError={() => setVideoMissing(true)}
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
