"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { ApiResponseError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
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
      const next = searchParams.get("next") ?? "/beranda";
      router.push(next);
    } catch (err) {
      if (err instanceof ApiResponseError) {
        if (err.status === 401) {
          setServerError("Email atau password salah.");
        } else if (err.status === 0) {
          setServerError(err.message);
        } else {
          setServerError("Terjadi kesalahan. Coba lagi.");
        }
      } else {
        setServerError("Terjadi kesalahan. Coba lagi.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-text">Masuk</h1>
        <p className="text-sm text-muted">Masuk ke akun UangKu kamu.</p>
      </div>

      {serverError && (
        <div
          role="alert"
          className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-danger"
        >
          {serverError}
        </div>
      )}

      <div className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          placeholder="kamu@email.com"
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          placeholder="Password kamu"
        />
      </div>

      <div className="flex flex-col gap-3">
        <Button type="submit" variant="primary" loading={isLoading} className="w-full">
          Masuk
        </Button>
        <p className="text-center text-sm text-muted">
          Belum punya akun?{" "}
          <Link
            href="/daftar"
            className="text-accent font-medium underline-offset-2 hover:underline"
          >
            Daftar
          </Link>
        </p>
      </div>
    </form>
  );
}
