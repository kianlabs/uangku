import { describe, it, expect } from "vitest";
import { parseQuickAdd } from "./quick-add-parser";

describe("parseQuickAdd", () => {
  it("parses 'kopi 20rb'", () => {
    const result = parseQuickAdd("kopi 20rb");
    expect(result).toEqual({
      amount: 20000,
      type: "expense",
      description: "kopi",
      category: "Makanan",
    });
  });

  it("parses 'makan siang 25 ribu'", () => {
    const result = parseQuickAdd("makan siang 25 ribu");
    expect(result).toEqual({
      amount: 25000,
      type: "expense",
      description: "makan siang",
      category: "Makanan",
    });
  });

  it("parses 'bensin 50rb'", () => {
    const result = parseQuickAdd("bensin 50rb");
    expect(result).toEqual({
      amount: 50000,
      type: "expense",
      description: "bensin",
      category: "Transportasi",
    });
  });

  it("parses 'gaji 5jt'", () => {
    const result = parseQuickAdd("gaji 5jt");
    expect(result).toEqual({
      amount: 5000000,
      type: "income",
      description: "gaji",
      category: "Gaji",
    });
  });

  describe("desimal koma & titik dengan satuan (2,5jt, 2,3jt, 1,5jt, dll)", () => {
    it("parses 'gaji 2,5jt'", () => {
      const result = parseQuickAdd("gaji 2,5jt");
      expect(result).toEqual({
        amount: 2500000,
        type: "income",
        description: "gaji",
        category: "Gaji",
      });
    });

    it("parses 'servis motor 2,3jt'", () => {
      const result = parseQuickAdd("servis motor 2,3jt");
      expect(result).toEqual({
        amount: 2300000,
        type: "expense",
        description: "servis motor",
        category: "Transportasi",
      });
    });

    it("parses 'bonus 1,5jt'", () => {
      const result = parseQuickAdd("bonus 1,5jt");
      expect(result).toEqual({
        amount: 1500000,
        type: "income",
        description: "bonus",
        category: "Bonus",
      });
    });

    it("parses dengan spasi sebelum satuan 'makan 1,5 juta'", () => {
      const result = parseQuickAdd("makan 1,5 juta");
      expect(result).toEqual({
        amount: 1500000,
        type: "expense",
        description: "makan",
        category: "Makanan",
      });
    });

    it("parses desimal dengan titik 'belanja 2.5jt'", () => {
      const result = parseQuickAdd("belanja 2.5jt");
      expect(result).toEqual({
        amount: 2500000,
        type: "expense",
        description: "belanja",
        category: "Belanja",
      });
    });

    it("parses satuan ribuan dengan koma 'kopi 1,5k' dan 'cilok 2,5rb'", () => {
      expect(parseQuickAdd("kopi 1,5k")).toEqual({
        amount: 1500,
        type: "expense",
        description: "kopi",
        category: "Makanan",
      });
      expect(parseQuickAdd("cilok 2,5rb")).toEqual({
        amount: 2500,
        type: "expense",
        description: "cilok",
        category: "Makanan",
      });
    });
  });

  describe("berbagai variasi penulisan (prefix rp, titik ribuan, posisi di awal)", () => {
    it("parses dengan prefix 'rp' atau 'rp.'", () => {
      expect(parseQuickAdd("kopi rp 25k")?.amount).toBe(25000);
      expect(parseQuickAdd("kopi rp20rb")?.amount).toBe(20000);
      expect(parseQuickAdd("gaji rp 2,5jt")?.amount).toBe(2500000);
      expect(parseQuickAdd("gaji rp. 2,5jt")?.amount).toBe(2500000);
      expect(parseQuickAdd("kopi rp 25.000")?.amount).toBe(25000);
    });

    it("parses angka ribuan lengkap (25000, 25.000, 25,000, 5.000.000)", () => {
      expect(parseQuickAdd("makan 25000")?.amount).toBe(25000);
      expect(parseQuickAdd("makan 25.000")?.amount).toBe(25000);
      expect(parseQuickAdd("makan 25,000")?.amount).toBe(25000);
      expect(parseQuickAdd("gaji 5.000.000")?.amount).toBe(5000000);
    });

    it("parses nominal di awal kalimat (2,5jt gaji, 20rb kopi, 25k makan siang)", () => {
      expect(parseQuickAdd("2,5jt gaji")).toEqual({
        amount: 2500000,
        type: "income",
        description: "gaji",
        category: "Gaji",
      });
      expect(parseQuickAdd("20rb kopi")).toEqual({
        amount: 20000,
        type: "expense",
        description: "kopi",
        category: "Makanan",
      });
      expect(parseQuickAdd("25k makan siang")).toEqual({
        amount: 25000,
        type: "expense",
        description: "makan siang",
        category: "Makanan",
      });
    });

    it("handles tanda pemisah seperti titik dua ':' atau tanda minus '-'", () => {
      expect(parseQuickAdd("kopi: 2,5jt")?.amount).toBe(2500000);
      expect(parseQuickAdd("kopi - 20rb")?.amount).toBe(20000);
      expect(parseQuickAdd("2,5jt - gaji")?.amount).toBe(2500000);
    });

    it("mempertahankan angka kuantitas dalam deskripsi 'beli 2 kopi 20rb'", () => {
      const result = parseQuickAdd("beli 2 kopi 20rb");
      expect(result).toEqual({
        amount: 20000,
        type: "expense",
        description: "beli 2 kopi",
        category: "Makanan",
      });
    });
  });

  describe("input tidak valid", () => {
    it("returns null for invalid input", () => {
      expect(parseQuickAdd("")).toBeNull();
      expect(parseQuickAdd("   ")).toBeNull();
      expect(parseQuickAdd("invalid")).toBeNull();
      expect(parseQuickAdd("20rb")).toBeNull();
      expect(parseQuickAdd("2,5jt")).toBeNull();
      expect(parseQuickAdd("kopi 2")).toBeNull(); // Angka 2 tanpa unit/rp dianggap kuantitas bukan nominal
    });
  });
});
