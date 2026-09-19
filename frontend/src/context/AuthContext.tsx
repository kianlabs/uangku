"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { getMe, login, logout, register } from "@/lib/auth";
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
  const router = useRouter();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    getMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const unauthorizedRef = useRef(false);

  useEffect(() => {
    function handleUnauthorized() {
      // Guard: prevent re-triggering while cleanup is in flight
      if (unauthorizedRef.current) return;
      unauthorizedRef.current = true;

      setUser(null);

      // Already on auth page — don't redirect again
      if (["/masuk", "/daftar"].includes(window.location.pathname)) {
        return;
      }

      // Best-effort logout: clear session server-side via Set-Cookie.
      // Ignore all errors — session is already invalid (401 triggered this).
      logout().catch(() => {
        // Intentional: session invalid, error expected
      });

      // Hard redirect required to break infinite loop:
      // stale session cookie still present in proxy after unauthorized event.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/masuk";
    }

    window.addEventListener("uangku:unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("uangku:unauthorized", handleUnauthorized);
    };
  }, []);

  const loginUser = useCallback(async (email: string, password: string) => {
    const u = await login(email, password);
    setUser(u);
  }, []);

  const registerUser = useCallback(async (email: string, password: string) => {
    const u = await register(email, password);
    setUser(u);
  }, []);

  const logoutUser = useCallback(async () => {
    await logout();
    setUser(null);
    router.push("/masuk");
  }, [router]);

  if (isLoading) {
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
        isLoading,
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
