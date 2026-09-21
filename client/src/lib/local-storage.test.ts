import { describe, it, expect, beforeEach } from "vitest";
import {
  clearLocalCache,
  getPayday,
  isRecurringDue,
  seedLocalStorageFromPreferences,
  setPayday,
} from "./local-storage";

beforeEach(() => {
  localStorage.clear();
});

describe("payday cache", () => {
  it("roundtrip set/get dan default 1 saat kosong", () => {
    expect(getPayday()).toBe(1);
    setPayday(25);
    expect(getPayday()).toBe(25);
  });
});

describe("seedLocalStorageFromPreferences", () => {
  it("menulis payday dari server", () => {
    seedLocalStorageFromPreferences({ payday: 25 });
    expect(getPayday()).toBe(25);
  });

  it("membuang payday lokal saat server null (sisa akun lain)", () => {
    setPayday(25);
    seedLocalStorageFromPreferences({ payday: null });
    expect(getPayday()).toBe(1);
  });
});

describe("clearLocalCache", () => {
  it("membuang semua cache lokal", () => {
    setPayday(25);
    localStorage.setItem("uangku_tx_sources", "{}");
    clearLocalCache();
    expect(getPayday()).toBe(1);
    expect(localStorage.getItem("uangku_tx_sources")).toBeNull();
  });
});

describe("recurring transaction due dates", () => {
  it("hanya jatuh tempo setelah tanggal dan sekali per bulan", () => {
    const item = { id: "1", name: "Internet", amount: 100000, category: "Tagihan", day: 20, active: true };
    expect(isRecurringDue(item, new Date(2026, 8, 19))).toBe(false);
    expect(isRecurringDue(item, new Date(2026, 8, 20))).toBe(true);
    expect(isRecurringDue({ ...item, lastConfirmed: "2026-09-20T10:00:00Z" }, new Date(2026, 8, 25))).toBe(false);
    expect(isRecurringDue({ ...item, day: 31 }, new Date(2026, 1, 28))).toBe(true);
  });
});
