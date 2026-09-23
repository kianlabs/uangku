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

  it("parse ISO date strings secara konsisten di waktu lokal tanpa timezone shift", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 15));
    // Timestamp malam hari 23:00Z tetap diparse sebagai 2026-09-15
    expect(calculateStreak(["2026-09-15T23:59:59.000Z", "2026-09-14T12:00:00.000Z"])).toBe(2);
  });
});
