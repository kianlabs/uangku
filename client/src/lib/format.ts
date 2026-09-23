export function formatRupiah(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Ringkasan angka besar utk ruang sempit: "2.100.000" → "Rp 2,1 jt",
 * "450.000" → "Rp 450 rb", < 1.000 → "Rp 750". Pembulatan 1 desimal.
 */
export function formatRupiahCompact(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  const fmt = (v: number) =>
    new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(v);
  if (abs >= 1_000_000_000) return `${sign}Rp ${fmt(abs / 1_000_000_000)} M`;
  if (abs >= 1_000_000) return `${sign}Rp ${fmt(abs / 1_000_000)} jt`;
  if (abs >= 1_000) return `${sign}Rp ${Math.round(abs / 1_000)} rb`;
  return `${sign}Rp ${fmt(abs)}`;
}

/**
 * Kelompokkan digit mentah ("1500000" → "1.500.000") untuk tampil live
 * di input nominal. State tetap simpan digit polos.
 */
export function groupThousands(digits: string): string {
  const d = digits.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (!d) return "";
  return d.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function formatDate(
  dateStr: string,
  opts?: { long?: boolean }
): string {
  // Accept "YYYY-MM-DD" or full ISO datetime; server may send either.
  const day = dateStr.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return dateStr;
  return new Date(day + "T00:00:00").toLocaleDateString("id-ID", {
    day: "numeric",
    month: opts?.long ? "long" : "short",
    year: "numeric",
  });
}
