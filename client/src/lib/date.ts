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
 */
export function validateTransactionDate(value: string): string | null {
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

