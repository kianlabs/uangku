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

  it("shows remaining budget for today within limit", async () => {
    // reduced-motion: count-up selesai dalam 1 frame agar deterministik
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    });
    render(
      <SafeToSpendCard safeToSpendAmount={100000} daysLeft={10} remainingBalance="1000000" todayExpense={25000} />
    );
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("25");
    // 100.000 - 25.000 = 75.000 sebagai angka besar
    expect(await screen.findByText(/Rp\s?75\.000/)).toBeTruthy();
  });

  it("shows zero and worried message when daily budget is spent", () => {
    render(
      <SafeToSpendCard safeToSpendAmount={50000} daysLeft={10} remainingBalance="500000" todayExpense={80000} />
    );
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("100");
    expect(screen.getByText("Rp 0")).toBeTruthy();
    expect(screen.getByText(/batas hari ini habis/i)).toBeTruthy();
  });
});
