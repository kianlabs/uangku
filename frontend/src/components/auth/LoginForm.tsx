"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { ApiResponseError } from "@/lib/api";
import { Input } from "@/components/ui/Input";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function validate(): typeof errors {
    const e: typeof errors = {};
    if (!email) e.email = "Email harus diisi.";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Format email tidak valid.";
    if (!password) e.password = "Password harus diisi.";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setIsLoading(true);
    try {
      await loginUser(email, password);
      const next = searchParams.get("next") || searchParams.get("redirect") || "/beranda";
      const redirect = next.startsWith("/") && !next.startsWith("//") ? next : "/beranda";
      router.push(redirect);
    } catch (err) {
      if (err instanceof ApiResponseError && err.fields) {
        const newErrors: typeof errors = {};
        if (err.fields.email) newErrors.email = err.fields.email;
        if (err.fields.password) newErrors.password = err.fields.password;
        setErrors(newErrors);
        if (Object.keys(newErrors).length === 0) {
          setServerError(err.message || "Gagal masuk.");
        }
      } else {
        setServerError("Gagal masuk. Coba lagi.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-text">Masuk</h1>
        <p className="text-sm text-muted">Masuk ke akun untuk mulai mencatat keuangan.</p>
      </div>

      {serverError && (
        <div className="rounded-xl bg-surface border border-danger px-4 py-3">
          <p className="text-sm text-danger">{serverError}</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <Input
          type="email"
          label="Email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors({ ...errors, email: undefined });
          }}
          error={errors.email}
          autoComplete="email"
          placeholder="nama@email.com"
        />
        <Input
          type="password"
          label="Password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) setErrors({ ...errors, password: undefined });
          }}
          error={errors.password}
          autoComplete="current-password"
        />
      </div>

      <div className="flex flex-col gap-4">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 px-5 rounded-xl bg-accent text-accent-ink text-base font-semibold hover:bg-accent/90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? "Masuk..." : "Masuk"}
        </button>
        <p className="text-sm text-center text-muted">
          Belum punya akun?{" "}
          <Link href="/daftar" className="text-accent font-medium hover:underline">
            Daftar
          </Link>
        </p>
      </div>
    </form>
  );
}
