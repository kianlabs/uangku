import type { Metadata, Viewport } from "next";
import { Geist, Source_Serif_4 } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { SplashScreen } from "@/components/brand/SplashScreen";
import { RegisterSW } from "./register-sw";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Serif khusus angka data read-only (saldo, nominal, %, count) — aksen
// identitas, lihat DESIGN.md §2. Label, tanggal, dan input tetap sans.
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
});

// Warna brand disimpan di satu konstanta — manifest.json & viewport harus
// identik dengan --color-brand (DESIGN.md §2, warna badan dompet Mochi).
export const BRAND_COLOR = "#024691";

export const metadata: Metadata = {
  title: "UangKu — Catat keuanganmu",
  description: "Expense tracker simpel untuk penggunaan harian.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "UangKu",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/images/logo-uangku-mark.png",
  },
  other: {
    "apple-mobile-web-app-title": "UangKu",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: BRAND_COLOR,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${geist.variable} ${sourceSerif.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-canvas text-text">
        <SplashScreen />
        <AuthProvider>{children}</AuthProvider>
        <RegisterSW />
      </body>
    </html>
  );
}
