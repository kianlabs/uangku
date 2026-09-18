"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getPayday, setPayday } from "@/lib/local-storage";

export default function AkunPage() {
  const { user, logoutUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [payday, setPaydayState] = useState(() => getPayday());
  const [editingPayday, setEditingPayday] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [paydayError, setPaydayError] = useState<string | null>(null);

  function handlePaydaySave(day: number) {
    if (day >= 1 && day <= 31) {
      setPayday(day);
      setPaydayState(day);
      setEditingPayday(false);
      setPaydayError(null);
    } else {
      setPaydayError("Tanggal harus 1-31.");
    }
  }

  async function handleLogout() {
    setIsLoading(true);
    setLogoutError(null);
    try {
      await logoutUser();
    } catch {
      setLogoutError("Gagal keluar. Coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-text">Akun</h1>
        {user && <p className="text-sm text-muted">{user.email}</p>}
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-text uppercase tracking-wide">Pengaturan</h2>
        <div className="flex flex-col gap-3 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <span className="text-base text-text">Tanggal gajian</span>
            {editingPayday ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={payday}
                  onChange={(e) => setPaydayState(parseInt(e.target.value) || 1)}
                  className="w-16 h-9 px-2 text-center rounded-lg border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <button
                  onClick={() => handlePaydaySave(payday)}
                  className="px-3 h-9 rounded-lg bg-accent text-accent-ink text-sm font-medium hover:bg-accent/90 transition-colors"
                >
                  Simpan
                </button>
                <button
                  onClick={() => {
                    setEditingPayday(false);
                    setPaydayState(getPayday());
                    setPaydayError(null);
                  }}
                  className="px-3 h-9 rounded-lg bg-surface border border-border text-sm font-medium text-text hover:bg-surface-muted transition-colors"
                >
                  Batal
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingPayday(true)}
                className="flex items-center gap-2 text-base text-accent hover:underline"
              >
                <span className="font-semibold">{payday}</span>
                <span className="text-sm">Edit</span>
              </button>
            )}
          </div>
          {paydayError && editingPayday && (
            <p className="text-sm text-danger">{paydayError}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col divide-y divide-border">
        <Link
          href="/akun/kategori"
          className="flex items-center justify-between py-4 text-base text-text hover:opacity-70 active:opacity-50 transition-opacity"
        >
          <span className="font-medium">Kategori</span>
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </Link>
        <Link
          href="/akun/export-data"
          className="flex items-center justify-between py-4 text-base text-text hover:opacity-70 active:opacity-50 transition-opacity"
        >
          <span className="font-medium">Export</span>
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </Link>
      </div>

      <button
        onClick={handleLogout}
        disabled={isLoading}
        className="w-full h-12 px-5 rounded-xl text-base font-semibold text-text bg-transparent hover:bg-surface-muted active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isLoading ? "Keluar..." : "Keluar"}
      </button>
      {logoutError && <p className="text-sm text-danger">{logoutError}</p>}
    </div>
  );
}
