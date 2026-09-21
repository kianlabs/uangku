import { describe, expect, it, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { BalanceCard } from "./BalanceCard";

const MASK_KEY = "uangku_balance_masked";

describe("BalanceCard — mask saldo", () => {
  beforeEach(() => {
    sessionStorage.removeItem(MASK_KEY);
  });

  it("default menyembunyikan saldo, klik menampilkan, klik lagi menyembunyikan", () => {
    render(
      <BalanceCard balance="1234000" monthly_income="500000" monthly_expense="200000" />
    );

    // Default: masked
    expect(screen.getByText(/••••••/)).toBeDefined();

    // Klik mata → saldo tampil, konvensi storage: unmask = "0"
    fireEvent.click(screen.getByRole("button", { name: "Tampilkan saldo" }));
    expect(sessionStorage.getItem(MASK_KEY)).toBe("0");
    expect(screen.queryByText(/••••••/)).toBeNull();

    // Klik lagi → masked balik, konvensi storage: mask = "1"
    fireEvent.click(screen.getByRole("button", { name: "Sembunyikan saldo" }));
    expect(sessionStorage.getItem(MASK_KEY)).toBe("1");
    expect(screen.getByText(/••••••/)).toBeDefined();
  });

  it("preferensi 'terbuka' bertahan saat komponen dirender ulang", () => {
    sessionStorage.setItem(MASK_KEY, "0");
    render(
      <BalanceCard balance="1234000" monthly_income="500000" monthly_expense="200000" />
    );
    expect(screen.queryByText(/••••••/)).toBeNull();
    expect(screen.getByRole("button", { name: "Sembunyikan saldo" })).toBeDefined();
  });
});
