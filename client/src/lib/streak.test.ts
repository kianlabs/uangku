import { describe, it, expect, vi, afterEach } from "vitest";
import { calculateStreak } from "./streak";

vi.mock("./local-storage", () => ({ getPayday: () => 1 }));

afterEach(() => {
  vi.useRealTimers();
});

describe("calculateStreak", () => {
  it("menghitung streak dari kemarin saat hari ini belum ada transaksi", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 15));
    expect(calculateStreak(["2026-09-14", "2026-09-13"])).toBe(2);
  });

  it("menghitung streak termasuk hari ini bila sudah ada transaksi", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 15));
    expect(calculateStreak(["2026-09-15", "2026-09-14", "2026-09-13"])).toBe(3);
  });

  it("mengembalikan 0 tanpa transaksi", () => {
    expect(calculateStreak([])).toBe(0);
  });
});
