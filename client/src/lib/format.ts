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
