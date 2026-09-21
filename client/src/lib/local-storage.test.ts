import { describe, it, expect, beforeEach } from "vitest";
import {
  clearLocalCache,
  getPayday,
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
