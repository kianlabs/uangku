import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = { title: "Masuk — UangKu" };

export default function MasukPage() {
  // Suspense diperlukan karena LoginForm menggunakan useSearchParams()
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
