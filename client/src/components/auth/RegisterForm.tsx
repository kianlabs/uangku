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

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { registerUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [inviteCode, setInviteCode] = useState("");
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
      haptic.warning();
      return;
    }
    setErrors({});
    setIsLoading(true);
    try {
      await registerUser(email, password, inviteCode);
      haptic.success();
      const next = searchParams.get("next") || "/beranda";
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
          setServerError(err.message || "Gagal mendaftar.");
        }
      } else {
        setServerError(err instanceof ApiResponseError && err.message ? err.message : "Gagal mendaftar. Coba lagi.");
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
        <h1 className="text-2xl font-bold text-text">Daftar</h1>
        <p className="text-sm text-muted">Buat akun baru untuk mulai mencatat keuangan.</p>
      </div>

      {serverError && (
        <div role="alert" className="rounded-xl bg-surface border border-danger px-4 py-3">
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
          autoComplete="new-password"
          enterKeyHint="next"
          hint="Minimal 8 karakter"
        />
        <PasswordField
          label="Konfirmasi Password"
          value={konfirmasi}
          onChange={(e) => {
            setKonfirmasi(e.target.value);
            if (errors.konfirmasi) setErrors({ ...errors, konfirmasi: undefined });
          }}
          error={errors.konfirmasi}
          autoComplete="new-password"
          enterKeyHint="go"
        />
        <Input
          type="text"
          label="Kode undangan (opsional)"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          autoComplete="off"
          placeholder="Diisi bila diminta admin"
        />
      </div>

      <div className="flex flex-col gap-4">
        <motion.div whileTap={{ scale: 0.96 }}>
          <Button type="submit" loading={isLoading} className="w-full">
            Daftar
          </Button>
        </motion.div>
        <p className="text-sm text-center text-muted">
          Sudah punya akun?{" "}
          <Link href="/masuk" className="text-accent font-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent rounded">
            Masuk
          </Link>
        </p>
      </div>
    </motion.form>
  );
}
