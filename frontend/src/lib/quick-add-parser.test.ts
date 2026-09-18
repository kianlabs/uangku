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

  it("returns null for invalid input", () => {
    expect(parseQuickAdd("")).toBeNull();
    expect(parseQuickAdd("invalid")).toBeNull();
    expect(parseQuickAdd("20rb")).toBeNull();
  });
});
