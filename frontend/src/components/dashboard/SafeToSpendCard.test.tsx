import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SafeToSpendCard } from "./SafeToSpendCard";

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  });
});

describe("SafeToSpendCard", () => {
  it("Mochi presents recommendation in happy mood", () => {
    render(
      <SafeToSpendCard safeToSpendAmount={50000} daysLeft={10} remainingBalance="500000" />
    );
    expect(
      screen.getByRole("img", { name: "Mochi mempresentasikan rekomendasi belanja" })
    ).toBeTruthy();
    expect(screen.getByText(/rekomendasi aman belanjamu hari ini/i)).toBeTruthy();
    expect(screen.getByText(/10/)).toBeTruthy();
  });

  it("Mochi is worried when budget is tight", () => {
    render(
      <SafeToSpendCard safeToSpendAmount={0} daysLeft={5} remainingBalance="-10000" />
    );
    expect(screen.getByText(/rem dulu ya/i)).toBeTruthy();
  });

  it("mentions remaining days when ending soon", () => {
    render(
      <SafeToSpendCard safeToSpendAmount={20000} daysLeft={2} remainingBalance="40000" />
    );
    expect(screen.getByText(/tinggal 2 hari/i)).toBeTruthy();
  });
});
