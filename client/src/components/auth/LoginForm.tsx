"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { useAuth } from "@/context/AuthContext";
import { ApiResponseError } from "@/lib/api";
import { haptic } from "@/lib/haptics";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PasswordField } from "@/components/auth/PasswordField";
import { GoogleButton } from "@/components/auth/GoogleButton";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const oauthError = searchParams.get("error");
  const oauthErrorMessage =
    oauthError === "google_not_configured"
      ? "Login dengan Google belum dikonfigurasi di server."
      : oauthError === "google_csrf_failed"
        ? "Sesi autentikasi Google kedaluwarsa. Silakan coba lagi."
        : oauthError === "google_auth_failed"
          ? "Autentikasi Google gagal atau dibatalkan."
          : null;
  const activeError = serverError || oauthErrorMessage;

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
      haptic.warning();
      return;
    }
    setErrors({});
    setIsLoading(true);
    try {
      await loginUser(email, password);
      haptic.success();
      const next = searchParams.get("next") || searchParams.get("redirect") || "/beranda";
      const redirect = next.startsWith("/") && !next.startsWith("//") ? next : "/beranda";
      router.push(redirect);
    } catch (err) {
      haptic.error();
      if (err instanceof ApiResponseError && err.fields) {
        const newErrors: typeof errors = {};
        if (err.fields.email) newErrors.email = err.fields.email;
        if (err.fields.password) newErrors.password = err.fields.password;
        setErrors(newErrors);
        if (Object.keys(newErrors).length === 0) {
          setServerError(err.message || "Gagal masuk.");
        }
      } else {
        setServerError(err instanceof ApiResponseError && err.message ? err.message : "Gagal masuk. Coba lagi.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      noValidate
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-text">Masuk</h1>
        <p className="text-sm text-muted">Masuk ke akun untuk mulai mencatat keuangan.</p>
      </div>

      {activeError && (
        <div role="alert" className="rounded-xl bg-surface border border-danger px-4 py-3">
          <p className="text-sm text-danger">{activeError}</p>
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
          enterKeyHint="next"
          placeholder="nama@email.com"
        />
        <PasswordField
          label="Password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) setErrors({ ...errors, password: undefined });
          }}
          error={errors.password}
          autoComplete="current-password"
          enterKeyHint="go"
        />
      </div>

      <div className="flex flex-col gap-4">
        <motion.div whileTap={{ scale: 0.96 }}>
          <Button type="submit" loading={isLoading} className="w-full">
            Masuk
          </Button>
        </motion.div>

        <div className="relative flex items-center justify-center my-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <span className="relative bg-canvas px-3 text-xs uppercase tracking-wider text-muted">
            atau
          </span>
        </div>

        <GoogleButton text="Masuk dengan Google" />

        <p className="text-sm text-center text-muted">
          Belum punya akun?{" "}
          <Link href="/daftar" className="text-accent font-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent rounded">
            Daftar
          </Link>
        </p>
      </div>
    </motion.form>
  );
}
