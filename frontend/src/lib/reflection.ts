export function generateWeeklyReflection(
  totalExpense: number,
  topCategory: { name: string; amount: number } | null
): string {
  if (totalExpense === 0) return "Belum ada pengeluaran minggu ini.";
  
  const formatted = new Intl.NumberFormat("id-ID").format(totalExpense);
  
  if (!topCategory) {
    return `Total pengeluaran Rp ${formatted} minggu ini.`;
  }
  
  if (totalExpense < 50000) {
    return `Pengeluaran minggu ini Rp ${formatted}, paling banyak untuk ${topCategory.name}.`;
  } else if (totalExpense < 200000) {
    return `Minggu ini habis Rp ${formatted}, terbanyak ${topCategory.name}.`;
  } else if (totalExpense < 500000) {
    return `Pengeluaran minggu ini Rp ${formatted}, dominan ${topCategory.name}.`;
  } else {
    return `Total Rp ${formatted} minggu ini, sebagian besar ${topCategory.name}.`;
  }
}

export function getWeekExpense(transactions: Array<{ amount: string; transaction_date: string; type: string; category_name: string }>): {
  total: number;
  topCategory: { name: string; amount: number } | null;
} {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);

  const weekTxs = transactions.filter((tx) => {
    if (tx.type !== "expense") return false;
    const txDate = parseLocalDate(tx.transaction_date);
    return txDate >= weekAgo && txDate <= today;
  });

  const total = weekTxs.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

  const byCategory: Record<string, number> = {};
  for (const tx of weekTxs) {
    byCategory[tx.category_name] = (byCategory[tx.category_name] || 0) + parseFloat(tx.amount);
  }

  const entries = Object.entries(byCategory);
  if (entries.length === 0) return { total, topCategory: null };

  entries.sort((a, b) => b[1] - a[1]);
  const [name, amount] = entries[0];

  return { total, topCategory: { name, amount } };
}

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}
