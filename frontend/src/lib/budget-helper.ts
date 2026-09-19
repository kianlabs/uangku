import type { ExpenseByCategoryItem } from "@/lib/types";
import { formatRupiah } from "@/lib/format";

export interface BudgetWarningData {
  categoryName: string;
  percent: number;
  remainingText: string;
}

// ponytail: heuristic frontend-only tanpa data budget nyata — batas: percent adalah
// konstanta desain (85%), sisa uang hanya estimasi rata-rata belanja kategori. JANGAN
// jadikan sumber kebenaran anggaran; product-brief melarang complex budgeting di v1.
export function getBudgetWarningData(
  expenseByCategory: ExpenseByCategoryItem[] | undefined
): BudgetWarningData | null {
  if (!expenseByCategory || expenseByCategory.length === 0) return null;

  const top = expenseByCategory.reduce((a, b) =>
    parseFloat(b.amount) > parseFloat(a.amount) ? b : a
  );
  const spent = Number.parseFloat(top.amount);
  if (!Number.isFinite(spent) || spent <= 0) return null;

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const remainingDays = Math.max(daysInMonth - now.getDate(), 1);

  // ponytail: estimasi sisa = 15% dari total kategori terbesar; batas: angka ilustratif,
  // bukan perhitungan anggaran nyata.
  const remaining = Math.round(spent * 0.15);

  return {
    categoryName: top.category_name,
    percent: 85,
    remainingText: `Sisa ${formatRupiah(remaining)} untuk ${remainingDays} hari ke depan`,
  };
}
