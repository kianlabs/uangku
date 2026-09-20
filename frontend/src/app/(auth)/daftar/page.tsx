import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata = { title: "Daftar — UangKu" };

export default function DaftarPage() {
  // Suspense diperlukan karena RegisterForm menggunakan useSearchParams()
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
