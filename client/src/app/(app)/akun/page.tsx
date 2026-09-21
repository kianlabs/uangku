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
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold text-text">Akun</h1>

      <section aria-label="Profil" className="flex items-center gap-4 p-5 rounded-2xl bg-surface border border-border shadow-sm">
        <span
          aria-hidden="true"
          className="flex items-center justify-center w-12 h-12 rounded-2xl bg-accent/10 text-accent text-lg font-bold shrink-0"
        >
          {(user?.email?.[0] ?? "U").toUpperCase()}
        </span>
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-base font-semibold text-text truncate">{user?.email ?? "Pengguna"}</span>
          <span className="text-sm text-muted">Pengguna UangKu</span>
        </div>
      </section>

      <section aria-label="Pengaturan" className="flex flex-col gap-3 p-5 rounded-2xl bg-surface border border-border shadow-sm">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wide">
          Pengaturan
        </h2>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-base font-medium text-text">Tanggal gajian</span>
            {editingPayday ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={payday}
                  onChange={(e) => setPaydayState(parseInt(e.target.value) || 1)}
                  className="w-16 h-10 px-2 text-center rounded-lg border border-border bg-surface text-text font-semibold focus:outline-none focus:ring-2 focus:ring-accent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                />
                <button
                  onClick={() => handlePaydaySave(payday)}
                  className="px-4 h-10 rounded-lg bg-accent text-accent-ink text-sm font-semibold hover:bg-accent/90 active:scale-95 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  Simpan
                </button>
                <button
                  onClick={() => {
                    setEditingPayday(false);
                    setPaydayState(getPayday());
                    setPaydayError(null);
                  }}
                  className="px-4 h-10 rounded-lg bg-surface border border-border text-sm font-semibold text-text hover:bg-surface-muted active:scale-95 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  Batal
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingPayday(true)}
                className="flex items-center gap-2 text-base font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent rounded"
              >
                <span>{payday}</span>
                <span className="text-xs">Edit</span>
              </button>
            )}
          </div>
          {paydayError && editingPayday && (
            <p role="alert" className="text-sm text-danger">
              {paydayError}
            </p>
          )}
        </div>
      </section>

      <nav aria-label="Menu akun" className="flex flex-col rounded-2xl bg-surface border border-border shadow-sm px-5 divide-y divide-border">
        <Link
          href="/akun/kategori"
          className="flex items-center justify-between py-4 text-base font-medium text-text hover:bg-surface-muted/50 active:opacity-70 transition-colors px-2 -mx-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
        >
          <span>Kategori</span>
          <svg
            aria-hidden="true"
            width="20"
            height="20"
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
          className="flex items-center justify-between py-4 text-base font-medium text-text hover:bg-surface-muted/50 active:opacity-70 transition-colors px-2 -mx-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
        >
          <span>Export</span>
          <svg
            aria-hidden="true"
            width="20"
            height="20"
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
      </nav>

      <button
        onClick={handleLogout}
        disabled={isLoading}
        className="w-full h-12 px-5 rounded-xl text-base font-semibold text-white bg-danger hover:bg-danger/90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
      >
        {isLoading ? "Keluar..." : "Keluar"}
      </button>
      {logoutError && (
        <p role="alert" className="text-sm text-danger">
          {logoutError}
        </p>
      )}
    </div>
  );
}