export function formatRupiah(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(n)
    .replace("IDR", "Rp");
}

export function formatDate(
  dateStr: string,
  opts?: { long?: boolean }
): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID", {
    day: "numeric",
    month: opts?.long ? "long" : "short",
    year: "numeric",
  });
}
