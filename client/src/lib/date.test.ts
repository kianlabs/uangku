import { describe, expect, it } from "vitest";

import { todayLocalISO, validateTransactionDate, toMonthKey, shiftMonthKey, monthLabelId, toCompactDate } from "./date";

function plusDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

describe("validateTransactionDate", () => {
  it("menolak kosong", () => {
    expect(validateTransactionDate("")).toBe("Tanggal harus diisi.");
  });

  it("menerima hari ini dan besok", () => {
    expect(validateTransactionDate(todayLocalISO())).toBeNull();
    expect(validateTransactionDate(plusDaysISO(1))).toBeNull();
  });

  it("menolak lusa dan 2100", () => {
    expect(validateTransactionDate(plusDaysISO(2))).toBe(
      "Tanggal tidak boleh lebih dari besok."
    );
    expect(validateTransactionDate("2100-01-01")).toBe(
      "Tanggal tidak boleh lebih dari besok."
    );
  });

  it("menolak tahun di bawah 2000", () => {
    expect(validateTransactionDate("1999-12-31")).toBe("Tahun minimal 2000.");
  });

  it("menolak tanggal tidak valid", () => {
    expect(validateTransactionDate("2026-02-30")).toBe("Tanggal tidak valid.");
    expect(validateTransactionDate("abc")).toBe("Format tanggal tidak valid.");
  });
});

describe("month helpers", () => {
  it("toMonthKey format YYYY-MM", () => {
    expect(toMonthKey(new Date(2026, 8, 22))).toBe("2026-09");
    expect(toMonthKey(new Date(2026, 0, 5))).toBe("2026-01");
  });

  it("shiftMonthKey mundur/maju lewat batas tahun", () => {
    expect(shiftMonthKey("2026-09", -1)).toBe("2026-08");
    expect(shiftMonthKey("2026-01", -1)).toBe("2025-12");
    expect(shiftMonthKey("2026-12", 1)).toBe("2027-01");
  });

  it("monthLabelId bahasa Indonesia", () => {
    expect(monthLabelId("2026-09")).toBe("September 2026");
  });

  it("toCompactDate format YYYYMMDD", () => {
    expect(toCompactDate(new Date(2026, 8, 5))).toBe("20260905");
  });
});
