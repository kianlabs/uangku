"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/ui/BottomNav";
import { FAB } from "@/components/ui/FAB";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // Hanya beranda yang melebar di desktop (grid 2 kolom).
  // Halaman lain tetap ramping agar form & list nyaman dibaca.
  const isWide = pathname === "/beranda";

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <main
        className={`flex-1 w-full mx-auto px-4 pt-6 ${
          isWide ? "max-w-lg lg:max-w-4xl lg:px-6" : "max-w-lg"
        }`}
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom) + 6rem)",
        }}
      >
        {children}
      </main>
      <FAB />
      <BottomNav />
    </div>
  );
}
