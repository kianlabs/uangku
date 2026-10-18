"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { loginDemo } from "@/lib/auth";
import { clearLocalCache } from "@/lib/local-storage";
import { showToast } from "@/lib/toast";
import { haptic } from "@/lib/haptics";

interface DemoButtonProps {
  variant?: "hero" | "nav" | "secondary";
  className?: string;
  label?: string;
}

export function DemoButton({
  variant = "hero",
  className = "",
  label,
}: DemoButtonProps) {
  const router = useRouter();
  const { loginDemoUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  async function handleDemoLogin() {
    if (isLoading) return;
    setIsLoading(true);
    haptic.tap();

    try {
      showToast("Menyiapkan akun demo...", "info");
      if (loginDemoUser) {
        await loginDemoUser();
      } else {
        await loginDemo();
        clearLocalCache();
        window.dispatchEvent(new CustomEvent("uangku:auth-success"));
      }

      haptic.success();
      showToast("Selamat datang di akun demo!", "success");
      router.push("/dashboard");
    } catch {
      haptic.error();
      showToast("Gagal masuk ke akun demo. Silakan coba lagi.", "error");
      setIsLoading(false);
    }
  }

  if (variant === "nav") {
    return (
      <button
        type="button"
        onClick={handleDemoLogin}
        disabled={isLoading}
        aria-busy={isLoading}
        aria-label="Coba Demo Instan"
        className={`inline-flex items-center justify-center gap-1.5 h-9 sm:h-10 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold text-accent bg-accent/10 hover:bg-accent/20 active:scale-[0.98] transition-all min-h-[36px] sm:min-h-[44px] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shrink-0 ${className}`}
      >
        {isLoading ? (
          <span
            className="w-3.5 h-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin"
            aria-hidden="true"
          />
        ) : (
          <Zap className="w-3.5 h-3.5 fill-current text-accent" aria-hidden="true" />
        )}
        <span>{isLoading ? "Memuat…" : (label ?? "Coba Demo")}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleDemoLogin}
      disabled={isLoading}
      aria-busy={isLoading}
      aria-label="Coba Demo Instan tanpa mendaftar"
      className={`inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl font-semibold text-base transition-all active:scale-[0.98] bg-accent/10 hover:bg-accent/15 border border-accent/30 text-accent hover:border-accent/60 shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed min-h-[48px] w-full sm:w-auto ${className}`}
    >
      {isLoading ? (
        <span
          className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin"
          aria-hidden="true"
        />
      ) : (
        <Zap className="w-4 h-4 fill-current text-accent" aria-hidden="true" />
      )}
      <span>{isLoading ? "Menyiapkan Akun…" : (label ?? "Coba Demo Instan")}</span>
    </button>
  );
}
