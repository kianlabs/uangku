"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/ui/BottomNav";
import { PageTransition } from "@/components/ui/PageTransition";
import { Toaster } from "@/components/ui/Toaster";
import { flushOfflineTransactions } from "@/lib/transactions";
import { useEffect, useState } from "react";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // Hanya beranda yang melebar di desktop (grid 2 kolom).
  // Halaman lain tetap ramping agar form & list nyaman dibaca.
  const isWide = pathname === "/beranda";
  const [queuedCount, setQueuedCount] = useState(0);

  useEffect(() => {
    function updateQueue() {
      import("@/lib/local-storage").then(({ getOfflineTransactions }) =>
        setQueuedCount(getOfflineTransactions().length)
      );
    }
    function sync() {
      void flushOfflineTransactions().then(updateQueue);
    }
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("uangku:offline-queue-changed", updateQueue);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("uangku:offline-queue-changed", updateQueue);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <main
        className={`flex-1 w-full mx-auto px-4 pt-6 ${
          isWide ? "max-w-lg lg:max-w-4xl lg:px-6" : "max-w-lg"
        }`}
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom) + 7.5rem)",
        }}
      >
        <PageTransition>{children}</PageTransition>
        <Toaster />
        {queuedCount > 0 && (
          <p className="fixed bottom-24 inset-x-0 z-30 mx-auto w-fit max-w-[calc(100%-2rem)] rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-800 shadow-sm">
            {queuedCount} transaksi menunggu koneksi
          </p>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
