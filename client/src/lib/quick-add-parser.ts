export interface ParseResult {
  amount: number;
  type: "expense" | "income";
  category?: string;
  description?: string;
}

const MULTIPLIERS: Record<string, number> = {
  k: 1_000,
  rb: 1_000,
  ribu: 1_000,
  jt: 1_000_000,
  juta: 1_000_000,
  m: 1_000_000_000,
  miliar: 1_000_000_000,
  milyar: 1_000_000_000,
};

function parseNominalStr(str: string): number | null {
  const s = str.trim();
  if (!s) return null;

  // 1. Nominal dengan satuan (misal: 2,5jt, 2.5 jt, 25k, rp 25rb, 1,5 juta, 2,3jt)
  const unitMatch = s.match(
    /^(?:rp\.?\s*)?(\d+(?:[.,]\d+)?)\s*(rb|ribu|k|jt|juta|miliar|milyar|m)$/i
  );
  if (unitMatch) {
    const [, numStr, unit] = unitMatch;
    const mult = MULTIPLIERS[unit.toLowerCase()];
    if (!mult) return null;
    const num = parseFloat(numStr.replace(",", "."));
    if (isNaN(num) || num <= 0) return null;
    return Math.round(num * mult);
  }

  // 2. Format ribuan dengan titik atau koma (misal: 25.000, 25,000, 2.500.000, rp 25.000)
  const formattedMatch = s.match(/^(?:rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})+)$/i);
  if (formattedMatch) {
    const numStr = formattedMatch[1].replace(/[.,]/g, "");
    const val = parseInt(numStr, 10);
    return val > 0 ? val : null;
  }

  // 3. Angka murni atau dengan prefix Rp (misal: rp 25000, rp25000, atau 25000)
  const plainMatch = s.match(/^(?:(rp\.?\s*)(\d+)|(\d+))$/i);
  if (plainMatch) {
    const hasRp = Boolean(plainMatch[1]);
    const numStr = plainMatch[2] || plainMatch[3];
    const val = parseInt(numStr, 10);
    // Tanpa prefix 'rp' atau satuan, cegah angka kecil (seperti kuantitas "kopi 2") terdeteksi sebagai nominal
    if (!hasRp && val < 100) return null;
    return val > 0 ? val : null;
  }

  return null;
}

export function parseQuickAdd(input: string): ParseResult | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Regex pola posisi nominal di akhir (contoh: "kopi 20rb", "gaji 2,5jt", "beli kopi 25k")
  const endUnitRegex =
    /^(.+?)\s+((?:rp\.?\s*)?\d+(?:[.,]\d+)?\s*(?:rb|ribu|k|jt|juta|miliar|milyar|m))$/i;
  const endFormattedRegex = /^(.+?)\s+((?:rp\.?\s*)?\d{1,3}(?:[.,]\d{3})+)$/i;
  const endPlainRegex = /^(.+?)\s+((?:rp\.?\s*)?\d+)$/i;

  // Regex pola posisi nominal di awal (contoh: "2,5jt gaji", "20rb kopi", "rp 25.000 makan")
  const startUnitRegex =
    /^((?:rp\.?\s*)?\d+(?:[.,]\d+)?\s*(?:rb|ribu|k|jt|juta|miliar|milyar|m))\s+(.+)$/i;
  const startFormattedRegex =
    /^((?:rp\.?\s*)?\d{1,3}(?:[.,]\d{3})+)\s+(.+)$/i;
  const startPlainRegex = /^((?:rp\.?\s*)?\d+)\s+(.+)$/i;

  let desc = "";
  let amount: number | null = null;

  // Cek posisi nominal di akhir terlebih dahulu (paling umum)
  let match =
    trimmed.match(endUnitRegex) ||
    trimmed.match(endFormattedRegex) ||
    trimmed.match(endPlainRegex);

  if (match) {
    const candidate = parseNominalStr(match[2]);
    if (candidate !== null) {
      desc = match[1].replace(/[-:]$/, "").trim();
      amount = candidate;
    }
  }

  // Jika belum cocok, cek posisi nominal di awal
  if (amount === null) {
    match =
      trimmed.match(startUnitRegex) ||
      trimmed.match(startFormattedRegex) ||
      trimmed.match(startPlainRegex);

    if (match) {
      const candidate = parseNominalStr(match[1]);
      if (candidate !== null) {
        desc = match[2].replace(/^[-:]/, "").trim();
        amount = candidate;
      }
    }
  }

  if (amount === null || !desc) return null;

  const categoryHints: Array<{
    type: ParseResult["type"];
    category?: string;
    keywords: string[];
  }> = [
    { type: "income", category: "Gaji", keywords: ["gaji", "salary", "upah"] },
    { type: "income", category: "Freelance", keywords: ["freelance"] },
    { type: "income", category: "Bonus", keywords: ["bonus", "thr"] },
    { type: "income", category: "Penjualan", keywords: ["penjualan", "jualan", "omzet", "omset"] },
    { type: "income", category: "Investasi", keywords: ["dividen", "investasi", "profit"] },
    { type: "income", keywords: ["pemasukan", "pendapatan", "income", "masuk"] },
    {
      type: "expense",
      category: "Makanan",
      keywords: ["kopi", "makan", "sarapan", "lunch", "dinner", "jajan", "snack", "resto", "kafe", "cafe", "bakso", "mie", "nasi", "minum", "cilok"],
    },
    {
      type: "expense",
      category: "Transportasi",
      keywords: ["bensin", "parkir", "ojek", "grab", "gojek", "maxim", "bbm", "pertalite", "pertamax", "tol", "krl", "mrt", "transjakarta", "servis"],
    },
    {
      type: "expense",
      category: "Belanja",
      keywords: ["belanja", "supermarket", "minimarket", "indomaret", "alfamart", "pasar"],
    },
    {
      type: "expense",
      category: "Tagihan",
      keywords: ["listrik", "pln", "air", "pdam", "wifi", "pulsa", "kuota", "internet", "tagihan"],
    },
    {
      type: "expense",
      category: "Hiburan",
      keywords: ["nonton", "film", "game", "steam", "netflix", "spotify", "bioskop"],
    },
    {
      type: "expense",
      category: "Kesehatan",
      keywords: ["obat", "dokter", "apotek", "klinik", "rs"],
    },
    {
      type: "expense",
      category: "Pendidikan",
      keywords: ["buku", "kursus", "kuliah", "sekolah", "spp"],
    },
  ];

  const lowerDesc = desc.toLowerCase();
  let type: ParseResult["type"] = "expense";
  let category: string | undefined;

  for (const hint of categoryHints) {
    if (hint.keywords.some((kw) => lowerDesc.includes(kw))) {
      type = hint.type;
      category = hint.category;
      break;
    }
  }

  return { amount, type, description: desc, category };
}
