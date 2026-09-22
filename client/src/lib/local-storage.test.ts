import { describe, it, expect, beforeEach } from "vitest";
import {
  clearLocalCache,
  getPayday,
  getTemplates,
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

  it("membuang tx_sources/template sisa akun lain saat server kosong", () => {
    localStorage.setItem("uangku_tx_sources", JSON.stringify({ abc: "Tunai" }));
    localStorage.setItem(
      "uangku_templates",
      JSON.stringify([{ id: "x", name: "Milik A", amount: 1, category: "Lainnya" }])
    );
    seedLocalStorageFromPreferences({ payday: 1, tx_sources: {}, templates: [] });
    expect(localStorage.getItem("uangku_tx_sources")).toBeNull();
    expect(getTemplates().map((t) => t.name)).toContain("Kos");
  });

  it("menulis tx_sources dari server saat ada isi", () => {
    seedLocalStorageFromPreferences({ payday: 1, tx_sources: { abc: "Tunai" } });
    expect(localStorage.getItem("uangku_tx_sources")).toBe(
      JSON.stringify({ abc: "Tunai" })
    );
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
