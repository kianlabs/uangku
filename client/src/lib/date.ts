/** Mengembalikan tanggal hari ini dalam zona waktu lokal untuk input date. */
export function todayLocalISO(): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

/**
 * Validasi tanggal transaksi, selaras dengan server
 * (TransactionCreate/UpdateRequest): boleh maksimal besok, tahun >= 2000.
 * Mengembalikan pesan error Indonesia atau null bila valid.
 */export function validateTransactionDate(value: string): string | null {
  if (!value) return "Tanggal harus diisi.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Format tanggal tidak valid.";
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) {
    return "Tanggal tidak valid.";
  }
  if (y < 2000) return "Tahun minimal 2000.";
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tISO = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
  if (value > tISO) return "Tanggal tidak boleh lebih dari besok.";
  return null;
}

/** "YYYY-MM" dari Date (zona lokal). */
export function toMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Geser "YYYY-MM" sejauh delta bulan (negatif = mundur). */
export function shiftMonthKey(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return toMonthKey(d);
}

/** Label Indonesia: "2026-09" → "September 2026". */
export function monthLabelId(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}

/** "YYYYMMDD" untuk filename/stamp. */
export function toCompactDate(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

