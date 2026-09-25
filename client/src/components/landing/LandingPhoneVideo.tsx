"use client";

import Image from "next/image";
import { useSyncExternalStore } from "react";

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

export function LandingPhoneVideo() {
  const reduced = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return (
    <div
      aria-hidden={reduced ? undefined : true}
      data-testid="phone-mockup"
      className="relative mx-auto w-full max-w-[280px]"
    >
      {/* Side buttons */}
      {/* Action button */}
      <div className="absolute -left-[3px] top-[95px] h-7 w-[3px] rounded-l-sm bg-neutral-600" />
      {/* Volume Up */}
      <div className="absolute -left-[3px] top-[135px] h-12 w-[3px] rounded-l-sm bg-neutral-600" />
      {/* Volume Down */}
      <div className="absolute -left-[3px] top-[195px] h-12 w-[3px] rounded-l-sm bg-neutral-600" />
      {/* Power Button */}
      <div className="absolute -right-[3px] top-[145px] h-16 w-[3px] rounded-r-sm bg-neutral-600" />

      {/* iPhone Body */}
      <div className="relative rounded-[3rem] p-2 bg-gradient-to-b from-neutral-700 via-neutral-900 to-neutral-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.45)] ring-1 ring-neutral-700/50">
        {/* Inner bezel */}
        <div className="relative rounded-[2.5rem] bg-black p-1 ring-1 ring-white/10 overflow-hidden shadow-inner">
          {/* Speaker ear piece */}
          <div className="pointer-events-none absolute inset-x-0 top-1.5 flex justify-center z-20">
            <span className="h-1 w-12 rounded-full bg-neutral-800" />
          </div>

          {/* Screen Area */}
          <div className="relative rounded-[2.1rem] overflow-hidden bg-black aspect-[1170/2532] shadow-2xl">
            <Image
              src="/mockup-beranda.jpeg"
              alt="Screenshot aplikasi UangKu"
              width={1170}
              height={2532}
              unoptimized
              priority
              className="w-full h-full object-cover select-none pointer-events-none"
            />
            {/* Dynamic Island */}
            <div className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 z-20">
              <div className="h-5 w-20 rounded-full bg-black ring-1 ring-neutral-800/80 flex items-center justify-between px-2 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-neutral-900 ring-1 ring-neutral-800" />
                <span className="h-1.5 w-1.5 rounded-full bg-neutral-900/60" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
