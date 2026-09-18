export interface ParseResult {
  amount: number;
  type: "expense" | "income";
  category?: string;
  description?: string;
}

const MULTIPLIERS: Record<string, number> = {
  rb: 1000,
  ribu: 1000,
  k: 1000,
  jt: 1000000,
  juta: 1000000,
};

export function parseQuickAdd(input: string): ParseResult | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;

  const match = trimmed.match(/^(.+?)\s+(\d+)\s*(rb|ribu|k|jt|juta)$/);
  if (!match) return null;

  const [, desc, digits, unit] = match;
  const multiplier = MULTIPLIERS[unit];
  if (!multiplier) return null;

  const amount = parseInt(digits, 10) * multiplier;
  const description = desc.trim();

  const categoryHints: Array<{
    type: ParseResult["type"];
    category?: string;
    keywords: string[];
  }> = [
    { type: "income", category: "Gaji", keywords: ["gaji", "salary", "upah"] },
    { type: "income", category: "Freelance", keywords: ["freelance"] },
    { type: "income", category: "Bonus", keywords: ["bonus"] },
    { type: "income", category: "Penjualan", keywords: ["penjualan", "jualan"] },
    { type: "income", keywords: ["pemasukan", "pendapatan", "income", "masuk"] },
    { type: "expense", category: "Makanan", keywords: ["kopi", "makan", "sarapan", "lunch", "dinner"] },
    { type: "expense", category: "Transportasi", keywords: ["bensin", "parkir", "ojek", "grab", "gojek"] },
    { type: "expense", category: "Hiburan", keywords: ["nonton", "film", "game"] },
  ];

  let type: ParseResult["type"] = "expense";
  let category: string | undefined;
  for (const hint of categoryHints) {
    if (hint.keywords.some((kw) => description.includes(kw))) {
      type = hint.type;
      category = hint.category;
      break;
    }
  }

  return { amount, type, description, category };
}
