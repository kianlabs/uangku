import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UangKu — Catat keuanganmu",
  description: "Expense tracker simpel untuk penggunaan harian.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#FAF9F6",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-canvas text-text">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
