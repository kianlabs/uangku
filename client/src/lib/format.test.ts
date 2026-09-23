import { describe, expect, it } from "vitest";
import { formatRupiahCompact } from "./format";

describe("formatRupiahCompact", () => {
  it("meringkas jutaan", () => {
    expect(formatRupiahCompact("2100000")).toMatch(/2,1/);
    expect(formatRupiahCompact("2100000")).toContain("jt");
  });

  it("meringkas ribuan", () => {
    expect(formatRupiahCompact(450000)).toBe("Rp 450 rb");
    expect(formatRupiahCompact(1500)).toBe("Rp 2 rb");
  });

  it("nilai kecil tetap penuh", () => {
    expect(formatRupiahCompact(750)).toBe("Rp 750");
  });

  it("nol tanpa desimal", () => {
    expect(formatRupiahCompact(0)).toBe("Rp 0");
  });

  it("angka negatif dipertahankan tandanya", () => {
    const out = formatRupiahCompact(-2100000);
    expect(out.startsWith("-")).toBe(true);
    expect(out).toContain("jt");
  });

  it("input tidak valid → —", () => {
    expect(formatRupiahCompact("bukan-angka")).toBe("—");
  });
});
