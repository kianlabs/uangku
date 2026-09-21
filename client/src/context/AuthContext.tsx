"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { getMe, login, logout, register } from "@/lib/auth";
import { getPreferences } from "@/lib/preferences";
import { clearLocalCache, seedLocalStorageFromPreferences } from "@/lib/local-storage";
import type { User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginUser: (email: string, password: string) => Promise<void>;
  registerUser: (email: string, password: string) => Promise<void>;
  logoutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  const isPublicPath = ["/", "/masuk", "/daftar"].includes(pathname);
  const router = useRouter();
  const initialized = useRef(false);

  useEffect(() => {
    if (isPublicPath) {
      return;
    }
    if (initialized.current) return;
    initialized.current = true;

    getMe()
      .then((currentUser) => {
        setUser(currentUser);
        // Hydrate localStorage dari server preferences (fire-and-forget — tidak block render)
        getPreferences()
          .then((prefs) => seedLocalStorageFromPreferences(prefs))
          .catch(() => {
            // Preferences gagal diambil — tidak fatal, localStorage cache tetap dipakai
          });
      })
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, [isPublicPath, pathname]);

  const unauthorizedRef = useRef(false);

  useEffect(() => {
    function handleUnauthorized() {
      // Already on public page (landing/auth) — don't redirect, allow future events.
      if (["/", "/masuk", "/daftar"].includes(window.location.pathname)) {
        unauthorizedRef.current = false;
        return;
      }
      // Guard: prevent re-triggering while cleanup is in flight
      if (unauthorizedRef.current) return;
      unauthorizedRef.current = true;

      setUser(null);

      // Best-effort logout: clear session server-side via Set-Cookie.
      // Ignore all errors — session is already invalid (401 triggered this).
      logout().catch(() => {
        // Intentional: session invalid, error expected
      });

      // Hard redirect required to break infinite loop:
      // stale session cookie still present in proxy after unauthorized event.
      // Preserve destination so login can redirect back via ?next=.
      const next = `${window.location.pathname}${window.location.search}`;
      const target =
        next.startsWith("/") && !next.startsWith("//") && next !== "/"
          ? `/masuk?next=${encodeURIComponent(next)}`
          : "/masuk";
      window.location.href = target;
    }

    window.addEventListener("uangku:unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("uangku:unauthorized", handleUnauthorized);
    };
  }, []);

  const loginUser = useCallback(async (email: string, password: string) => {
    const u = await login(email, password);
    unauthorizedRef.current = false;
    setUser(u);
    window.dispatchEvent(new CustomEvent("uangku:auth-success"));
    // Hydrate localStorage dari server setelah login
    getPreferences()
      .then((prefs) => seedLocalStorageFromPreferences(prefs))
      .catch(() => {});
  }, []);

  const registerUser = useCallback(async (email: string, password: string) => {
    const u = await register(email, password);
    unauthorizedRef.current = false;
    // Akun baru di browser bersama — buang sisa cache akun sebelumnya
    clearLocalCache();
    setUser(u);
    window.dispatchEvent(new CustomEvent("uangku:auth-success"));
    // Preferences kosong untuk user baru — tidak perlu hydrate, localStorage sudah default
  }, []);

  const logoutUser = useCallback(async () => {
    await logout();
    clearLocalCache();
    setUser(null);
    router.push("/masuk");
  }, [router]);

  if (isLoading && !isPublicPath) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <svg
          aria-label="Memuat…"
          role="status"
          className="animate-spin h-6 w-6 text-accent"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading: isLoading && !isPublicPath,
        loginUser,
        registerUser,
        logoutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
