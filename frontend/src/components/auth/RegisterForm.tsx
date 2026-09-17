"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { ApiResponseError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function RegisterForm() {
  const router = useRouter();
  const { registerUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    konfirmasi?: string;
  }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function validate(): typeof errors {
    const e: typeof errors = {};
    if (!email) e.email = "Email harus diisi.";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Format email tidak valid.";
    if (!password) e.password = "Password harus diisi.";
    else if (password.length < 8) e.password = "Password minimal 8 karakter.";
    if (!konfirmasi) e.konfirmasi = "Konfirmasi password harus diisi.";
    else if (konfirmasi !== password) e.konfirmasi = "Password tidak cocok.";
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
      await registerUser(email, password);
      router.push("/beranda");
    } catch (err) {
      if (err instanceof ApiResponseError) {
        if (err.status === 409) {
          setErrors({ email: "Email sudah terdaftar." });
        } else if (err.status === 0) {
          setServerError(err.message);
        } else {
          setServerError("Pendaftaran gagal. Coba lagi.");
        }
      } else {
        setServerError("Pendaftaran gagal. Coba lagi.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-text">Buat akun</h1>
        <p className="text-sm text-muted">Mulai catat keuanganmu secara gratis.</p>
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
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          hint="Minimal 8 karakter"
          placeholder="Buat password"
        />
        <Input
          label="Konfirmasi Password"
          type="password"
          autoComplete="new-password"
          value={konfirmasi}
          onChange={(e) => setKonfirmasi(e.target.value)}
          error={errors.konfirmasi}
          placeholder="Ulangi password"
        />
      </div>

      <div className="flex flex-col gap-3">
        <Button type="submit" variant="primary" loading={isLoading} className="w-full">
          Daftar
        </Button>
        <p className="text-center text-sm text-muted">
          Sudah punya akun?{" "}
          <Link
            href="/masuk"
            className="text-accent font-medium underline-offset-2 hover:underline"
          >
            Masuk
          </Link>
        </p>
      </div>
    </form>
  );
}
