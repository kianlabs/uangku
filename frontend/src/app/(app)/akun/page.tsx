"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";

export default function AkunPage() {
  const { user, logoutUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);
    try {
      await logoutUser();
      // logoutUser() sudah handle redirect ke /masuk via AuthContext
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-text">Akun</h1>
      {user && <p className="text-sm text-muted">{user.email}</p>}
      <Button
        variant="ghost"
        loading={isLoading}
        onClick={handleLogout}
        className="w-full justify-start"
      >
        Keluar
      </Button>
    </div>
  );
}
